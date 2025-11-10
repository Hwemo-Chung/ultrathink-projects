/**
 * Notifications Screen
 */

import React, {useEffect} from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  selectNotifications,
  setNotifications,
  markAsRead,
} from '../../store/slices/notificationsSlice';
import {notificationsAPI} from '../../api/endpoints';
import Avatar from '../../components/Avatar';
import Loading from '../../components/Loading';
import {COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS} from '../../constants/theme';

const NotificationsScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getNotifications();
      if (response.success) {
        dispatch(setNotifications(response.data));
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async notification => {
    if (!notification.is_read) {
      try {
        await notificationsAPI.markAsRead(notification.id);
        dispatch(markAsRead(notification.id));
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    }

    // Navigate based on notification type
    // Implementation depends on notification structure
  };

  const getNotificationIcon = type => {
    switch (type) {
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'follow':
        return 'person-add';
      case 'message':
        return 'mail';
      default:
        return 'notifications';
    }
  };

  const renderNotification = ({item}) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unread]}
      onPress={() => handleNotificationPress(item)}>
      <Avatar uri={item.actor_avatar_url} name={item.actor_name} size={40} />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          <Text style={styles.actorName}>{item.actor_name}</Text> {item.message}
        </Text>
        <Text style={styles.timestamp}>{item.created_at}</Text>
      </View>
      <Icon
        name={getNotificationIcon(item.type)}
        size={20}
        color={COLORS.primary}
      />
    </TouchableOpacity>
  );

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  unread: {
    backgroundColor: '#F0F8FF',
  },
  notificationContent: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  notificationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  actorName: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
  timestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
});

export default NotificationsScreen;
