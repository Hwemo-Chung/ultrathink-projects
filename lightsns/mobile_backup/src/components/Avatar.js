/**
 * Avatar Component with Fast Image for optimization
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {COLORS, FONT_SIZES, FONT_WEIGHTS} from '../constants/theme';

const Avatar = ({
  uri,
  name,
  size = 40,
  style,
}) => {
  // Generate initials from name
  const getInitials = () => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const avatarSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri) {
    return (
      <FastImage
        style={[styles.avatar, avatarSize, style]}
        source={{
          uri,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }

  // Fallback to initials
  return (
    <View style={[styles.avatar, styles.placeholder, avatarSize, style]}>
      <Text style={[styles.initials, {fontSize: size * 0.4}]}>
        {getInitials()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.lightGray,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  initials: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default Avatar;
