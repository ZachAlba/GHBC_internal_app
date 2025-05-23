import React, { useState, useEffect } from 'react';
import {
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
import * as DataStorage from '../utils';
import styles from '../styles/CheckInStyles';

type CheckInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckInScreen'>;

const CheckInScreen = () => {
  const navigation = useNavigation<CheckInScreenNavigationProp>();

  // I love state management
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysCheckins, setTodaysCheckins] = useState<CheckIn[]>([]);

  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [guestNames, setGuestNames] = useState<string[]>(['', '', '', '', '']);
  const [previousGuests, setPreviousGuests] = useState<string[]>([]);
  const [todaysGuestMap, setTodaysGuestMap] = useState<Map<number, Set<string>>>(new Map());

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionMember, setActionMember] = useState<Member | null>(null);

  const [manualAlertModalVisible, setManualAlertModalVisible] = useState(false);
  const [manualAlertGuestName, setManualAlertGuestName] = useState('');
  const [manualAlertMessage, setManualAlertMessage] = useState('');
  const [isSavingManualAlert, setIsSavingManualAlert] = useState(false);


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
      setTodaysCheckins(checkIns);

      // Create a map of today's guests for quick access
      const todaysGuestMap = new Map<number, Set<string>>();

      checkIns.forEach(checkIn => {
        const guestSet = new Set<string>();
        checkIn.guests.forEach(guest => {
          guestSet.add(guest.name.toLowerCase());
        });
        todaysGuestMap.set(checkIn.profile_id, guestSet);
      });

      setTodaysGuestMap(todaysGuestMap);

    } catch (error) {
      console.error('Error loading member data:', error);
      Alert.alert('Error', 'Failed to load member data. Please go back and download data again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberPress = (member: Member) => {
    setActionMember(member);
    setActionModalVisible(true);
  };

  const promptForGuests = async (member: Member) => {
    setSelectedMember(member);

    // Check if member is already checked in today
    const isAlreadyCheckedIn = todaysCheckins.some(checkIn => checkIn.profile_id === member.profile_id);

    if (isAlreadyCheckedIn) {
      try {
        // Get existing check-in to determine remaining guest slots
        const checkIns = await DataStorage.getTodaysCheckins();
        const existingCheckIn = checkIns.find(checkIn => checkIn.profile_id === member.profile_id);

        if (existingCheckIn) {
          const currentGuestCount = existingCheckIn.guests.length;
          const remainingSlots = Math.max(0, 5 - currentGuestCount);

          if (remainingSlots === 0) {
            Alert.alert(
              'Maximum Guests Reached',
              `${member.name || 'This member'} already has 5 guests checked in today.`,
              [{ text: 'OK' }]
            );
            setSelectedMember(null);
            return;
          }

          // Initialize only the remaining number of slots
          setGuestNames(Array(remainingSlots).fill(''));
        }
      } catch (error) {
        console.error('Error checking existing guests:', error);
        setGuestNames(['', '', '', '', '']);
      }
    } else {
      // For new check-ins, show all 5 slots
      setGuestNames(['', '', '', '', '']);
    }

    // Load previous guests for this member
    try {
      const todaysCheckIns = await DataStorage.getTodaysCheckins();
      const previousGuestsList = await DataStorage.getPreviousGuests(member.profile_id, todaysCheckIns);
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

      if (validGuests.length === 0) {
        setGuestModalVisible(false);
        setSelectedMember(null);
        return;
      }

      // Check if member is already checked in today
      const isAlreadyCheckedIn = todaysCheckins.some(checkIn => checkIn.profile_id === selectedMember.profile_id);

      if (isAlreadyCheckedIn) {
        // Use the utility function to add guests to existing check-in
        const result = await DataStorage.addGuestsToExistingCheckIn(selectedMember.profile_id, validGuests);
        if (result.success) {
          Alert.alert('Guests Added', result.message, [{ text: 'OK' }]);
          // Refresh the data after adding guests
          loadMemberData();
        } else {
          Alert.alert('Error', result.message, [{ text: 'OK' }]);
        }
      } else {
        // Normal check-in with guests
        completeCheckIn(selectedMember, validGuests);
      }
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
        const now = new Date();
        setTodaysCheckins(prev => [
          ...prev,
          {
            profile_id: member.profile_id,
            check_in_date: now.toISOString().split('T')[0],
            check_in_time: now.toTimeString().split(' ')[0],
            guests: guests || [],
          }
        ]);
      } else {
        Alert.alert('Check-in Failed', result.message, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Complete check-in error:', error);
      Alert.alert('Error', 'Failed to save check-in data');
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const isCheckedIn = todaysCheckins.some(checkIn => checkIn.profile_id === item.profile_id);


    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isCheckedIn && styles.checkedInMember
        ]}
        onPress={() => handleMemberPress(item)}
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
              onPress={() => completeCheckIn(item, [])}
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

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setManualAlertModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ Alert</Text>
            </TouchableOpacity>
          </View>
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
                    (actionMember && todaysCheckins.some(checkIn => checkIn.profile_id === actionMember.profile_id)) && styles.disabledButton

                  ]}
                  onPress={() => {
                    if (actionMember && !todaysCheckins.some(checkIn => checkIn.profile_id === actionMember.profile_id)) {
                      completeCheckIn(actionMember, []);
                    }
                    setActionModalVisible(false);
                  }}
                  disabled={actionMember ? todaysCheckins.some(checkIn => checkIn.profile_id === actionMember.profile_id) : true}
                >
                  <Text style={styles.buttonText}>Check In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton]}
                  onPress={() => {
                    if (actionMember) {
                      promptForGuests(actionMember);
                    }
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
            setSelectedMember(null);
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
                    {previousGuests.map((guestName, index) => {
                      const isAlreadyCheckedIn = selectedMember
                        ? todaysGuestMap.get(selectedMember.profile_id)?.has(guestName.toLowerCase())
                        : false;

                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.previousGuestTag,
                            isAlreadyCheckedIn && styles.alreadyCheckedInGuestTag 
                          ]}
                          onPress={() => {
                            if (!isAlreadyCheckedIn) { 
                              const emptyIndex = guestNames.findIndex(name => name === '');
                              const targetIndex = emptyIndex >= 0 ? emptyIndex : 0;
                              selectPreviousGuest(guestName, targetIndex);
                            }
                          }}
                          disabled={isAlreadyCheckedIn} 
                        >
                          <Text style={styles.previousGuestTagText}>
                            {guestName}
                            {isAlreadyCheckedIn && ' (Checked In)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
                    setSelectedMember(null);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
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
        {/* Manual Alert Modal */}
        <Modal
          visible={manualAlertModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setManualAlertModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Create Manual Alert</Text>

              <TextInput
                style={styles.input}
                placeholder="Member or Guest Name (optional)"
                value={manualAlertGuestName}
                onChangeText={setManualAlertGuestName}
              />

              <TextInput
                style={[styles.input, { height: 100 }]}
                placeholder="Alert Message (required)"
                value={manualAlertMessage}
                onChangeText={setManualAlertMessage}
                multiline
              />

              <View style={styles.modalButtons}>
                {/* TODO: Strange bug when attempting to create alert while typing into search bar */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setManualAlertGuestName('');
                    setManualAlertMessage('');
                    setManualAlertModalVisible(false);
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, isSavingManualAlert && { opacity: 0.6 }]}
                  onPress={async () => {
                    if (manualAlertMessage.trim() === '') {
                      Alert.alert('Missing Information', 'Please enter an alert message.');
                      return;
                    }

                    try {
                      setIsSavingManualAlert(true);

                      await DataStorage.createAlert({
                        profile_id: 0, // no known profile
                        guest_name: manualAlertGuestName.trim() || undefined,
                        type: 'ManualGateAlert',
                        alert_message: manualAlertMessage.trim()
                      });

                      Alert.alert('Alert Created', 'Manual alert recorded successfully.', [{ text: 'OK' }]);
                    } catch (error) {
                      console.error('Error creating manual alert:', error);
                      Alert.alert('Error', 'Failed to create alert.');
                    } finally {
                      setIsSavingManualAlert(false);
                      setManualAlertGuestName('');
                      setManualAlertMessage('');
                      setManualAlertModalVisible(false);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CheckInScreen;