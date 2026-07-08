module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Powers VisionCamera Frame Processor worklets (runs inference + Skia
      // drawing on the camera thread).
      'react-native-worklets-core/plugin',
      // Powers react-native-reanimated v4. The worklets plugin MUST be listed
      // last so it transforms after every other plugin.
      'react-native-worklets/plugin',
    ],
  };
};
