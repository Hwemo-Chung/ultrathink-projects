# GitHub Actions CI/CD Workflows

This directory contains the CI/CD pipeline configuration for the LightSNS project using GitHub Actions.

## 📋 Workflows Overview

### 1. Continuous Integration (`ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

**What it does:**
- Detects which parts of the codebase changed
- Runs quick backend tests for backend changes
- Validates markdown documentation
- Performs build checks
- Reports overall CI status

**Features:**
- Path-based filtering (only runs relevant checks)
- Parallel job execution for speed
- Matrix testing across Node.js versions
- PostgreSQL and Redis service containers

**Use case:** Fast feedback on every commit

---

### 2. Backend Tests (`backend-test.yml`)

**Triggers:**
- Push to main branches affecting backend code
- Pull requests affecting backend code

**What it does:**
- Runs full test suite with coverage
- Tests against multiple Node.js versions (18.x, 20.x)
- Runs database migrations
- Performs security audit
- Checks code quality (linting, formatting)
- Uploads coverage to Codecov

**Features:**
- Matrix testing (Node 18 & 20)
- PostgreSQL 14 & Redis 7 services
- Coverage report artifacts
- Security vulnerability scanning
- ESLint and Prettier checks

**Use case:** Comprehensive testing before merging

---

### 3. Docker Build (`docker-build.yml`)

**Triggers:**
- Push to `main` or `develop`
- Version tags (`v*`)
- Pull requests to `main`

**What it does:**
- Builds Docker image for backend
- Tests the built image
- Pushes to GitHub Container Registry (on main/tags)
- Tests Docker Compose setup
- Validates service health

**Features:**
- Multi-stage builds with caching
- Image metadata and labels
- Docker Compose integration test
- Health check validation
- Automatic tagging (branch, SHA, semver)

**Use case:** Container deployment pipeline

---

### 4. Release (`release.yml`)

**Triggers:**
- Version tags (`v*.*.*`)

**What it does:**
- Creates GitHub Release with changelog
- Builds and publishes Docker images with version tags
- Runs full test suite to validate release
- Generates release notes automatically
- Uploads test artifacts

**Features:**
- Automatic changelog generation
- Semantic version parsing
- Pre-release detection (for `-alpha`, `-beta` tags)
- Docker image versioning
- Release artifact retention (90 days)

**Use case:** Production release automation

---

## 🚀 Quick Start

### Running Workflows Locally

While GitHub Actions run in the cloud, you can test similar conditions locally:

#### Test Suite
```bash
cd lightsns/backend
npm test -- --coverage
```

#### Docker Build
```bash
cd lightsns/backend
docker build -t lightsns-backend:local .
docker run --rm lightsns-backend:local node --version
```

#### Docker Compose
```bash
cd lightsns/infrastructure/docker
docker-compose up -d
curl http://localhost:3000/health
docker-compose down
```

---

## 📊 Workflow Status

Workflow statuses are visible on:
- Pull request pages
- Commit status checks
- Actions tab in GitHub repository

### Status Badges

Add these to your README:

```markdown
[![CI](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/ci.yml)
[![Backend Tests](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/backend-test.yml/badge.svg)](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/backend-test.yml)
[![Docker Build](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/docker-build.yml/badge.svg)](https://github.com/YOUR_USERNAME/ultrathink-projects/actions/workflows/docker-build.yml)
```

---

## 🔐 Required Secrets

These workflows use the following secrets (configured in GitHub Settings > Secrets):

### Automatic Secrets (provided by GitHub)
- `GITHUB_TOKEN` - Automatically provided, used for:
  - Pushing Docker images to GHCR
  - Creating releases
  - Uploading artifacts

### Optional Secrets
- `CODECOV_TOKEN` - For Codecov integration (optional)
- Custom deployment secrets (if deploying to cloud providers)

---

## 🎯 Workflow Matrix

