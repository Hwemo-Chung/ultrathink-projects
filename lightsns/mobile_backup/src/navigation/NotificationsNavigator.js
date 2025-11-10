/**
 * Notifications Navigator
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Stack = createStackNavigator();

const NotificationsNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

export default NotificationsNavigator;
