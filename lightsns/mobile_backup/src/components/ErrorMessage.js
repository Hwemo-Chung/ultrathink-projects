/**
 * Error Message Component
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from './Button';
import {COLORS, SPACING, FONT_SIZES} from '../constants/theme';

const ErrorMessage = ({
  message = 'Something went wrong',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Icon name="alert-circle-outline" size={48} color={COLORS.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="primary"
          size="small"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  message: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: SPACING.sm,
  },
});

export default ErrorMessage;
