/**
 * Followers Screen
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants/theme';

const FollowersScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Followers list implementation coming soon...</Text>
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
  },
});

export default FollowersScreen;
