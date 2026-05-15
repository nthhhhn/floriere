// Metro config — wraps the default Expo Metro config with NativeWind's
// CSS processor. The `input` path points to the bare Tailwind entry that
// loads base / components / utilities; NativeWind compiles class names from
// the tailwind.config.js content globs against that CSS.

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
