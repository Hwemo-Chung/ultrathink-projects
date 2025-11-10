/**
 * Feed Navigator - Feed and Post Details
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import FeedScreen from '../screens/feed/FeedScreen';
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import CreatePostScreen from '../screens/feed/CreatePostScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';

const Stack = createStackNavigator();

const FeedNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{title: 'LightSNS'}}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{title: 'Post'}}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{title: 'Create Post', presentation: 'modal'}}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{title: 'Profile'}}
      />
    </Stack.Navigator>
  );
};

export default FeedNavigator;
