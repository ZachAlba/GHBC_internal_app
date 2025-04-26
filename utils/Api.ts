import { UploadData } from '../types/types';

const API_BASE_URL = 'https://greenhillbeachclub.net/accounts/api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

/**
 * Upload check-in and alert data to the server
 */
export const upload = async (uploadData: UploadData): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/upload.php`, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload API error:', error);
    throw error; // Rethrow so screens can handle it
  }
};