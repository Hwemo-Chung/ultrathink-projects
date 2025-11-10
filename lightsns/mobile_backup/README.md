# LightSNS Mobile App

React Native mobile application for LightSNS - optimized for low-bandwidth networks.

## Features

- ✅ Authentication (Login/Register)
- ✅ Feed with posts
- ✅ User profiles
- ✅ Messaging system
- ✅ Notifications
- ✅ Real-time updates (WebSocket)
- ✅ Offline support
- ✅ Image optimization (WebP, Fast Image)

## Tech Stack

- **Framework**: React Native 0.72
- **Navigation**: React Navigation 6
- **State Management**: Redux Toolkit
- **Data Fetching**: Axios
- **Local Storage**: AsyncStorage
- **Offline DB**: WatermelonDB
- **Images**: Fast Image (optimized caching)
- **Icons**: React Native Vector Icons

## Prerequisites

- Node.js 18+
- npm or yarn
- React Native development environment
  - For iOS: Xcode 14+, CocoaPods
  - For Android: Android Studio, JDK 11+

## Installation

```bash
# Install dependencies
npm install

# iOS only - Install pods
cd ios && pod install && cd ..

# Link native dependencies
npx react-native link
```

## Environment Setup

Create a `.env` file in the mobile directory:

```bash
cp .env.example .env
```

Update the API base URL to point to your backend:

```
API_BASE_URL=http://localhost:3000
WS_URL=ws://localhost:3000
```

For Android emulator, use `http://10.0.2.2:3000` instead of `localhost`.
For iOS simulator, use `http://localhost:3000` or your computer's IP address.

## Running the App

### Start Metro Bundler

```bash
npm start
```

### Run on iOS

```bash
npm run ios

# Or specific simulator
npx react-native run-ios --simulator="iPhone 14"
```

### Run on Android

```bash
npm run android

# Or specific device
adb devices
npx react-native run-android --deviceId=DEVICE_ID
```

## Project Structure

```
src/
├── api/               # API client and endpoints
│   ├── client.js      # Axios configuration with interceptors
│   └── endpoints.js   # API endpoint functions
├── components/        # Reusable UI components
│   ├── Avatar.js
│   ├── Button.js
│   ├── Input.js
│   ├── Loading.js
│   ├── ErrorMessage.js
│   └── PostCard.js
├── constants/         # App constants
│   ├── config.js      # Configuration values
│   └── theme.js       # Colors, spacing, fonts
├── navigation/        # Navigation configuration
│   ├── RootNavigator.js
│   ├── AuthNavigator.js
│   ├── MainNavigator.js
│   └── ...
├── screens/           # Screen components
│   ├── auth/          # Login, Register
│   ├── feed/          # Feed, PostDetail, CreatePost
│   ├── profile/       # Profile, EditProfile, UserProfile
│   ├── messages/      # Conversations, Chat
│   └── notifications/ # Notifications
├── store/             # Redux store
│   ├── slices/        # Redux slices (auth, posts, messages, notifications)
│   └── index.js       # Store configuration
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
└── App.js             # Main app component
```

## Key Features Implementation

### Authentication

- JWT-based authentication with access/refresh tokens
- Automatic token refresh on 401 errors
- Secure storage using AsyncStorage
- Auto-login on app restart

### Feed

- Infinite scroll with cursor-based pagination
- Pull-to-refresh
- Optimistic UI updates for likes
- Image lazy loading and caching

### Real-time Features

- WebSocket connection for live updates
- Typing indicators in messages
- Real-time notifications
- Online/offline status

### Offline Support

- Local data caching with WatermelonDB
- Offline queue for actions
- Sync when connection restored
- Optimistic UI updates

### Performance Optimizations

- Fast Image for image caching and optimization
- Lazy loading of screens
- Memoization of expensive components
- Debounced search inputs
- Virtualized lists for large datasets

## Development Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Building for Production

### iOS

```bash
# Open Xcode
cd ios && open LightSNS.xcworkspace

# Archive in Xcode:
# Product > Archive > Distribute App
```

### Android

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk

# Generate AAB for Play Store
./gradlew bundleRelease

# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### Common Issues

**Metro bundler errors:**
```bash
# Clear cache
npm start -- --reset-cache
```

**iOS build errors:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Android build errors:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Network errors on Android emulator:**
- Use `10.0.2.2` instead of `localhost` for API_BASE_URL
- Check emulator has internet connection
- Disable SSL pinning for development

## API Integration

The app connects to the LightSNS backend API. Ensure the backend is running:

```bash
cd ../backend
npm run dev
```

API Base URL can be configured in `.env` file.

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
