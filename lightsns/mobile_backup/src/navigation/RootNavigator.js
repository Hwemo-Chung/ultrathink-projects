/**
 * Root Navigator - Handles Auth/Main navigation switching
 */

import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {selectIsAuthenticated, setCredentials} from '../store/slices/authSlice';
import {STORAGE_KEYS} from '../constants/config';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

const RootNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Check for existing auth token
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const refreshToken = await AsyncStorage.getItem(
          STORAGE_KEYS.REFRESH_TOKEN,
        );
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

        if (token && refreshToken && userData) {
          dispatch(
            setCredentials({
              accessToken: token,
              refreshToken,
              user: JSON.parse(userData),
            }),
          );
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  if (isLoading) {
    // TODO: Add splash screen component
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
