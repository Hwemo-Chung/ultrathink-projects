/**
 * Feed Screen - Main timeline feed
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import {postsAPI} from '../../api/endpoints';
import {
  setFeed,
  appendToFeed,
  selectFeed,
  selectPostsLoading,
  selectPostsRefreshing,
  selectHasMore,
  selectCursor,
  incrementLikes,
  decrementLikes,
  setRefreshing,
  setLoading,
} from '../../store/slices/postsSlice';
import PostCard from '../../components/PostCard';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import {COLORS, SPACING} from '../../constants/theme';

const FeedScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const feed = useSelector(selectFeed);
  const loading = useSelector(selectPostsLoading);
  const refreshing = useSelector(selectPostsRefreshing);
  const hasMore = useSelector(selectHasMore);
  const cursor = useSelector(selectCursor);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (refresh = false) => {
    try {
      setError(null);
      if (refresh) {
        dispatch(setRefreshing(true));
      } else {
        dispatch(setLoading(true));
      }

      const response = await postsAPI.getFeed({limit: 10});

      if (response.success) {
        dispatch(
          setFeed({
            posts: response.data.posts,
            cursor: response.data.cursor,
            hasMore: response.data.hasMore,
          }),
        );
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load feed');
    } finally {
      dispatch(setLoading(false));
      dispatch(setRefreshing(false));
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore || !cursor) return;

    try {
      dispatch(setLoading(true));
      const response = await postsAPI.getFeed({limit: 10, cursor});

      if (response.success) {
        dispatch(
          appendToFeed({
            posts: response.data.posts,
            cursor: response.data.cursor,
            hasMore: response.data.hasMore,
          }),
        );
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleLike = async (postId, isLiked) => {
    try {
      if (isLiked) {
        await postsAPI.unlikePost(postId);
        dispatch(decrementLikes(postId));
      } else {
        await postsAPI.likePost(postId);
        dispatch(incrementLikes(postId));
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleRefresh = useCallback(() => {
    loadFeed(true);
  }, []);

  const renderPost = ({item}) => (
    <PostCard
      post={item}
      onPress={post => navigation.navigate('PostDetail', {postId: post.id})}
      onLike={handleLike}
      onComment={postId => navigation.navigate('PostDetail', {postId})}
      onUserPress={user => navigation.navigate('UserProfile', {userId: user.id})}
    />
  );

  const renderHeader = () => <View style={styles.headerSpacer} />;

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoading}>
        <Loading message="" size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} onRetry={() => loadFeed()} />;
    return <ErrorMessage message="No posts yet. Start following people!" />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        renderItem={renderPost}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={feed.length === 0 && styles.emptyContainer}
      />

      {/* Create Post Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.8}>
        <Icon name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSpacer: {
    height: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  footerLoading: {
    paddingVertical: SPACING.lg,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default FeedScreen;
