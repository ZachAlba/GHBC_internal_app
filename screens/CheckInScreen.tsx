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
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Member, CheckIn, RootStackParamList } from '../types/types';
import * as DataStorage from '../utils/DataStorage';

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
  const [guestNames, setGuestNames] = useState<string[]>(['', '', '', '', '']);
  const [previousGuests, setPreviousGuests] = useState<string[]>([]);

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
      // Get all members using our storage utility
      const allMembers = await DataStorage.getAllMembers();
      setMembers(allMembers);
      
      // Get today's check-ins
      const checkIns = await DataStorage.getTodaysCheckins();
      setTodaysCheckins(checkIns.map(c => c.profile_id));
    } catch (error) {
      console.error('Error loading member data:', error);
      Alert.alert('Error', 'Failed to load member data. Please go back and download data again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = (member: Member) => {
    if (todaysCheckins.includes(member.profile_id)) {
      Alert.alert('Already Checked In', `${member.name} is already checked in today.`);
      return;
    }
    setActionMember(member);
    setActionModalVisible(true);
  };

  const promptForGuests = async (member: Member) => {
    setSelectedMember(member);
    setGuestNames(['', '', '', '', '']);
    
    // Load previous guests for this member
    try {
      const previousGuestsList = await DataStorage.getPreviousGuests(member.profile_id);
      setPreviousGuests(previousGuestsList);
    } catch (error) {
      console.error('Error loading previous guests:', error);
      setPreviousGuests([]);
    }
    
    setGuestModalVisible(true);
  };

  const handleGuestSubmission = async () => {
    if (selectedMember) {
      const validGuests = guestNames
        .filter(name => name.trim() !== '')
        .map(name => ({ name, notes: 'Added via check-in' }));
      
      completeCheckIn(selectedMember, validGuests);
    }
    setGuestModalVisible(false);
    setSelectedMember(null);
  };

  const selectPreviousGuest = (guestName: string, index: number) => {
    const newGuestNames = [...guestNames];
    newGuestNames[index] = guestName;
    setGuestNames(newGuestNames);
  };

  const completeCheckIn = async (member: Member, guests: Array<{ name: string; notes?: string }>) => {
    try {
      const result = await DataStorage.addCheckIn(member, guests);
      
      if (result.success) {
        Alert.alert('Check-in Successful', result.message, [{ text: 'OK' }]);
        // Update the local todaysCheckins state to include this member
        setTodaysCheckins(prev => [...prev, member.profile_id]);
        setSearchQuery('');
      } else {
        Alert.alert('Check-in Failed', result.message, [{ text: 'OK' }]);
      }
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
              onPress={() => handleCheckIn(item)}
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
                  style={[
                    styles.modalButton, 
                    styles.submitButton,
                    (actionMember && todaysCheckins.includes(actionMember.profile_id)) && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (actionMember) completeCheckIn(actionMember, []);
                    setActionModalVisible(false);
                  }}
                  disabled={actionMember ? todaysCheckins.includes(actionMember.profile_id) : true}
                >
                  <Text style={styles.buttonText}>Check In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton]}
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
              
              {previousGuests.length > 0 && (
                <View style={styles.previousGuestsContainer}>
                  <Text style={styles.previousGuestsTitle}>Previous Guests:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previousGuestsScroll}>
                    {previousGuests.map((guestName, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.previousGuestTag}
                        onPress={() => {
                          // Find first empty or select input field
                          const emptyIndex = guestNames.findIndex(name => name === '');
                          const targetIndex = emptyIndex >= 0 ? emptyIndex : 0;
                          selectPreviousGuest(guestName, targetIndex);
                        }}
                      >
                        <Text style={styles.previousGuestTagText}>{guestName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              <ScrollView style={styles.guestListContainer}>
                {guestNames.map((guestName, index) => (
                  <TextInput
                    key={index}
                    style={styles.guestInput}
                    placeholder={`Guest ${index + 1} name`}
                    value={guestName}
                    onChangeText={(text) => {
                      const newGuestNames = [...guestNames];
                      newGuestNames[index] = text;
                      setGuestNames(newGuestNames);
                    }}
                    autoFocus={index === 0}
                  />
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setGuestModalVisible(false);
                    setGuestNames(['', '', '', '', '']);
                    if (selectedMember) completeCheckIn(selectedMember, []);
                  }}
                >
                  <Text style={styles.buttonText}>No Guests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={() => handleGuestSubmission()}
                >
                  <Text style={styles.buttonText}>Add Guests</Text>
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
  guestListContainer: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 15,
  },
  guestInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10,
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
  secondaryButton: {
    backgroundColor: '#FFB347',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  previousGuestsContainer: {
    width: '100%',
    marginBottom: 15,
  },
  previousGuestsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  previousGuestsScroll: {
    maxHeight: 40,
  },
  previousGuestTag: {
    backgroundColor: '#E8F4F8',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4FB8CE',
  },
  previousGuestTagText: {
    color: '#0066cc',
    fontSize: 12,
  }
});

export default CheckInScreen;