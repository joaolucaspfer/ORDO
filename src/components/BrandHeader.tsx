import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { FONT } from '../lib/fonts';
import Logo from './Logo';

export default function BrandHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Logo size={20} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 19,
    letterSpacing: -0.3,
  },
});