
export interface CheckIn {
  profile_id: number;
  check_in_date: string;
  check_in_time: string;
  guests: Array<{ name: string; notes?: string }>;
  notes?: string;
}


export interface Member {
  user_id: number;
  profile_id: number;
  name: string;
  membership_type: string;
  phone_primary: string | null;
  vehicles: Array<{ id: number; license_plate: string }>;
  additional_members: Array<{ id: number; name: string }>;
}

export type RootStackParamList = {
  HomeScreen: undefined;
  CheckInScreen: undefined;
};

