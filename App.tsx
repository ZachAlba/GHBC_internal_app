import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import CheckInScreen from './screens/CheckInScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen">
        <Stack.Screen 
          name="HomeScreen" 
          component={HomeScreen} 
          options={{ title: 'Beach Club Gate App' }} 
        />
        <Stack.Screen 
          name="CheckInScreen" 
          component={CheckInScreen} 
          options={{ title: 'Check In Members' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}