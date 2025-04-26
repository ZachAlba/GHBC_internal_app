import { UploadData, ApiResponse } from "../types/types";

const API_BASE_URL = "https://greenhillbeachclub.net/accounts/api";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

/**
 * Upload check-in and alert data to the server
 * @param uploadData - The data to upload, including check-ins and alerts
 * @returns Promise<any> - The API response from the upload
 * @throws Error if the API request fails or returns an error status
 */
export const Upload = async (uploadData: UploadData): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/upload.php`, {
      method: "POST",
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uploadData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Upload API error:", error);
    throw error; // Rethrow so screens can handle it
  }
};
/**
 * Download member data from the server
 * @returns Promise<ApiResponse> - The API response containing member data
 * @throws Error if the API request fails
 */

export const Download = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/download.php`, {
      method: "GET",
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const apiResponse = (await response.json()) as ApiResponse;
    return apiResponse;
  } catch (error) {
    console.error("Download API error:", error);
    throw error; // Pass error to screen to handle
  }
};
