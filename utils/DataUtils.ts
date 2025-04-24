import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { ApiResponse, MemberData, Member, CheckIn, GuestVisit, UploadData } from '../types/types';

// Storage keys
export const MEMBER_DATA_KEY = '@member_data';
export const TODAYS_CHECKINS_KEY = '@todays_checkins';
export const LAST_DOWNLOAD_DATE_KEY = '@last_download_date';

/**
 * Stores the API response data in AsyncStorage, maintaining the original structure
 */
export const storeApiData = async (apiResponse: ApiResponse): Promise<void> => {
  try {
    // Store the complete member data as received from API
    await AsyncStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(apiResponse.data));
    
    // Store today's date for reference
    const today = new Date();
    await AsyncStorage.setItem(LAST_DOWNLOAD_DATE_KEY, today.toISOString());
    
    // Initialize empty check-ins for today if not already present
    const checkInsString = await AsyncStorage.getItem(TODAYS_CHECKINS_KEY);
    if (!checkInsString) {
      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify([]));
    }
    
    console.log('API data stored successfully');
  } catch (error) {
    console.error('Error storing API data:', error);
    throw new Error('Failed to store API data');
  }
};

/**
 * Retrieves the member data from AsyncStorage
 */
export const getMemberData = async (): Promise<MemberData | null> => {
  try {
    const data = await AsyncStorage.getItem(MEMBER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving member data:', error);
    throw new Error('Failed to retrieve member data');
  }
};

/**
 * Gets all members from storage
 */
export const getAllMembers = async (): Promise<Member[]> => {
  const memberData = await getMemberData();
  return memberData?.members || [];
};

/**
 * Gets a member by profile ID
 */
export const getMemberById = async (profileId: number): Promise<Member | null> => {
  const members = await getAllMembers();
  return members.find(member => member.profile_id === profileId) || null;
};

/**
 * Gets today's check-ins from AsyncStorage
 */
export const getTodaysCheckins = async (): Promise<CheckIn[]> => {
  try {
    const checkInsString = await AsyncStorage.getItem(TODAYS_CHECKINS_KEY);
    if (!checkInsString) return [];
    
    return JSON.parse(checkInsString) as CheckIn[];
  } catch (error) {
    console.error('Error retrieving today\'s check-ins:', error);
    return [];
  }
};

/**
 * Gets the name of a member by profile ID
 * Helper function for messages
 */
const getMemberName = async (profileId: number): Promise<string> => {
  const member = await getMemberById(profileId);
  return member?.name || 'Member';
};

/**
 * Gets all previously checked-in guests for a specific member
 * from historical guest visits and today's check-ins
 */
export const getPreviousGuests = async (profileId: number): Promise<string[]> => {
  try {
    // Get member to access historical guest visits
    const member = await getMemberById(profileId);
    if (!member) return [];
    
    // Get unique guest names from historical data
    const uniqueGuests = new Set<string>();
    
    // Add guests from historical visits
    if (member.guest_visits && member.guest_visits.length > 0) {
      member.guest_visits.forEach(visit => {
        if (visit.guest_name) {
          uniqueGuests.add(visit.guest_name);
        }
      });
    }
    
    // Also check today's check-ins for this member
    const todaysCheckins = await getTodaysCheckins();
    const memberCheckins = todaysCheckins.filter(checkIn => checkIn.profile_id === profileId);
    
    memberCheckins.forEach(checkIn => {
      checkIn.guests.forEach(guest => {
        if (guest.name) {
          uniqueGuests.add(guest.name);
        }
      });
    });
    
    return Array.from(uniqueGuests);
  } catch (error) {
    console.error('Error getting previous guests:', error);
    return [];
  }
};

/**
 * Gets the number of times a guest has visited in the current summer season
 * Combines data from historical guest visits and today's check-ins
 */
export const getGuestVisitCount = async (guestName: string): Promise<number> => {
  try {
    const members = await getAllMembers();
    const currentYear = new Date().getFullYear();
    let count = 0;
    
    // Count historical visits for this guest in the current year
    members.forEach(member => {
      if (member.guest_visits && member.guest_visits.length > 0) {
        member.guest_visits.forEach(visit => {
          const visitYear = new Date(visit.visit_date).getFullYear();
          if (
            visitYear === currentYear &&
            visit.guest_name.toLowerCase() === guestName.toLowerCase()
          ) {
            count++;
          }
        });
      }
    });
    
    // Also check today's check-ins for this guest
    const todaysCheckIns = await getTodaysCheckins();
    todaysCheckIns.forEach(checkIn => {
      checkIn.guests.forEach(guest => {
        if (guest.name.toLowerCase() === guestName.toLowerCase()) {
          count++;
        }
      });
    });
    
    return count;
  } catch (error) {
    console.error('Error getting guest visit count:', error);
    return 0;
  }
};

/**
 * Prepares check-in data for uploading to the server
 */
export const prepareUploadData = async (deviceId: string): Promise<UploadData> => {
  const checkins = await getTodaysCheckins();
  const season = new Date().getFullYear().toString();
  
  return {
    checkins,
    device_id: deviceId,
    season
  };
};

/**
 * Clears today's check-ins after successful upload
 */
export const clearTodaysCheckins = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing today\'s check-ins:', error);
    throw new Error('Failed to clear check-in data');
  }
};