| Workflow | On Push | On PR | On Tag | Node Versions | Docker | Services |
|----------|---------|-------|--------|---------------|--------|----------|
| CI | ✅ | ✅ | ❌ | 20.x | ❌ | Postgres, Redis |
| Backend Tests | ✅ | ✅ | ❌ | 18.x, 20.x | ❌ | Postgres, Redis |
| Docker Build | ✅ | ✅ | ✅ | - | ✅ | - |
| Release | ❌ | ❌ | ✅ | 20.x | ✅ | Postgres, Redis |

---

## 🔧 Configuration Files

### `.github/markdown-link-check-config.json`
Configuration for markdown link validation:
- Ignores localhost URLs
- Ignores GitHub issues/wiki links
- Retry logic for 429 errors
- 10-second timeout

---

## 📝 Best Practices

### Branch Protection Rules

Recommended settings for `main` branch:

1. **Require status checks to pass**
   - `All Checks Passed` (from ci.yml)
   - `Run Backend Tests` (from backend-test.yml)

2. **Require pull request reviews**
   - At least 1 approval

3. **Require branches to be up to date**

### Commit Messages

Follow Conventional Commits for better changelogs:
```
feat: add new feature
fix: bug fix
docs: documentation changes
test: test updates
ci: CI/CD changes
```

### Creating Releases

```bash
# Create and push a version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# For pre-releases
git tag -a v1.1.0-beta.1 -m "Beta release 1.1.0-beta.1"
git push origin v1.1.0-beta.1
```

---

## 🐛 Troubleshooting

### Tests Failing in CI but Passing Locally

**Common causes:**
1. **Environment differences** - Check Node.js version
2. **Database state** - CI uses fresh database
3. **Timing issues** - Add proper async/await
4. **Missing environment variables** - Check workflow env section

**Solution:**
```bash
# Match CI environment locally
docker run --rm -it \
  -v $(pwd)/lightsns/backend:/app \
  -w /app \
  node:20-alpine \
  npm test
```

### Docker Build Fails

**Common causes:**
1. **Missing Dockerfile** - Check file exists
2. **Build context issues** - Verify paths
3. **Cache issues** - Clear buildx cache

**Solution:**
```bash
# Build locally to debug
cd lightsns/backend
docker build --no-cache -t test .
```

### Workflow Not Triggering

**Common causes:**
1. **Path filters** - Change didn't match filter
2. **Branch name** - Workflow only runs on specific branches
3. **Permissions** - Check repository settings

**Solution:**
- Check workflow `on:` triggers and `paths:` filters
- View Actions tab for skipped runs

---

## 📈 Performance Optimization

### Caching Strategies

All workflows use caching:
- **NPM dependencies** - `actions/setup-node` with cache
- **Docker layers** - GitHub Actions cache (gha)
- **Test results** - Artifacts with retention

### Parallel Execution

Workflows run jobs in parallel when possible:
- Different Node versions (matrix)
- Independent checks (lint, test, build)
- Multiple service tests

---

## 🔄 Maintenance

### Updating Dependencies

GitHub Actions dependencies are managed in workflow files:

```yaml
- uses: actions/checkout@v4  # Update version here
- uses: actions/setup-node@v4
- uses: docker/build-push-action@v5
```

Check for updates: https://github.com/actions

### Service Container Versions

Update service images in `services:` section:
```yaml
postgres:
  image: postgres:14-alpine  # Update version
redis:
  image: redis:7-alpine      # Update version
```

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)

---

## ✅ Checklist for New Workflows

When adding new workflows:

- [ ] Add clear name and description
- [ ] Define appropriate triggers (push/PR/tag)
- [ ] Use path filters to avoid unnecessary runs
- [ ] Add caching for dependencies
- [ ] Include proper error handling
- [ ] Upload artifacts for debugging
- [ ] Document in this README
- [ ] Test locally before committing
- [ ] Add status badge to main README

---

**Last Updated:** 2025-10-28
**Maintainer:** ULTRATHINK Team
**Status:** ✅ Production Ready
