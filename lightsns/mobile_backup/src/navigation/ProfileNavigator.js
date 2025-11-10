/**
 * Profile Navigator - User Profile and Settings
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import FollowersScreen from '../screens/profile/FollowersScreen';
import FollowingScreen from '../screens/profile/FollowingScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';

const Stack = createStackNavigator();

const ProfileNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{title: 'Edit Profile'}}
      />
      <Stack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{title: 'Followers'}}
      />
      <Stack.Screen
        name="Following"
        component={FollowingScreen}
        options={{title: 'Following'}}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{title: 'Profile'}}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
