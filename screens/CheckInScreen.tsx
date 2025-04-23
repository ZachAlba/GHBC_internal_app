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
  Platform,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Member, CheckIn, RootStackParamList } from '../types/types';

type CheckInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckInScreen'>;

const CheckInScreen = () => {
  const navigation = useNavigation<CheckInScreenNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysCheckins, setTodaysCheckins] = useState<number[]>([]);

  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [guestName, setGuestName] = useState('');

  // ↓ NEW: action modal state ↓
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionMember, setActionMember] = useState<Member | null>(null);

  useEffect(() => {
    loadMemberData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = members.filter(member => {
      const nameMatch = member.name?.toLowerCase().includes(query);
      const phoneMatch = member.phone_primary?.toLowerCase().includes(query);
      const vehicleMatch = member.vehicles?.some(v => v.license_plate.toLowerCase().includes(query));
      const additionalMemberMatch = member.additional_members?.some(m => m.name.toLowerCase().includes(query));
      return nameMatch || phoneMatch || vehicleMatch || additionalMemberMatch;
    });
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  const loadMemberData = async () => {
    setIsLoading(true);
    try {
      const memberDataString = await AsyncStorage.getItem('@member_data');
      if (!memberDataString) throw new Error('No member data found');
      const memberData = JSON.parse(memberDataString);
      setMembers(memberData.members || []);
      const checkInsString = await AsyncStorage.getItem('@todays_checkins');
      const checkIns = checkInsString ? JSON.parse(checkInsString) : [];
      setTodaysCheckins(checkIns.map((c: CheckIn) => c.profile_id));
    } catch (error) {
      console.error('Error loading member data:', error);
      Alert.alert('Error', 'Failed to load member data. Please go back and download data again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ↓ UPDATED: open action modal instead of immediate Alert ↓
  const handleCheckIn = (member: Member) => {
    if (todaysCheckins.includes(member.profile_id)) {
      Alert.alert('Already Checked In', `${member.name} is already checked in today.`);
      return;
    }
    setActionMember(member);
    setActionModalVisible(true);
  };

  const promptForGuests = (member: Member) => {
    setSelectedMember(member);
    setGuestName('');
    setGuestModalVisible(true);
  };

  const handleGuestSubmission = (guests: Array<{ name: string; notes?: string }>) => {
    if (selectedMember) completeCheckIn(selectedMember, guests);
    setGuestModalVisible(false);
    setSelectedMember(null);
  };

  const completeCheckIn = async (member: Member, guests: Array<{ name: string; notes?: string }>) => {
    try {
      const now = new Date();
      const checkin: CheckIn = {
        profile_id: member.profile_id,
        check_in_date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        guests
      };

      const checkInsString = await AsyncStorage.getItem('@todays_checkins');
      const checkIns = checkInsString ? JSON.parse(checkInsString) : [];
      checkIns.push(checkin);
      await AsyncStorage.setItem('@todays_checkins', JSON.stringify(checkIns));
      setTodaysCheckins([...todaysCheckins, member.profile_id]);

      const guestText = guests.length > 0
        ? ` with ${guests.length} guest${guests.length > 1 ? 's' : ''}`
        : '';
      Alert.alert('Check-in Successful', `${member.name} has been checked in${guestText}!`, [{ text: 'OK' }]);
      setSearchQuery('');
    } catch (error) {
      console.error('Complete check-in error:', error);
      Alert.alert('Error', 'Failed to save check-in data');
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isCheckedIn = todaysCheckins.includes(item.profile_id);

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isCheckedIn && styles.checkedInMember
        ]}
        onPress={() => {
          setActionMember(item);
          setActionModalVisible(true);
        }}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name || 'No Name'}</Text>

          <View style={styles.memberDetails}>
            <Text style={styles.membershipType}>
              {item.membership_type
                ? item.membership_type.charAt(0).toUpperCase() + item.membership_type.slice(1)
                : 'Unknown'}
            </Text>

            {item.phone_primary && (
              <Text style={styles.phoneNumber}>{item.phone_primary}</Text>
            )}
          </View>

          {item.additional_members.length > 0 && (
            <Text style={styles.additionalMembers}>
              Additional members: {item.additional_members.map(m => m.name).join(', ')}
            </Text>
          )}

          {item.vehicles.length > 0 && (
            <Text style={styles.vehicles}>
              Vehicles: {item.vehicles.map(v => v.license_plate).join(', ')}
            </Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          {isCheckedIn ? (
            <View style={styles.checkedInBadge}>
              <Text style={styles.checkedInText}>Checked In</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={() => {
                setActionMember(item);
                setActionModalVisible(true);
              }}
            >
              <Text style={styles.checkInButtonText}>Check In</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
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
                keyExtractor={item => item.profile_id.toString()}
                contentContainerStyle={styles.memberList}
              />
            )}
          </>
        )}

        {/* Action Modal */}
        <Modal
          visible={actionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{actionMember?.name}</Text>
              <Text style={{ marginBottom: 20 }}>Select an action:</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={() => {
                    if (actionMember) completeCheckIn(actionMember, []);
                    setActionModalVisible(false);
                  }}
                  disabled={actionMember ? todaysCheckins.includes(actionMember.profile_id) : true}
                >
                  <Text style={styles.buttonText}>Check In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    if (actionMember) promptForGuests(actionMember);
                    setActionModalVisible(false);
                  }}
                >
                  <Text style={styles.buttonText}>Add Guests</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Guest Modal */}
        <Modal
          visible={guestModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setGuestModalVisible(false);
            if (selectedMember) completeCheckIn(selectedMember, []);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                Add Guests for {selectedMember?.name || "Member"}
              </Text>

              <TextInput
                style={styles.guestInput}
                placeholder="Guest name"
                value={guestName}
                onChangeText={setGuestName}
                autoFocus={true}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setGuestModalVisible(false);
                    setGuestName('');
                    if (selectedMember) completeCheckIn(selectedMember, []);
                  }}
                >
                  <Text style={styles.buttonText}>No Guests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={() => {
                    if (guestName.trim() !== '') {
                      handleGuestSubmission([{ name: guestName, notes: 'Added via check-in' }]);
                      setGuestName('');
                    } else {
                      setGuestModalVisible(false);
                      if (selectedMember) completeCheckIn(selectedMember, []);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Add Guest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0066cc',
  },
  guestInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  submitButton: {
    backgroundColor: '#5FAD56',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CheckInScreen;