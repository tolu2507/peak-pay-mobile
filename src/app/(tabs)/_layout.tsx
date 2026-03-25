import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { CurvedBottomTabs } from '@/shared/ui/base/curved-bottom-tabs';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  // Define gradients based on theme
  const gradients = colorScheme === 'dark' 
    ? ['#1A1A1A', '#000000'] 
    : ['#FF7A00', '#FF9F40'];

  return (
    <Tabs
      tabBar={(props) => (
        <CurvedBottomTabs 
          {...props} 
          gradients={gradients}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-sharp" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ color }) => <Ionicons name="card-sharp" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart-sharp" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle-sharp" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
