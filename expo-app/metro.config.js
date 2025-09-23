// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Add polyfills for WalletConnect
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-get-random-values',
  stream: 'stream-browserify',
  buffer: '@craftzdog/react-native-buffer',
};

// Enhanced resolver configuration for WalletConnect
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Fix web compatibility issues by blocking problematic React Native modules on web
config.resolver.blockList = [
  /node_modules\/react-native\/Libraries\/TurboModule\/TurboModuleRegistry\.js$/,
  /node_modules\/react-native\/Libraries\/BatchedBridge\/NativeModules\.js$/,
  /node_modules\/react-native\/Libraries\/Blob\//,
  /node_modules\/react-native\/src\/private\/specs_DEPRECATED\//,
];

// Node modules that need to be transformed
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

// Add unstable_allowRequireContext for better module resolution
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
