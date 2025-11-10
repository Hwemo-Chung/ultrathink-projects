/**
 * Create Post Screen
 */

import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {useDispatch} from 'react-redux';
import {postsAPI} from '../../api/endpoints';
import {prependToFeed} from '../../store/slices/postsSlice';
import Input from '../../components/Input';
import Button from '../../components/Button';
import {COLORS, SPACING} from '../../constants/theme';

const CreatePostScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    setLoading(true);
    try {
      const response = await postsAPI.createPost({content});
      if (response.success) {
        dispatch(prependToFeed(response.data));
        Alert.alert('Success', 'Post created!');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Input
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        multiline
        numberOfLines={6}
        style={styles.input}
      />
      <Button
        title="Post"
        onPress={handleSubmit}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  input: {
    marginBottom: SPACING.lg,
  },
});

export default CreatePostScreen;