/**
 * Checks if the member data was downloaded today
 */
export const wasDataDownloadedToday = async (): Promise<boolean> => {
  try {
    const lastDownload = await AsyncStorage.getItem(LAST_DOWNLOAD_DATE_KEY);
    if (!lastDownload) return false;
    
    const downloadDate = new Date(lastDownload);
    const today = new Date();
    
    // Compare year, month, and day
    return (
      downloadDate.getFullYear() === today.getFullYear() &&
      downloadDate.getMonth() === today.getMonth() &&
      downloadDate.getDate() === today.getDate()
    );
  } catch (error) {
    console.error('Error checking download date:', error);
    return false;
  }
};

/**
 * Validates a guest against the 3-visit limit
 * Instead of rejecting, flags guests who exceed the limit
 * Returns true if guest exceeds limit
 */
const validateGuestVisitLimit = async (
  guest: { name: string; notes?: string },
  existingGuestNames: string[] = []
): Promise<boolean> => {
  if (guest.name.trim() === '') return false;
  
  // Skip if already checked in today (avoid double counting)
  if (existingGuestNames.includes(guest.name.toLowerCase())) {
    return false;
  }
  
  const visitCount = await getGuestVisitCount(guest.name);
  if (visitCount >= 3) {
    // Flag this guest instead of preventing the check-in
    guest.notes = `${guest.notes || ''} ALERT: This is visit #${visitCount + 1} (exceeds 3-visit limit)`.trim();
    return true;
  }
  
  return false;
};

/**
 * Helper to validate guest count doesn't exceed maximum of 5
 */
const validateGuestCount = (
  currentCount: number, 
  newCount: number
): { valid: boolean; message?: string } => {
  if (currentCount + newCount > 5) {
    return {
      valid: false,
      message: `Cannot add ${newCount} more guests. Maximum 5 guests allowed per member per day. This member already has ${currentCount} guest(s).`
    };
  }
  return { valid: true };
};

/**
 * Helper to process guests, validate them, and create alerts if needed
 * Returns processed guests and any alerts to display
 */
const processGuests = async (
  guests: Array<{ name: string; notes?: string }>,
  existingGuestNames: string[] = []
): Promise<{
  processedGuests: Array<{ name: string; notes?: string }>;
  guestsOverLimit: Array<{ name: string; notes?: string }>;
}> => {
  const validGuests = guests.filter(guest => guest.name.trim() !== '');
  const guestsOverLimit: Array<{ name: string; notes?: string }> = [];
  
  // Validate each guest against the limit
  for (const guest of validGuests) {
    const isOverLimit = await validateGuestVisitLimit(guest, existingGuestNames);
    if (isOverLimit) {
      guestsOverLimit.push(guest);
    }
  }
  
  return {
    processedGuests: validGuests,
    guestsOverLimit
  };
};

