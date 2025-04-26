// Vehicle interface
export interface Vehicle {
  id: number;
  license_plate: string;
}

// Additional member interface
export interface AdditionalMember {
  id: number;
  name: string;
}

// Historical guest visit interface (from API)
export interface GuestVisit {
  id: number;
  guest_name: string;
  visit_date: string;
  notes: string | null;
}

// Member interface matching API response structure
export interface Member {
  user_id: number;
  username: string;
  email: string;
  verified: number;
  profile_id: number;
  name: string | null;
  phone_primary: string | null;
  membership_type: 'single' | 'couple' | 'family' | string;
  visit_count: number;
  last_visit_date: string | null;
  vehicles: Vehicle[];
  additional_members: AdditionalMember[];
  guest_visits: GuestVisit[];
}

// For today's check-ins that will be stored locally and uploaded later
export interface CheckIn {
  profile_id: number;
  check_in_date: string;
  check_in_time: string;
  guests: Array<{ name: string; notes?: string }>;
  notes?: string;
}

// API response metadata
export interface ApiMetadata {
  timestamp: string;
  date: string;
  member_count: number;
  total_guest_visits: number;
}

// Member data structure
export interface MemberData {
  metadata: ApiMetadata;
  members: Member[];
}

// Full API response structure - what we receive when downloading data
export interface ApiResponse {
  status: number;
  message: string;
  data: MemberData;
  api_version: string;
  timestamp: string;
}

// Structure for uploading check-ins to the server
export interface UploadData {
  checkins: CheckIn[];
  alerts: AlertUpload[];
  device_id: string;
  season: string;
}

// Alerts
export interface AlertUpload {
  profile_id: number;
  guest_name?: string;
  visit_date?: string;
  season?: string;
  type: string;
  alert_message: string;
}

// Navigation types for React Navigation
export type RootStackParamList = {
  HomeScreen: undefined;
  CheckInScreen: undefined;
};
