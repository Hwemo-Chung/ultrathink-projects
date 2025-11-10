/**
 * Chat Screen - Individual conversation
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants/theme';

const ChatScreen = ({route}) => {
  const {userId, userName} = route.params;

  return (
    <View style={styles.container}>
      <Text>Chat with {userName}</Text>
      <Text style={styles.placeholder}>Chat implementation coming soon...</Text>
      <Text style={styles.placeholder}>Will include WebSocket real-time messaging</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  placeholder: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});

export default ChatScreen;