/**
 * Display alert for guests exceeding visit limit
 */
const showGuestLimitAlert = (guestsOverLimit: Array<{ name: string; notes?: string }>) => {
  if (guestsOverLimit.length > 0) {
    const guestNames = guestsOverLimit.map(g => g.name).join(', ');
    Alert.alert(
      'Guest Visit Limit Exceeded',
      `The following guests have exceeded the 3-visit summer limit: ${guestNames}\n\nThis has been recorded and will be uploaded to the server.`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Core function to handle both initial check-ins and adding guests later
 */
const handleGuestCheckIn = async (
  profileId: number,
  memberName: string,
  guests: Array<{ name: string; notes?: string }>,
  isAddingToExisting: boolean = false
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get current check-ins
    const checkIns = await getTodaysCheckins();
    
    // Find existing check-in if any
    const existingCheckInIndex = checkIns.findIndex(checkIn => checkIn.profile_id === profileId);
    const existingCheckIn = existingCheckInIndex !== -1 ? checkIns[existingCheckInIndex] : null;
    
    // For new check-ins, verify member isn't already checked in
    if (!isAddingToExisting) {
      if (existingCheckIn) {
        return { 
          success: false, 
          message: `${memberName || 'Member'} is already checked in today.` 
        };
      }
    } 
    // For adding to existing, verify member is already checked in
    else if (!existingCheckIn) {
      return {
        success: false,
        message: 'Member is not checked in today'
      };
    }
    
    // Validate total guest count
    const currentGuestCount = existingCheckIn ? existingCheckIn.guests.length : 0;
    const validGuests = guests.filter(g => g.name.trim() !== '');
    const guestCountValidation = validateGuestCount(currentGuestCount, validGuests.length);
      
    if (!guestCountValidation.valid) {
      return {
        success: false,
        message: guestCountValidation.message || 'Too many guests'
      };
    }
    
    // Get existing guest names for validation
    const existingGuestNames = existingCheckIn 
      ? existingCheckIn.guests.map(g => g.name.toLowerCase()) 
      : [];
    
    // Process and validate guests
    const { processedGuests, guestsOverLimit } = await processGuests(guests, existingGuestNames);
    
    if (!isAddingToExisting) {
      // Create a new check-in record
      const now = new Date();
      const newCheckIn: CheckIn = {
        profile_id: profileId,
        check_in_date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        guests: processedGuests
      };
      
      // Save the new check-in
      checkIns.push(newCheckIn);
      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify(checkIns));
      
      // Show alert for guests over limit
      showGuestLimitAlert(guestsOverLimit);
      
      const guestText = processedGuests.length > 0
        ? ` with ${processedGuests.length} guest${processedGuests.length > 1 ? 's' : ''}`
        : '';
        
      return {
        success: true,
        message: `${memberName || 'Member'} has been checked in${guestText}!`
      };
    } else {
      // Add guests to existing check-in
      checkIns[existingCheckInIndex].guests = [...checkIns[existingCheckInIndex].guests, ...processedGuests];
      
      // Save updated check-ins
      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify(checkIns));
      
      // Show alert for guests over limit
      showGuestLimitAlert(guestsOverLimit);
      
      return {
        success: true,
        message: `Added ${processedGuests.length} guest(s) to ${memberName}'s check-in.`
      };
    }
  } catch (error) {
    console.error('Error processing check-in:', error);
    return {
      success: false,
      message: 'Failed to process check-in data.'
    };
  }
};

/**
 * Adds a new check-in to AsyncStorage
 */
export const addCheckIn = async (
  member: Member, 
  guests: Array<{ name: string; notes?: string }>
): Promise<{ success: boolean; message: string }> => {
  return handleGuestCheckIn(member.profile_id, member.name || 'Member', guests, false);
};

/**
 * Adds guests to an existing check-in
 */
export const addGuestsToExistingCheckIn = async (
  profileId: number,
  newGuests: Array<{ name: string; notes?: string }>
): Promise<{ success: boolean; message: string }> => {
  const memberName = await getMemberName(profileId);
  return handleGuestCheckIn(profileId, memberName, newGuests, true);
};