// Essential polyfills for React Native crypto/web3 support
import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '../polyfills/minimal-dom-essential';
import '../polyfills/tanstack-query-setup';
import '@expo/browser-polyfill';
import 'text-encoding';

// Additional polyfills for better web compatibility
import 'base-64';
import 'react-native-fetch-api';
import 'web-streams-polyfill';
import React, { useEffect } from 'react';
import { TamaguiProvider } from 'tamagui';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { AppKit } from '@reown/appkit-wagmi-react-native'; // Causing destructuring errors
import { wagmiConfig } from '../contexts/AppKitContext';

import config from '../tamagui.config';

// Setup QueryClient for TanStack Query with better network resilience
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Always retry network errors up to 3 times
        if (failureCount < 3) return true;
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online', // Allow queries when online
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config}>
          {/* <AppKit /> */}
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="wallet" options={{ headerShown: false }} />
            <Stack.Screen name="wallet-appkit" options={{ headerShown: false }} />
          </Stack>
        </TamaguiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
