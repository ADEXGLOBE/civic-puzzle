module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Keep other plugins above (if you add any later)
      'react-native-reanimated/plugin', // 👈 MUST be last
    ],
  };
};
