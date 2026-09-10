import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';

interface TimeInputProps
  extends Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'keyboardType' | 'maxLength'> {
  value: string;
  onChange: (label: string, minutes: number | null) => void;
}

function normalize(label: string): { text: string; minutes: number | null } {
  const digits = label.replace(/\D/g, '').slice(0, 4);
  const text = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  if (digits.length < 4) return { text, minutes: null };
  const h = Number(digits.slice(0, 2));
  const m = Number(digits.slice(2));
  return { text, minutes: h <= 23 && m <= 59 ? h * 60 + m : null };
}

export default function TimeInput({ value, onChange, style, ...rest }: TimeInputProps) {
  const display = normalize(value).text;
  return (
    <TextInput
      style={style}
      value={display}
      onChangeText={(t) => {
        const { text, minutes } = normalize(t);
        onChange(text, minutes);
      }}
      keyboardType="numeric"
      maxLength={5}
      {...rest}
    />
  );
}