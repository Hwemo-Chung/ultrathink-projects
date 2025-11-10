/**
 * Following Screen
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants/theme';

const FollowingScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Following list implementation coming soon...</Text>
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

export default FollowingScreen;
