// Babel config — adds NativeWind's JSX transform on top of expo's preset.
// Both pieces are required: the preset opts JSX into NativeWind's runtime,
// the `nativewind/babel` plugin handles the className → style compilation.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
