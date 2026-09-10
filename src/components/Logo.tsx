import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';

type LogoProps = {
  size?: number;
  color?: string;
};

export default function Logo({ size = 24, color }: LogoProps) {
  const { theme } = useTheme();
  const caret = color ?? theme.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M16 5 L4 27"
        stroke={caret}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M16 5 L28 27"
        stroke={caret}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}