// Flat ESLint config built on Expo's recommended rules (SDK 54).
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', '/tmp/*'],
  },
];
