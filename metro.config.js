// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle the MoveNet `.tflite` model as an asset so `require(...)` resolves it
// and react-native-fast-tflite can load it from the app bundle (offline).
config.resolver.assetExts.push('tflite');

module.exports = config;
