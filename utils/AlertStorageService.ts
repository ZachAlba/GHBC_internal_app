import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertUpload } from '../types/types';
import { getCurrentSeason } from './Utils';

export const TODAYS_ALERTS_KEY = '@todays_alerts';
// Get today's alerts
export const getTodaysAlerts = async (): Promise<AlertUpload[]> => {
    try {
      const alertsString = await AsyncStorage.getItem(TODAYS_ALERTS_KEY);
      return alertsString ? JSON.parse(alertsString) : [];
    } catch (error) {
      console.error('Error retrieving today\'s alerts:', error);
      return [];
    }
  };
  
  // Core function to create a new alert
  export const createAlert = async (params: {
    profile_id: number;
    guest_name?: string;
    visit_date?: string;
    season?: string;
    type: string;
    alert_message: string;
  }): Promise<void> => {
    try {
      const existingAlerts = await getTodaysAlerts();
  
      const now = new Date();
      const visitDate = params.visit_date || now.toISOString().split('T')[0];
      const season = getCurrentSeason();
  
      const newAlert: AlertUpload = {
        profile_id: params.profile_id,
        guest_name: params.guest_name || '',
        visit_date: visitDate,
        season: season,
        type: params.type,
        alert_message: params.alert_message,
      };
  
      existingAlerts.push(newAlert);
  
      await AsyncStorage.setItem(TODAYS_ALERTS_KEY, JSON.stringify(existingAlerts));
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  };
  
  // Clear today's alerts
  export const clearTodaysAlerts = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(TODAYS_ALERTS_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing today\'s alerts:', error);
      throw new Error('Failed to clear alerts');
    }
  };