// src/navigation/TabNavigator.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AddScreen from '../screens/AddScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function AddButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.fabContainer}>
      <View style={styles.fab}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#D4537E',
        tabBarInactiveTintColor: '#c0bdb8',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarLabel: '홈', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Calendar" component={CalendarScreen}
        options={{ tabBarLabel: '캘린더', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Add" component={AddScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <AddButton onPress={() => {
              if (props.onPress) {
                // @ts-ignore
                props.onPress({ target: undefined, preventDefault: () => {} });
              }
            }} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Add', { editRoutine: null });
          },
        })}
      />
      <Tab.Screen name="Stats" component={StatsScreen}
        options={{ tabBarLabel: '통계', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen}
        options={{ tabBarLabel: '설정', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: '#FDFCFB',
    borderTopColor: '#f0eeeb',
    borderTopWidth: 1,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  fabContainer: { top: -20, justifyContent: 'center', alignItems: 'center' },
  fab: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#D4537E', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D4537E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
});
