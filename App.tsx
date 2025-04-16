import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { API_KEY } from 'react-native-dotenv';

// API configuration
const API_BASE_URL = 'https://greenhillbeachclub.net/accounts/api';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(false);
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
      const memberData = await AsyncStorage.getItem('@member_data');
      const lastDownload = await AsyncStorage.getItem('@last_download_date');
      
      setHasDownloadedData(memberData !== null);
      
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
      // Make API request to download member data
      const response = await fetch(`${API_BASE_URL}/download.php`, {
        method: 'GET',
        headers: {
          'X-Api-Key': API_KEY,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 200) {
        // The API returns data in a specific format as seen in member_data_2025-04-10.json
        // Structure: { status, message, data: { metadata, members }, api_version, timestamp }
        
        // Verify the expected structure is present
        if (!data.data || !data.data.members) {
          throw new Error('Invalid data format received from server');
        }
        
        // Store the member data locally
        await AsyncStorage.setItem('@member_data', JSON.stringify(data.data));
        
        // Store today's date for reference
        const today = new Date();
        await AsyncStorage.setItem('@last_download_date', today.toISOString());
        setLastDownloadDate(today.toLocaleDateString());
        
        // Initialize empty check-ins for today
        await AsyncStorage.setItem('@todays_checkins', JSON.stringify([]));
        
        setHasDownloadedData(true);
        Alert.alert('Success', `Downloaded data for ${data.data.members.length} members!`);
      } else {
        throw new Error(data.message || 'Failed to download data');
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
      // Get today's check-ins from storage
      const checkInsString = await AsyncStorage.getItem('@todays_checkins');
      const checkIns = checkInsString ? JSON.parse(checkInsString) : [];
      
      if (checkIns.length === 0) {
        Alert.alert('No Check-ins', 'There are no check-ins to upload');
        setIsLoading(false);
        return;
      }
      
      // Format matches the expected structure in upload.php
      const uploadData = {
        checkins: checkIns,
        device_id: 'gate_tablet_1', // Identify which device is uploading
        season: new Date().getFullYear().toString() // Current season as a string
      };
      
      // Make API request to upload data
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
      
      if (result.status === 200) {
        // The API returns stats on processing
        // Structure expected: { status, message, data: { successful, failed, duplicates, total }, api_version, timestamp }
        
        // Successfully uploaded - clear today's check-ins
        await AsyncStorage.setItem('@todays_checkins', JSON.stringify([]));
        
        const stats = result.data;
        Alert.alert('Success', 
          `Check-in data uploaded successfully!\n` +
          `Total: ${stats.total}\n` +
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
    
    // This is where we would navigate to the check-in screen
    Alert.alert('Info', 'This would open the check-in screen');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Beach Club Gate App</Text>
      
      <View style={styles.statusContainer}>
        <Text style={[
          styles.statusText, 
          hasDownloadedData ? styles.statusActive : styles.statusInactive
        ]}>
          {hasDownloadedData 
            ? `Member data ready for check-ins` 
            : 'Please download member data first'}
        </Text>
        
        {lastDownloadDate && (
          <Text style={styles.lastDownloadText}>
            Last downloaded: {lastDownloadDate}
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
            !hasDownloadedData && styles.disabledButton
          ]} 
          onPress={handleCheckInScreen}
          disabled={!hasDownloadedData || isLoading}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f2ff', // Light blue background for beach theme
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0066cc', // Deeper blue for text
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    marginBottom: 30,
    padding: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: 250,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 5,
  },
  statusActive: {
    color: '#00a86b', // Green for active status
  },
  statusInactive: {
    color: '#cc5500', // Orange for inactive status
  },
  lastDownloadText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  offlineText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  blueButton: {
    backgroundColor: '#4FB8CE', // Ocean blue
  },
  yellowButton: {
    backgroundColor: '#FFB347', // Sandy orange
  },
  orangeButton: {
    backgroundColor: '#5FAD56', // Beach grass green
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});