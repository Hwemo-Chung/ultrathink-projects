/**
 * Messages Navigator - Conversations and Chat
 */

import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import ConversationsScreen from '../screens/messages/ConversationsScreen';
import ChatScreen from '../screens/messages/ChatScreen';

const Stack = createStackNavigator();

const MessagesNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{title: 'Messages'}}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({route}) => ({title: route.params?.userName || 'Chat'})}
      />
    </Stack.Navigator>
  );
};

export default MessagesNavigator;
