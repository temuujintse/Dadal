// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      // Төслийн одоогийн код бүхэлдээ .jsx/.js тул эдгээрийг хатуу шаардахгүй.
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-unresolved': 'off',
    },
  },
];
