/**
 * Register Screen
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {authAPI} from '../../api/endpoints';
import {setCredentials, setLoading} from '../../store/slices/authSlice';
import Button from '../../components/Button';
import Input from '../../components/Input';
import {COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS} from '../../constants/theme';

const RegisterScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoadingState] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: null}));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const {username, display_name, email, password} = formData;
      const response = await authAPI.register({
        username,
        display_name,
        email,
        password,
      });

      if (response.success) {
        dispatch(setCredentials(response.data));
        Alert.alert('Success', 'Account created successfully!');
      } else {
        Alert.alert('Registration Failed', response.error);
      }
    } catch (error) {
      const message =
        error.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join LightSNS today</Text>

          <Input
            label="Username"
            value={formData.username}
            onChangeText={value => updateField('username', value)}
            placeholder="johndoe"
            autoCapitalize="none"
            leftIcon="at-outline"
            error={errors.username}
          />

          <Input
            label="Display Name"
            value={formData.display_name}
            onChangeText={value => updateField('display_name', value)}
            placeholder="John Doe"
            leftIcon="person-outline"
            error={errors.display_name}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Password"
            value={formData.password}
            onChangeText={value => updateField('password', value)}
            placeholder="At least 6 characters"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={value => updateField('confirmPassword', value)}
            placeholder="Re-enter your password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <Button
            title="Already have an account? Login"
            onPress={() => navigation.navigate('Login')}
            variant="secondary"
            style={styles.loginButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  registerButton: {
    marginTop: SPACING.md,
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
});

export default RegisterScreen;
