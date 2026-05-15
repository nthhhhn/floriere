// <Gradient> — cross-platform linear gradient wrapper.
//
// Native: uses expo-linear-gradient (LinearGradient).
// Web:    renders a plain View with `backgroundImage` set via inline style,
//         which RN-Web preserves on the DOM node.
//
// We accept a preset name from theme/gradients.ts, OR a custom spec, plus
// children. The View fills its parent like any other RN <View> — apply
// `style={{ flex: 1 }}` or explicit sizing on the caller side.

import { Platform, View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  angleToStartEnd,
  gradients,
  toCssGradient,
  type GradientPreset,
} from '../theme/gradients';

type Props = ViewProps & {
  preset?: GradientPreset;
  /** Custom override — { colors, angle } */
  colors?: [string, string, ...string[]];
  angle?: number;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

export function Gradient({
  preset = 'page',
  colors: colorsOverride,
  angle: angleOverride,
  style,
  children,
  ...rest
}: Props) {
  const spec = gradients[preset];
  const colors = colorsOverride ?? spec.colors;
  const angle  = angleOverride  ?? spec.angle;

  if (Platform.OS === 'web') {
    // RN-Web honors `backgroundImage` on a View's style — easier than a
    // multi-stop native gradient and pixel-identical to the original CSS.
    const backgroundImage = toCssGradient({ colors: colors as any, angle });
    return (
      <View
        {...rest}
        // `backgroundImage` is a valid CSS prop on web; RN's typings don't
        // include it, so we widen.
        style={[{ backgroundImage } as any, style]}
      >
        {children}
      </View>
    );
  }

  const { start, end } = angleToStartEnd(angle);
  return (
    <LinearGradient
      colors={colors as any}
      start={start}
      end={end}
      style={style as any}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}
