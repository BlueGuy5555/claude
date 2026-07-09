/**
 * Ambient declaration so TypeScript understands importing a bundled `.tflite`
 * model as an asset. Metro (see `metro.config.js`, which registers `tflite` as
 * an asset extension) turns the import into a numeric asset reference that
 * `react-native-fast-tflite` knows how to load.
 */
declare module '*.tflite' {
  const asset: number;
  export default asset;
}
