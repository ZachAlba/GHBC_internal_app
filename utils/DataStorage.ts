import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Adds a new check-in to AsyncStorage
 */
export const addCheckIn = async (
  member: Member, 
  guests: Array<{ name: string; notes?: string }>
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if member is already checked in today
    const todaysCheckIns = await getTodaysCheckins();
    if (todaysCheckIns.some(checkIn => checkIn.profile_id === member.profile_id)) {
      return { 
        success: false, 
        message: `${member.name || 'Member'} is already checked in today.` 
      };
    }

    // Maximum 5 guests per member per day
    if (guests.length > 5) {
      return {
        success: false,
        message: `Cannot add ${guests.length} guests. Maximum 5 guests allowed per day.`
      };
    }
    
    // Validate each guest against the "3 visits per summer" rule
    for (const guest of guests) {
      if (guest.name.trim() === '') continue;
      
      const visitCount = await getGuestVisitCount(guest.name);
      if (visitCount >= 3) {
        return {
          success: false,
          message: `${guest.name} has already visited 3 times this summer.`
        };
      }
    }
    
    // Create the check-in record
    const now = new Date();
    const checkin: CheckIn = {
      profile_id: member.profile_id,
      check_in_date: now.toISOString().split('T')[0],
      check_in_time: now.toTimeString().split(' ')[0],
      guests
    };
    
    // Add the new check-in
    const checkIns = [...todaysCheckIns, checkin];
    await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify(checkIns));
    
    const guestText = guests.length > 0
      ? ` with ${guests.length} guest${guests.length > 1 ? 's' : ''}`
      : '';
      
    return {
      success: true,
      message: `${member.name || 'Member'} has been checked in${guestText}!`
    };
  } catch (error) {
    console.error('Error adding check-in:', error);
    return { success: false, message: 'Failed to save check-in data' };
  }
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