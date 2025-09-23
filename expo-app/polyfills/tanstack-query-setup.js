// TanStack Query React Native setup according to official docs
// This configures the global query client for React Native compatibility

import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';

// Configure TanStack Query for React Native
const setupTanStackQuery = () => {
  // Only setup if we're in React Native and TanStack Query is available
  if (Platform.OS !== 'web') {
    try {
      // Try to import and configure onlineManager
      import('@tanstack/react-query').then(({ onlineManager, focusManager }) => {
        console.log('[TANSTACK-QUERY-SETUP] Configuring TanStack Query for React Native');

        // Setup online status management with NetInfo
        onlineManager.setEventListener((setOnline) => {
          return NetInfo.addEventListener((state) => {
            console.log('[TANSTACK-QUERY-SETUP] Network state:', state.isConnected);
            setOnline(!!state.isConnected);
          });
        });

        // Setup app focus management
        const onAppStateChange = (status) => {
          console.log('[TANSTACK-QUERY-SETUP] App state:', status);
          focusManager.setFocused(status === 'active');
        };

        const subscription = AppState.addEventListener('change', onAppStateChange);

        console.log('[TANSTACK-QUERY-SETUP] TanStack Query configured successfully');

        // Return cleanup function
        return () => {
          subscription?.remove();
        };
      }).catch((error) => {
        console.log('[TANSTACK-QUERY-SETUP] TanStack Query not available, using fallback');
        // If TanStack Query is not available, we'll use our polyfill approach
      });
    } catch (error) {
      console.log('[TANSTACK-QUERY-SETUP] Error setting up TanStack Query:', error);
    }
  } else {
    console.log('[TANSTACK-QUERY-SETUP] Web platform detected, skipping React Native setup');
  }
};

// Auto-setup when this module is imported
setupTanStackQuery();

export { setupTanStackQuery };