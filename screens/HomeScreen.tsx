import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ApiResponse, UploadData } from '../types/types';
import * as DataStorage from '../utils';
import styles from '../styles/HomeStyles';
import {Upload, Download} from '../utils/Api'; 

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;


export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(false);
  const [isDataDownloadedToday, setIsDataDownloadedToday] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastDownloadDate, setLastDownloadDate] = useState<string | null>(null);

  // Check if we have stored data when app launches
  useEffect(() => {
    checkLocalData();

    // Set up network connectivity listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check if we have member data stored locally
  const checkLocalData = async () => {
    try {
      const memberData = await DataStorage.getMemberData();
      const lastDownload = await AsyncStorage.getItem(DataStorage.LAST_DOWNLOAD_DATE_KEY);

      setHasDownloadedData(memberData !== null);

      // Check if data was downloaded today
      const downloadedToday = await DataStorage.wasDataDownloadedToday();
      setIsDataDownloadedToday(downloadedToday);

      if (lastDownload) {
        const date = new Date(lastDownload);
        setLastDownloadDate(date.toLocaleDateString());
      }
    } catch (error) {
      console.error('Error checking local data:', error);
    }
  };

  // Download data from the API
  const handleDownloadData = async () => {
    if (!isConnected) {
      Alert.alert('No Connection', 'You need internet connection to download data');
      return;
    }

    setIsLoading(true);

    try {
      const apiResponse = await Download();
  
      if (apiResponse.status === 200) {
        await DataStorage.storeApiData(apiResponse);
  
        const today = new Date();
        await AsyncStorage.setItem(DataStorage.LAST_DOWNLOAD_DATE_KEY, today.toISOString());
        setLastDownloadDate(today.toLocaleDateString());
  
        await AsyncStorage.setItem(DataStorage.TODAYS_CHECKINS_KEY, JSON.stringify([]));
  
        setHasDownloadedData(true);
        setIsDataDownloadedToday(true);
  
        Alert.alert('Success', `Downloaded data for ${apiResponse.data.members.length} members!`);
      } else {
        throw new Error(apiResponse.message || 'Failed to download data');
      }
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to download data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload check-in data to the API
  const handleUploadData = async () => {
    if (!hasDownloadedData) {
      Alert.alert('No Data', 'Please download data first before uploading');
      return;
    }
  
    if (!isConnected) {
      Alert.alert('No Connection', 'You need internet connection to upload data');
      return;
    }
  
    setIsLoading(true);
  
    try {
      const uploadData = await DataStorage.prepareUploadData('gate_tablet_1'); 
      const result = await Upload(uploadData); 
  
      if (result.status === 200) {
        await DataStorage.clearTodaysCheckins();
        await DataStorage.clearTodaysAlerts();
  
        const stats = result.data.checkins;
        Alert.alert('Success',
          `Data uploaded successfully!\n` +
          `Check-ins: ${stats.total}\n` +
          `Successful: ${stats.successful}\n` +
          `Failed: ${stats.failed}\n` +
          `Duplicates: ${stats.duplicates || 0}`
        );
      } else {
        throw new Error(result.message || 'Failed to upload data');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to upload data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleCheckInScreen = () => {
    if (!hasDownloadedData) {
      Alert.alert(
        'No Data Available',
        'Please download the latest member data first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isDataDownloadedToday) {
      Alert.alert(
        'Outdated Data',
        'Please download today\'s member data before checking in members.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to CheckInScreen
    navigation.navigate('CheckInScreen');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Beach Club Gate App</Text>

      <View style={styles.statusContainer}>
        <Text style={[
          styles.statusText,
          hasDownloadedData ? (isDataDownloadedToday ? styles.statusActive : styles.statusInactive) : styles.statusInactive
        ]}>
          {hasDownloadedData
            ? (isDataDownloadedToday
              ? `Member data ready for check-ins`
              : `Member data outdated - please download today's data`)
            : 'Please download member data first'}
        </Text>

        {lastDownloadDate && (
          <Text style={[
            styles.lastDownloadText,
            !isDataDownloadedToday && styles.warningText
          ]}>
            Last downloaded: {lastDownloadDate}
            {!isDataDownloadedToday && ' (outdated)'}
          </Text>
        )}

        {!isConnected && (
          <Text style={styles.offlineText}>
            Offline Mode - Check-in will work, but you can't download or upload data
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.blueButton,
            !isConnected && styles.disabledButton
          ]}
          onPress={handleDownloadData}
          disabled={isLoading || !isConnected}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Download Today's Data</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.yellowButton,
            (!hasDownloadedData || !isDataDownloadedToday) && styles.disabledButton
          ]}
          onPress={handleCheckInScreen}
          disabled={!hasDownloadedData || !isDataDownloadedToday || isLoading}
        >
          <Text style={styles.buttonText}>Check In Members</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.orangeButton,
            (!hasDownloadedData || !isConnected) && styles.disabledButton
          ]}
          onPress={handleUploadData}
          disabled={!hasDownloadedData || isLoading || !isConnected}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Upload Today's Data</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}