# LightSNS Backend - Deployment Guide

Complete guide for deploying LightSNS backend to production environments.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Production Checklist](#production-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or Docker-compatible system
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 7.x or higher
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 10GB+ available disk space

### Tools Required
- Docker & Docker Compose (for containerized deployment)
- Git
- nginx or similar reverse proxy (for production)
- SSL certificate (Let's Encrypt recommended)

---

## Environment Configuration

### 1. Create Production Environment File

Create `.env.production` in the backend directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=lightsns_prod
DB_USER=lightsns_user
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_SSL=true
DB_MAX_CONNECTIONS=20

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD
REDIS_DB=0
REDIS_TLS=true

# JWT Configuration (IMPORTANT: Generate strong secrets)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# External Services (if applicable)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Optional: CDN
CDN_URL=https://cdn.yourdomain.com
```

### 2. Generate Secure Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the output for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

---

## Database Setup

### Option 1: Managed Database (Recommended)

Use managed PostgreSQL service:
- AWS RDS
- Google Cloud SQL
- Digital Ocean Managed Databases
- Heroku Postgres

**Steps:**
1. Create PostgreSQL 14+ instance
2. Note connection details (host, port, database, user, password)
3. Enable SSL connections
4. Configure firewall to allow your app servers

### Option 2: Self-Hosted Database

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Create Database:**
```bash
sudo -u postgres psql

postgres=# CREATE DATABASE lightsns_prod;
postgres=# CREATE USER lightsns_user WITH ENCRYPTED PASSWORD 'your-password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE lightsns_prod TO lightsns_user;
postgres=# \q
```

### Run Migrations

```bash
cd backend
npm install
npm run migrate
```

---

## Redis Setup

### Option 1: Managed Redis (Recommended)

Use managed Redis service:
- AWS ElastiCache
- Redis Labs
- Digital Ocean Managed Redis
- Heroku Redis

### Option 2: Self-Hosted Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-redis-password

# Restart
sudo systemctl restart redis
sudo systemctl enable redis
```

---

## Docker Deployment

### 1. Prepare Docker Files

**Dockerfile** (already exists in `backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "src/index.js"]
```

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env.production
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    networks:
      - lightsns-network

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: lightsns_prod
      POSTGRES_USER: lightsns_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - lightsns-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - lightsns-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - lightsns-network

volumes:
  postgres-data:
  redis-data:

networks:
  lightsns-network:
    driver: bridge
```

### 2. Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Manual Deployment

### 1. Setup Application Server

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create app user
sudo useradd -m -s /bin/bash lightsns
sudo su - lightsns

# Clone repository
git clone https://github.com/your-org/lightsns.git
cd lightsns/backend

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env.production
nano .env.production  # Edit with production values
```

### 2. Setup Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start src/index.js --name lightsns-api --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions output by the command
```

### 3. Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/lightsns

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /uploads/ {
        alias /home/lightsns/lightsns/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/lightsns /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## Production Checklist

### Security
- [ ] Strong JWT secrets (64+ characters)
- [ ] Strong database passwords
- [ ] SSL/TLS enabled for all connections
- [ ] Database SSL connections enabled
- [ ] Redis password protection
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Firewall configured (only necessary ports open)
- [ ] Security headers configured
- [ ] File upload restrictions enforced

### Performance
- [ ] Database indexes verified
- [ ] Redis caching enabled
- [ ] Image optimization working
- [ ] Connection pooling configured
- [ ] Compression enabled (gzip/brotli)
- [ ] CDN configured for static assets
- [ ] Database query optimization
- [ ] WebSocket scaling strategy

### Monitoring
- [ ] Health check endpoint working
- [ ] Application logging configured
- [ ] Error tracking setup (e.g., Sentry)
- [ ] Performance monitoring (e.g., New Relic)
- [ ] Database monitoring
- [ ] Redis monitoring
- [ ] Disk space monitoring
- [ ] Uptime monitoring

### Backup
- [ ] Database backup strategy
- [ ] Automated daily backups
- [ ] Backup retention policy
- [ ] Disaster recovery plan
- [ ] File storage backup
- [ ] Backup restoration tested

### Documentation
- [ ] API documentation updated
- [ ] Deployment runbook created
- [ ] Emergency contacts documented
- [ ] Access credentials secured
- [ ] Architecture diagram updated

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check application health
curl https://api.yourdomain.com/health

# Check database connection
docker exec lightsns-postgres pg_isready

# Check Redis
docker exec lightsns-redis redis-cli ping
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs lightsns-api

# Docker logs
docker-compose logs -f backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Maintenance

```bash
# Backup database
pg_dump -h localhost -U lightsns_user lightsns_prod > backup_$(date +%Y%m%d).sql

# Vacuum database
psql -h localhost -U lightsns_user -d lightsns_prod -c "VACUUM ANALYZE;"
```

### Application Updates

```bash
# Pull latest code
cd /home/lightsns/lightsns/backend
git pull origin main

# Install dependencies
npm ci --only=production

# Run migrations
npm run migrate

# Restart application
pm2 restart lightsns-api

# Or with Docker
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### Application Won't Start

1. Check logs:
   ```bash
   pm2 logs lightsns-api --lines 100
   ```

2. Verify environment variables:
   ```bash
   cat .env.production
   ```

3. Check database connection:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

### High Memory Usage

1. Check Node.js memory:
   ```bash
   pm2 monit
   ```

2. Restart application:
   ```bash
   pm2 restart lightsns-api
   ```

3. Consider increasing memory limit:
   ```bash
   pm2 start src/index.js --max-memory-restart 500M
   ```

### Database Connection Issues

1. Check PostgreSQL status:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify firewall rules:
   ```bash
   sudo ufw status
   ```

3. Test connection:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

### WebSocket Connection Failures

1. Verify nginx WebSocket configuration
2. Check CORS settings
3. Verify SSL/TLS configuration
4. Check firewall rules

### Performance Issues

1. Check Redis cache hit rate:
   ```bash
   redis-cli INFO stats | grep keyspace
   ```

2. Monitor database queries:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. Check slow queries:
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;
   ```

---

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer**: Use nginx or AWS ELB
2. **Multiple Instances**: Run multiple backend instances
3. **Session Stickiness**: For WebSocket connections
4. **Redis Pub/Sub**: For cross-instance messaging

### Vertical Scaling

1. **Increase Server Resources**: More CPU/RAM
2. **Database Optimization**: Increase connections, tuning
3. **Redis Memory**: Increase cache size

### Database Scaling

1. **Read Replicas**: For read-heavy workloads
2. **Connection Pooling**: PgBouncer
3. **Partitioning**: For large tables
4. **Caching**: Aggressive Redis caching

---

## Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Security Audits**: Run `npm audit` regularly
3. **Access Control**: Limit SSH access, use key-based auth
4. **Secrets Management**: Use environment variables or secret managers
5. **Backup Encryption**: Encrypt backup files
6. **SSL Monitoring**: Monitor certificate expiration
7. **Rate Limiting**: Protect against abuse
8. **Input Validation**: Always validate user input

---

## Support & Resources

- **Documentation**: See README.md and API_REFERENCE.md
- **Health Check**: `GET /health`
- **GitHub Issues**: Report problems
- **Emergency Contact**: [Your contact info]

---

**Last Updated**: 2025-10-28
**Version**: 1.0.0
**Status**: Production Ready ✅
