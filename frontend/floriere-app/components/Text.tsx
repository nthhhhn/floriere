import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type ReactNode } from 'react';

import { colors, type } from '../theme';

type Variant = keyof typeof type;
type Color = 'ink' | 'muted' | 'cream' | 'champagne' | 'plum' | 'charcoal' | 'white' | 'danger';

type Props = RNTextProps & {
  variant?: Variant;
  color?: Color;
  align?: 'left' | 'center' | 'right';
  children?: ReactNode;
};

const colorMap: Record<Color, string> = {
  ink:       colors.ink,
  muted:     colors.muted,
  cream:     colors.cream,
  champagne: colors.champagne,
  plum:      colors.plum,
  charcoal:  colors.charcoal,
  white:     colors.white,
  danger:    colors.danger,
};

export function Text({ variant = 'body', color = 'ink', align, style, children, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: colorMap[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
