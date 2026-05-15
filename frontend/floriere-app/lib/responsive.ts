import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'desktop';
  if (width >= 640) return 'tablet';
  return 'phone';
}

export function pickByBreakpoint<T>(
  bp: Breakpoint,
  values: { phone: T; tablet?: T; desktop?: T },
): T {
  if (bp === 'desktop') return values.desktop ?? values.tablet ?? values.phone;
  if (bp === 'tablet') return values.tablet ?? values.phone;
  return values.phone;
}
