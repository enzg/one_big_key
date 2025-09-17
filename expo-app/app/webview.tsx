import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';

const OnekeyURL = process.env.EXPO_PUBLIC_ONEKEY_URL || 'https://app.onekeytest.com/'
export default function WebViewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const modalHeight = height - insets.top;

  // Use ngrok URL for all platforms except web
  const webViewUrl = Platform.OS === 'web'
    ? 'http://localhost:3000'
    : `${OnekeyURL}`;

  if (Platform.OS === 'web') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
          }}>
          <div
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 -5px 20px rgba(0, 0, 0, 0.2)',
            }}>
            <div
              style={{
                height: 20,
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => router.back()}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: '#ccc',
                  borderRadius: 2,
                }}></div>
            </div>
            <iframe
              src={webViewUrl}
              style={{
                width: '100%',
                height: 'calc(100% - 20px)',
                border: 'none',
              }}
              title="Localhost WebView"
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <TouchableOpacity
          style={[{ height: 0 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        />
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.dragHandle}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <View style={styles.dragIndicator} />
          </TouchableOpacity>

          <WebView
            source={{ uri: webViewUrl }}
            style={[styles.webview, { minHeight: modalHeight }]}
            
            onLoadStart={() => {
              console.log('🚀 Device WebView - Starting to load:', webViewUrl);
            }}
            onLoadEnd={() => {
              console.log('✅ Device WebView - Finished loading');
            }}
            onError={(e) => {
              console.log('❌ Device WebView Error:', JSON.stringify(e.nativeEvent));
            }}
            onLoadProgress={({ nativeEvent }) => {
              console.log('📊 Device WebView Progress:', nativeEvent.progress);
            }}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdrop: {
    height: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  dragHandle: {
    height: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorUrl: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  errorDetails: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
