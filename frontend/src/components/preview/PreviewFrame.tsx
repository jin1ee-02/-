import type { PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../ui';

export function PreviewFrame({ children }: PropsWithChildren) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{children}</SafeAreaView>;
}
