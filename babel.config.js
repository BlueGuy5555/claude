module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Two worklet transforms coexist here:
    //  - react-native-worklets-core/plugin powers VisionCamera frame processors
    //  - react-native-worklets/plugin powers react-native-reanimated v4
    // The reanimated/worklets plugin MUST be listed last.
    plugins: ['react-native-worklets-core/plugin', 'react-native-worklets/plugin'],
  };
};
