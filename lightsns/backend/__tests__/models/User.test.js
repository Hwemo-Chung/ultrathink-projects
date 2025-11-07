const User = require('../../src/models/User');
const { hashPassword } = require('../../src/utils/password');
const { createTestUser, cleanupTestData } = require('../helpers/testHelpers');

describe('User Model', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('create()', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        username: 'johndoe',
        display_name: 'John Doe',
        email: 'john@example.com',
        phone_number: '+1234567890',
        password_hash: await hashPassword('TestPassword123'),
        bio: 'Test bio'
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('johndoe');
      expect(user.display_name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.phone_number).toBe('+1234567890');
      expect(user.bio).toBe('Test bio');
      expect(user.password_hash).toBeUndefined(); // Should not return password
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeDefined();
    });

    it('should create a user without optional fields', async () => {
      const userData = {
        username: 'janedoe',
        display_name: 'Jane Doe',
        email: 'jane@example.com',
        phone_number: null,
        password_hash: await hashPassword('TestPassword123')
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.bio).toBeNull();
      expect(user.phone_number).toBeNull();
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        display_name: 'User One',
        email: 'user1@example.com',
        phone_number: null,
        password_hash: await hashPassword('TestPassword123')
      };

      await User.create(userData);

      const duplicateData = {
        ...userData,
        email: 'user2@example.com'
      };

      await expect(User.create(duplicateData)).rejects.toThrow(
        'Username already exists'
      );
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        username: 'user1',
        display_name: 'User One',
        email: 'duplicate@example.com',
        phone_number: null,
        password_hash: await hashPassword('TestPassword123')
      };

      await User.create(userData);

      const duplicateData = {
        ...userData,
        username: 'user2'
      };

      await expect(User.create(duplicateData)).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should throw error for duplicate phone number', async () => {
      const userData = {
        username: 'user1',
        display_name: 'User One',
        email: 'user1@example.com',
        phone_number: '+1111111111',
        password_hash: await hashPassword('TestPassword123')
      };

      await User.create(userData);

      const duplicateData = {
        username: 'user2',
        display_name: 'User Two',
        email: 'user2@example.com',
        phone_number: '+1111111111',
        password_hash: await hashPassword('TestPassword123')
      };

      await expect(User.create(duplicateData)).rejects.toThrow(
        'Phone number already exists'
      );
    });
  });

  describe('findById()', () => {
    it('should find user by ID without password', async () => {
      const createdUser = await createTestUser();

      const user = await User.findById(createdUser.id);

      expect(user).toBeDefined();
      expect(user.id).toBe(createdUser.id);
      expect(user.username).toBe(createdUser.username);
      expect(user.password_hash).toBeUndefined();
    });

    it('should find user by ID with password when requested', async () => {
      const createdUser = await createTestUser();

      const user = await User.findById(createdUser.id, true);

      expect(user).toBeDefined();
      expect(user.id).toBe(createdUser.id);
      expect(user.password_hash).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      const user = await User.findById('00000000-0000-0000-0000-000000000000');

      expect(user).toBeNull();
    });
  });

  describe('findByUsername()', () => {
    it('should find user by username', async () => {
      const createdUser = await createTestUser({ username: 'findmetest' });

      const user = await User.findByUsername('findmetest');

      expect(user).toBeDefined();
      expect(user.username).toBe('findmetest');
      expect(user.password_hash).toBeUndefined();
    });

    it('should return null for non-existent username', async () => {
      const user = await User.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email', async () => {
      const createdUser = await createTestUser({
        email: 'findme@example.com'
      });

      const user = await User.findByEmail('findme@example.com');

      expect(user).toBeDefined();
      expect(user.email).toBe('findme@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findByPhoneNumber()', () => {
    it('should find user by phone number', async () => {
      const createdUser = await createTestUser({
        phone_number: '+9876543210'
      });

      const user = await User.findByPhoneNumber('+9876543210');

      expect(user).toBeDefined();
      expect(user.phone_number).toBe('+9876543210');
    });

    it('should return null for non-existent phone number', async () => {
      const user = await User.findByPhoneNumber('+0000000000');

      expect(user).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update user fields successfully', async () => {
      const createdUser = await createTestUser();

      const updates = {
        display_name: 'Updated Name',
        bio: 'Updated bio'
      };

      const updatedUser = await User.update(createdUser.id, updates);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.display_name).toBe('Updated Name');
      expect(updatedUser.bio).toBe('Updated bio');
      expect(updatedUser.username).toBe(createdUser.username); // Unchanged
    });

    it('should not update disallowed fields', async () => {
      const createdUser = await createTestUser();

      const updates = {
        username: 'hackedusername',
        email: 'hacked@example.com',
        display_name: 'Valid Update'
      };

      const updatedUser = await User.update(createdUser.id, updates);

      expect(updatedUser.display_name).toBe('Valid Update');
      expect(updatedUser.username).toBe(createdUser.username); // Not changed
      expect(updatedUser.email).toBe(createdUser.email); // Not changed
    });

    it('should throw error when no valid fields provided', async () => {
      const createdUser = await createTestUser();

      await expect(
        User.update(createdUser.id, { invalid_field: 'value' })
      ).rejects.toThrow('No valid fields to update');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        User.update('00000000-0000-0000-0000-000000000000', {
          display_name: 'Test'
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete()', () => {
    it('should soft delete a user', async () => {
      const createdUser = await createTestUser();

      const result = await User.delete(createdUser.id);

      expect(result).toBe(true);

      // User should not be found after deletion
      const deletedUser = await User.findById(createdUser.id);
      expect(deletedUser).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const result = await User.delete('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });
  });

  describe('search()', () => {
    it('should search users by username', async () => {
      await createTestUser({ username: 'searchtest1' });
      await createTestUser({ username: 'searchtest2' });
      await createTestUser({ username: 'differentname' });

      const results = await User.search('searchtest');

      expect(results).toHaveLength(2);
      expect(results[0].username).toContain('searchtest');
      expect(results[1].username).toContain('searchtest');
    });

    it('should search users by display name', async () => {
      await createTestUser({
        username: 'user1',
        display_name: 'John Search'
      });
      await createTestUser({
        username: 'user2',
        display_name: 'Jane Search'
      });

      const results = await User.search('Search');

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await User.search('nonexistentsearchterm');

      expect(results).toEqual([]);
    });

    it('should respect limit and offset', async () => {
      await createTestUser({ username: 'limituser1' });
      await createTestUser({ username: 'limituser2' });
      await createTestUser({ username: 'limituser3' });

      const results = await User.search('limituser', 2, 0);
      expect(results.length).toBeLessThanOrEqual(2);

      const offsetResults = await User.search('limituser', 2, 1);
      expect(offsetResults.length).toBeGreaterThan(0);
      expect(offsetResults[0].id).not.toBe(results[0].id);
    });
  });
});
