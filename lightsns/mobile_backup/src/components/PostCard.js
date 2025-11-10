/**
 * Post Card Component for Feed
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import Avatar from './Avatar';
import {COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS} from '../constants/theme';

const PostCard = ({
  post,
  onPress,
  onLike,
  onComment,
  onUserPress,
}) => {
  const {
    id,
    content,
    image_url,
    user,
    likes_count = 0,
    comments_count = 0,
    is_liked = false,
    created_at,
  } = post;

  const formatTimeAgo = timestamp => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInMs = now - postDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return postDate.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(post)}
      activeOpacity={0.95}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onUserPress?.(user)}>
        <Avatar
          uri={user?.avatar_url}
          name={user?.display_name}
          size={40}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{user?.display_name}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(created_at)}</Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      <Text style={styles.content}>{content}</Text>

      {/* Image */}
      {image_url && (
        <FastImage
          style={styles.image}
          source={{
            uri: image_url,
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.web,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike?.(id, is_liked)}>
          <Icon
            name={is_liked ? 'heart' : 'heart-outline'}
            size={24}
            color={is_liked ? COLORS.error : COLORS.gray}
          />
          <Text style={[styles.actionText, is_liked && styles.likedText]}>
            {likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment?.(id)}>
          <Icon name="chatbubble-outline" size={22} color={COLORS.gray} />
          <Text style={styles.actionText}>{comments_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  headerInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  timestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  likedText: {
    color: COLORS.error,
  },
});

export default PostCard;
