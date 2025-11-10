/**
 * Main Navigator - Bottom Tab Navigation
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSelector} from 'react-redux';
import {COLORS} from '../constants/theme';
import {
  selectUnreadNotificationsCount,
  selectUnreadCount,
} from '../store/slices/notificationsSlice';
import FeedNavigator from './FeedNavigator';
import ProfileNavigator from './ProfileNavigator';
import MessagesNavigator from './MessagesNavigator';
import NotificationsNavigator from './NotificationsNavigator';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const unreadNotifications = useSelector(selectUnreadNotificationsCount);
  const unreadMessages = useSelector(selectUnreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}>
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({color, size}) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarIcon: ({color, size}) => (
            <Icon name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsNavigator}
        options={{
          tabBarLabel: 'Notifications',
          tabBarBadge:
            unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarIcon: ({color, size}) => (
            <Icon name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <Icon name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
