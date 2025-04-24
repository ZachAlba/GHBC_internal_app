import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckIn, Member, UploadData } from '../types/types';
import { getMemberName } from './MemberStorageService';
import { 
  validateGuestCount, 
  processGuests, 
  showGuestLimitAlert 
} from './GuestValidationService';

// Storage key
export const TODAYS_CHECKINS_KEY = '@todays_checkins';

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
 * Initialize today's check-ins if not already present
 */
export const initializeTodaysCheckins = async (): Promise<void> => {
  try {
    const checkInsString = await AsyncStorage.getItem(TODAYS_CHECKINS_KEY);
    if (!checkInsString) {
      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing check-ins:', error);
    throw new Error('Failed to initialize check-in data');
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
    
    // Handle different scenarios based on whether this is a new check-in or adding guests
    if (!isAddingToExisting && existingCheckIn) {
      return { 
        success: false, 
        message: `${memberName} is already checked in today.` 
      };
    } else if (isAddingToExisting && !existingCheckIn) {
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
        message: `${memberName} has been checked in${guestText}!`
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