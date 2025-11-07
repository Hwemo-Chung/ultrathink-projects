const request = require('supertest');
const app = require('../../src/index');
const { createTestUser, cleanupTestData, generateTestToken } = require('../helpers/testHelpers');

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        display_name: 'New User',
        email: 'newuser@example.com',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe('newuser');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password_hash).toBeUndefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'test'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid username format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'ab', // Too short
          display_name: 'Test',
          email: 'test@example.com',
          password: 'TestPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          display_name: 'Test User',
          email: 'test@example.com',
          password: '123' // Too weak
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate username', async () => {
      await createTestUser({ username: 'duplicate' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'duplicate',
          display_name: 'Test',
          email: 'unique@example.com',
          password: 'TestPassword123'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'loginuser',
          display_name: 'Login User',
          email: 'login@example.com',
          password: 'TestPassword123'
        });
    });

    it('should login with username successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'loginuser',
          password: 'TestPassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('loginuser');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should login with email successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'login@example.com',
          password: 'TestPassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'loginuser',
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent',
          password: 'TestPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id);
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.username).toBe(user.username);
      expect(response.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id);
    });

    it('should update user profile', async () => {
      const updates = {
        display_name: 'Updated Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.display_name).toBe('Updated Name');
      expect(response.body.data.user.bio).toBe('Updated bio');
    });

    it('should not allow updating username', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'hacked',
          display_name: 'Valid Update'
        })
        .expect(200);

      // Username should remain unchanged
      expect(response.body.data.user.username).toBe(user.username);
      expect(response.body.data.user.display_name).toBe('Valid Update');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/auth/me')
        .send({ display_name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let user, token;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // First, register and get tokens
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshuser',
          display_name: 'Refresh User',
          email: 'refresh@example.com',
          password: 'TestPassword123'
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      // Use refresh token to get new tokens
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
