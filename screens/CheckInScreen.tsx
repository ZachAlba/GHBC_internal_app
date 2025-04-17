import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the type for your navigation stack
type RootStackParamList = {
  HomeScreen: undefined;
  CheckInScreen: undefined;
};

type CheckInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckInScreen'>;

interface Member {
  user_id: number;
  profile_id: number;
  name: string;
  membership_type: string;
  phone_primary: string | null;
  vehicles: Array<{ id: number; license_plate: string }>;
  additional_members: Array<{ id: number; name: string }>;
}

interface CheckIn {
  profile_id: number;
  check_in_date: string;
  check_in_time: string;
  guests: Array<{ name: string; notes?: string }>;
  notes?: string;
}

const CheckInScreen = () => {
  // Use navigation hook instead of onGoBack prop
  const navigation = useNavigation<CheckInScreenNavigationProp>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysCheckins, setTodaysCheckins] = useState<number[]>([]);

  // Load member data on component mount
  useEffect(() => {
    loadMemberData();
  }, []);

  // Filter members when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(member => {
      // Search by name, phone, or vehicle
      const nameMatch = member.name?.toLowerCase().includes(query);
      const phoneMatch = member.phone_primary?.toLowerCase().includes(query);
      
      // Search in vehicles
      const vehicleMatch = member.vehicles?.some(vehicle => 
        vehicle.license_plate.toLowerCase().includes(query)
      );
      
      // Search in additional members
      const additionalMemberMatch = member.additional_members?.some(addMember =>
        addMember.name.toLowerCase().includes(query)
      );
      
      return nameMatch || phoneMatch || vehicleMatch || additionalMemberMatch;
    });
    
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  // Load member data from AsyncStorage
  const loadMemberData = async () => {
    setIsLoading(true);
    try {
      // Load member data
      const memberDataString = await AsyncStorage.getItem('@member_data');
      if (!memberDataString) {
        throw new Error('No member data found');
      }
      
      const memberData = JSON.parse(memberDataString);
      setMembers(memberData.members || []);
      
      // Load today's check-ins
      const checkInsString = await AsyncStorage.getItem('@todays_checkins');
      const checkIns = checkInsString ? JSON.parse(checkInsString) : [];
      
      // Extract profile IDs of members who checked in today
      const checkedInProfileIds = checkIns.map((checkin: CheckIn) => checkin.profile_id);
      setTodaysCheckins(checkedInProfileIds);
      
    } catch (error) {
      console.error('Error loading member data:', error);
      Alert.alert('Error', 'Failed to load member data. Please go back and download data again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle member check-in
  const handleCheckIn = async (member: Member) => {
    try {
      // Check if member is already checked in
      if (todaysCheckins.includes(member.profile_id)) {
        Alert.alert('Already Checked In', `${member.name} is already checked in today.`);
        return;
      }
      
      // Ask about guests
      Alert.alert(
        'Guest Check-in',
        `${member.name} - Do they have any guests today?`,
        [
          {
            text: 'No Guests',
            onPress: () => completeCheckIn(member, [])
          },
          {
            text: 'Add Guests',
            onPress: () => promptForGuests(member)
          }
        ]
      );
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to complete check-in');
    }
  };

  // Prompt for guest information
  const promptForGuests = (member: Member) => {
    // In a real app, you'd show a modal for guest info
    // For this example, we'll use Alert to simulate adding one guest
    Alert.alert(
      'Add Guest',
      'Guest name:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => completeCheckIn(member, [])
        },
        {
          text: 'Add Guest',
          onPress: (guestName) => {
            if (guestName) {
              completeCheckIn(member, [{ name: guestName, notes: 'Added via check-in' }]);
            } else {
              completeCheckIn(member, [{ name: 'Guest', notes: 'No name provided' }]);
            }
          }
        }
      ],
      { 
        cancelable: true,
      }
    );
  };

  // Complete the check-in process
  const completeCheckIn = async (member: Member, guests: Array<{ name: string, notes?: string }>) => {
    try {
      // Create check-in record
      const now = new Date();
      const checkin: CheckIn = {
        profile_id: member.profile_id,
        check_in_date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        guests: guests
      };
      
      // Get existing check-ins
      const checkInsString = await AsyncStorage.getItem('@todays_checkins');
      const checkIns = checkInsString ? JSON.parse(checkInsString) : [];
      
      // Add new check-in
      checkIns.push(checkin);
      
      // Save updated check-ins
      await AsyncStorage.setItem('@todays_checkins', JSON.stringify(checkIns));
      
      // Update state
      setTodaysCheckins([...todaysCheckins, member.profile_id]);
      
      // Show success message
      const guestText = guests.length > 0 
        ? ` with ${guests.length} guest${guests.length > 1 ? 's' : ''}` 
        : '';
        
      Alert.alert(
        'Check-in Successful',
        `${member.name} has been checked in${guestText}!`,
        [{ text: 'OK' }]
      );
      
      // Clear search
      setSearchQuery('');
    } catch (error) {
      console.error('Complete check-in error:', error);
      Alert.alert('Error', 'Failed to save check-in data');
    }
  };

  // Render a member item in the list
  const renderMemberItem = ({ item }: { item: Member }) => {
    const isCheckedIn = todaysCheckins.includes(item.profile_id);
    
    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isCheckedIn && styles.checkedInMember
        ]}
        onPress={() => handleCheckIn(item)}
        disabled={isCheckedIn}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name || 'No Name'}</Text>
          
          <View style={styles.memberDetails}>
            <Text style={styles.membershipType}>
              {item.membership_type ? item.membership_type.charAt(0).toUpperCase() + item.membership_type.slice(1) : 'Unknown'}
            </Text>
            
            {item.phone_primary && (
              <Text style={styles.phoneNumber}>{item.phone_primary}</Text>
            )}
          </View>
          
          {item.additional_members && item.additional_members.length > 0 && (
            <Text style={styles.additionalMembers}>
              Additional members: {item.additional_members.map(m => m.name).join(', ')}
            </Text>
          )}
          
          {item.vehicles && item.vehicles.length > 0 && (
            <Text style={styles.vehicles}>
              Vehicles: {item.vehicles.map(v => v.license_plate).join(', ')}
            </Text>
          )}
        </View>
        
        {/* Check-in status indicator */}
        <View style={styles.statusContainer}>
          {isCheckedIn ? (
            <View style={styles.checkedInBadge}>
              <Text style={styles.checkedInText}>Checked In</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.checkInButton}
              onPress={() => handleCheckIn(item)}
            >
              <Text style={styles.checkInButtonText}>Check In</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Member Check-In</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, or vehicle..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#4FB8CE" style={styles.loader} />
        ) : (
          <>
            {searchQuery.trim() === '' ? (
              <View style={styles.searchPrompt}>
                <Text style={styles.searchPromptText}>
                  Enter a name, phone number, or license plate to find members
                </Text>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No members found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                renderItem={renderMemberItem}
                keyExtractor={(item) => item.profile_id.toString()}
                contentContainerStyle={styles.memberList}
              />
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f2ff',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '500',
  },
  searchContainer: {
    margin: 16,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  clearButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  searchPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  searchPromptText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontSize: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberItem: {
    backgroundColor: 'white',
    marginVertical: 8,
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkedInMember: {
    backgroundColor: '#e6ffee', // Light green
    borderColor: '#5FAD56',
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  membershipType: {
    backgroundColor: '#4FB8CE',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    marginRight: 8,
    overflow: 'hidden',
  },
  phoneNumber: {
    color: '#666',
    fontSize: 14,
  },
  additionalMembers: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  vehicles: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkedInBadge: {
    backgroundColor: '#5FAD56',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkedInText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkInButton: {
    backgroundColor: '#FFB347',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CheckInScreen;