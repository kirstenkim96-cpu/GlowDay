import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AddScreen from '../screens/AddScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../constants/ThemeContext';

let Haptics: any = null;
if (Platform.OS !== 'web') { try { Haptics = require('expo-haptics'); } catch {} }
const tap = () => { if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

const Tab = createBottomTabNavigator();

function AddButton({ onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ top: -20, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          backgroundColor: colors.bg, borderTopColor: colors.border, borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 2 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        listeners={{ tabPress: tap }}
        options={{ tabBarLabel: '홈', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Calendar" component={CalendarScreen}
        listeners={{ tabPress: tap }}
        options={{ tabBarLabel: '캘린더', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Add" component={AddScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <AddButton onPress={() => { tap(); if (props.onPress) { props.onPress({ target: undefined, preventDefault: () => {} } as any); } }} colors={colors} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); tap(); navigation.navigate('Add', { editRoutine: null, editEvent: null }); },
        })}
      />
      <Tab.Screen name="Stats" component={StatsScreen}
        listeners={{ tabPress: tap }}
        options={{ tabBarLabel: '통계', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen}
        listeners={{ tabPress: tap }}
        options={{ tabBarLabel: '설정', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
