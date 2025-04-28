import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckIn, Member, UploadData, AlertUpload } from "../types/types";
import { getMemberName } from "./MemberStorageService";
import {
  validateGuestCount,
  processGuests,
  showGuestLimitAlert,
} from "./GuestValidationService";
import { getCurrentSeason } from "./Utils";
import { getTodaysAlerts, clearTodaysAlerts } from "./AlertStorageService";

// Storage key
export const TODAYS_CHECKINS_KEY = "@todays_checkins";

/**
 * Gets today's check-ins from AsyncStorage
 */
export const getTodaysCheckins = async (): Promise<CheckIn[]> => {
  try {
    const checkInsString = await AsyncStorage.getItem(TODAYS_CHECKINS_KEY);
    if (!checkInsString) return [];

    return JSON.parse(checkInsString) as CheckIn[];
  } catch (error) {
    console.error("Error retrieving today's check-ins:", error);
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
    console.error("Error initializing check-ins:", error);
    throw new Error("Failed to initialize check-in data");
  }
};

/**
 * Prepares check-in data for uploading to the server
 */
export const prepareUploadData = async (
  deviceId: string
): Promise<UploadData> => {
  const checkins = await getTodaysCheckins();
  const alerts = await getTodaysAlerts();
  const season = getCurrentSeason();

  return {
    checkins,
    alerts,
    device_id: deviceId,
    season,
  };
};

/**
 * Clears today's check-ins after successful upload
 */
export const clearTodaysCheckins = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error("Error clearing today's check-ins:", error);
    throw new Error("Failed to clear check-in data");
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
    const checkIns = await getTodaysCheckins(); // <-- fetch today's check-ins first
    const todaysCheckIns = checkIns; // reuse for clarity

    // Find existing check-in if any
    const existingCheckInIndex = checkIns.findIndex(checkIn => checkIn.profile_id === profileId);
    const existingCheckIn = existingCheckInIndex !== -1 ? checkIns[existingCheckInIndex] : null;

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

    const currentGuestCount = existingCheckIn ? existingCheckIn.guests.length : 0;
    const validGuests = guests.filter(g => g.name.trim() !== '');
    const guestCountValidation = validateGuestCount(currentGuestCount, validGuests.length);

    if (!guestCountValidation.valid) {
      return {
        success: false,
        message: guestCountValidation.message || 'Too many guests'
      };
    }

    const existingGuestNames = existingCheckIn
      ? existingCheckIn.guests.map(g => g.name.toLowerCase())
      : [];

    const { processedGuests, guestsOverLimit } = await processGuests(
      guests,
      profileId,
      todaysCheckIns,
      existingGuestNames
    );

    if (!isAddingToExisting) {
      const now = new Date();
      const newCheckIn: CheckIn = {
        profile_id: profileId,
        check_in_date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        guests: processedGuests
      };

      checkIns.push(newCheckIn);
      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify(checkIns));

      showGuestLimitAlert(guestsOverLimit);

      const guestText = processedGuests.length > 0
        ? ` with ${processedGuests.length} guest${processedGuests.length > 1 ? 's' : ''}`
        : '';

      return {
        success: true,
        message: `${memberName} has been checked in${guestText}!`
      };
    } else {
      checkIns[existingCheckInIndex].guests = [
        ...checkIns[existingCheckInIndex].guests,
        ...processedGuests
      ];

      await AsyncStorage.setItem(TODAYS_CHECKINS_KEY, JSON.stringify(checkIns));

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
  return handleGuestCheckIn(
    member.profile_id,
    member.name || "Member",
    guests,
    false
  );
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
