// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle `.tflite` models as assets so `require('model.tflite')` resolves at
// build time (used by react-native-fast-tflite for the on-device pose model).
config.resolver.assetExts.push('tflite');

module.exports = config;
