module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // worklets: false — react-native-css-interop (a nativewind v4 dependency) pulls in
      // react-native-reanimated/react-native-worklets as a nested peer dependency purely
      // for its own internal use. This project does not use Reanimated/Worklets directly,
      // and enabling the worklets Babel plugin here would require a native rebuild
      // (react-native-worklets ships a config plugin) for no benefit, so it's disabled.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', worklets: false }],
      'nativewind/babel',
    ],
  };
};
