import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '../theme';
import { Text } from './Text';

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
};

/** Editorial 5-star control. Tap to set when `onChange` is provided. */
export function Stars({ value, onChange, size = 22 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const child = (
          <Text
            style={{ fontSize: size, color: filled ? colors.champagne : colors.creamRule, lineHeight: size + 2 }}
          >
            {filled ? '★' : '☆'}
          </Text>
        );
        if (!onChange) return <View key={i} style={styles.cell}>{child}</View>;
        return (
          <Pressable key={i} onPress={() => onChange(i)} style={styles.cell}>
            {child}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cell: { paddingHorizontal: space.xs },
});
