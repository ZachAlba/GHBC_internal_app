import { Alert } from 'react-native';
import { getAllMembers } from './MemberStorageService';
import { getTodaysCheckins } from './CheckInStorageService';

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
 * Gets all previously checked-in guests for a specific member
 * from historical guest visits and today's check-ins
 */
export const getPreviousGuests = async (profileId: number): Promise<string[]> => {
  try {
    // Get member to access historical guest visits
    const members = await getAllMembers();
    const member = members.find(m => m.profile_id === profileId);
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
 * Validates a guest against the 3-visit limit
 * Flags guests who exceed the limit but doesn't reject them
 * Returns true if guest exceeds limit
 */
export const validateGuestVisitLimit = async (
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
 * Helper to process guests, validate them, and create alerts if needed
 * Returns processed guests and any alerts to display
 */
export const processGuests = async (
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