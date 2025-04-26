import { Alert } from 'react-native';
import { getAllMembers } from './MemberStorageService';
import { createAlert } from './AlertStorageService';
import { CheckIn } from '../types/types';
import { getCurrentSeason, getSeasonFromDate } from './Utils';

/**
 * Gets the number of times a guest has visited in the current season
 * Combines data from historical guest visits and today's check-ins
 */
export const getGuestVisitCount = async (
  guestName: string,
  todaysCheckIns: CheckIn[],
  profileId: number
): Promise<number> => {
  try {
    const members = await getAllMembers();
    const currentSeason = getCurrentSeason();
    let count = 0;
    
    const member = members.find(m => m.profile_id === profileId);
    if (!member) {
      console.warn(`Member with profile_id ${profileId} not found.`);
      return 0;
    }
    
    // Only check this member's guest_visits
    if (member.guest_visits && member.guest_visits.length > 0) {
      member.guest_visits.forEach(visit => {
        const visitSeason = getSeasonFromDate(visit.visit_date);
        if (
          visitSeason === currentSeason &&
          visit.guest_name.toLowerCase() === guestName.toLowerCase()
        ) {
          count++;
        }
      });
    }
    
    // Also check today's check-ins for this member only
    const memberCheckins = todaysCheckIns.filter(checkIn => checkIn.profile_id === profileId);
    memberCheckins.forEach(checkIn => {
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
 * Gets all previously checked-in guests for a specific member
 * from historical guest visits and today's check-ins
 */
export const getPreviousGuests = async (
  profileId: number,
  todaysCheckIns: CheckIn[]
): Promise<string[]> => {
  try {
    const members = await getAllMembers();
    const member = members.find(m => m.profile_id === profileId);
    if (!member) return [];
    
    const uniqueGuests = new Set<string>();
    
    if (member.guest_visits && member.guest_visits.length > 0) {
      member.guest_visits.forEach(visit => {
        if (visit.guest_name) {
          uniqueGuests.add(visit.guest_name);
        }
      });
    }
    
    const memberCheckins = todaysCheckIns.filter(checkIn => checkIn.profile_id === profileId);
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
 * Validates a guest against the 3-visit limit
 * Flags guests who exceed the limit but doesn't reject them
 * Returns true if guest exceeds limit
 */
export const validateGuestVisitLimit = async (
  guest: { name: string; notes?: string },
  profileId: number,
  todaysCheckIns: CheckIn[],
  existingGuestNames: string[] = []
): Promise<boolean> => {
  if (guest.name.trim() === '') return false;
  
  if (existingGuestNames.includes(guest.name.toLowerCase())) {
    return false;
  }
  
  const visitCount = await getGuestVisitCount(guest.name, todaysCheckIns, profileId);
  if (visitCount > 3) {
    await createAlert({
      profile_id: profileId,
      guest_name: guest.name,
      type: 'GuestLimit',
      alert_message: `This is visit #${visitCount + 1} (exceeds 3-visit limit)`
    });
    return true;
  }
  
  return false;
};

/**
 * Helper to validate guest count doesn't exceed maximum of 5
 */
export const validateGuestCount = (
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
 * Processes guests, validates them, and generates alerts if needed
 */
export const processGuests = async (
  guests: Array<{ name: string; notes?: string }>,
  profileId: number,
  todaysCheckIns: CheckIn[],
  existingGuestNames: string[] = []
): Promise<{
  processedGuests: Array<{ name: string; notes?: string }>;
  guestsOverLimit: Array<{ name: string; notes?: string }>;
}> => {
  const validGuests = guests.filter(guest => guest.name.trim() !== '');
  const guestsOverLimit: Array<{ name: string; notes?: string }> = [];

  for (const guest of validGuests) {
    const isOverLimit = await validateGuestVisitLimit(guest, profileId, todaysCheckIns, existingGuestNames);
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
 * Displays an alert for guests who exceeded the 3-visit limit
 */
export const showGuestLimitAlert = (guestsOverLimit: Array<{ name: string; notes?: string }>) => {
  if (guestsOverLimit.length > 0) {
    const guestNames = guestsOverLimit.map(g => g.name).join(', ');
    Alert.alert(
      'Guest Visit Limit Exceeded',
      `The following guests have exceeded the 3-visit summer limit: ${guestNames}\n\nThis has been recorded and will be uploaded to the server.`,
      [{ text: 'OK' }]
    );
  }
};
