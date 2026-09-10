import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '../theme';
import { ORDO_QUOTE, ORDO_QUOTE_AUTHOR } from '../lib/brand';

export default function MottoFooter() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.wrap}>
      <Text style={styles.quote}>«{ORDO_QUOTE}»</Text>
      <Text style={styles.author}>— {ORDO_QUOTE_AUTHOR}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12 },
    quote: {
      color: theme.primary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      textAlign: 'center',
    },
    author: { color: theme.subtext, fontSize: 11, fontWeight: '700', marginTop: 4 },
  });