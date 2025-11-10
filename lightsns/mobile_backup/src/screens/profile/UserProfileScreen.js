/**
 * User Profile Screen - View other user's profile
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants/theme';

const UserProfileScreen = ({route}) => {
  const {userId} = route.params;

  return (
    <View style={styles.container}>
      <Text>User Profile: {userId}</Text>
      <Text style={styles.placeholder}>User profile implementation coming soon...</Text>
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
    marginTop: SPACING.md,
  },
});

export default UserProfileScreen;
