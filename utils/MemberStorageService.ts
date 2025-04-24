import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, MemberData, Member } from '../types/types';

// Storage keys
export const MEMBER_DATA_KEY = '@member_data';
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
 * Gets the name of a member by profile ID
 */
export const getMemberName = async (profileId: number): Promise<string> => {
  const member = await getMemberById(profileId);
  return member?.name || 'Member';
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