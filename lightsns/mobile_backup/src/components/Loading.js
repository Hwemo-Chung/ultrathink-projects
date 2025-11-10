/**
 * Loading Component
 */

import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

const Loading = ({message = 'Loading...', size = 'large'}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});

export default Loading;
