/**
 * Post Detail Screen - Shows post with comments
 */

import React, {useEffect, useState} from 'react';
import {View, ScrollView, Text, StyleSheet} from 'react-native';
import {postsAPI} from '../../api/endpoints';
import PostCard from '../../components/PostCard';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import {COLORS, SPACING} from '../../constants/theme';

const PostDetailScreen = ({route, navigation}) => {
  const {postId} = route.params;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(postId);
      if (response.success) {
        setPost(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={loadPost} />;
  if (!post) return <ErrorMessage message="Post not found" />;

  return (
    <ScrollView style={styles.container}>
      <PostCard
        post={post}
        onUserPress={user => navigation.navigate('UserProfile', {userId: user.id})}
      />
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments</Text>
        <Text style={styles.placeholder}>Comments section coming soon...</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  commentsSection: {
    padding: SPACING.md,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  placeholder: {
    color: COLORS.textSecondary,
  },
});

export default PostDetailScreen;
