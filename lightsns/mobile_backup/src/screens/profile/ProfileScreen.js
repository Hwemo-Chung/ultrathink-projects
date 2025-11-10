/**
 * Profile Screen - Current User Profile
 */

import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {selectCurrentUser, logout} from '../../store/slices/authSlice';
import {authAPI} from '../../api/endpoints';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import {COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS} from '../../constants/theme';

const ProfileScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await authAPI.logout();
          } catch (err) {
            console.error('Logout error:', err);
          } finally {
            dispatch(logout());
          }
        },
      },
    ]);
  };

  if (!currentUser) return <Loading />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar
          uri={currentUser.avatar_url}
          name={currentUser.display_name}
          size={100}
        />
        <Text style={styles.displayName}>{currentUser.display_name}</Text>
        <Text style={styles.username}>@{currentUser.username}</Text>
        {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.posts_count || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.followers_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.following_count || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <Button
          title="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')}
          variant="secondary"
          style={styles.editButton}
        />

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  displayName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
  },
  username: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  editButton: {
    marginTop: SPACING.lg,
    minWidth: 200,
  },
  logoutButton: {
    marginTop: SPACING.sm,
    minWidth: 200,
  },
});

export default ProfileScreen;
