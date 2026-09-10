import { StyleSheet, Pressable, type PressableProps } from 'react-native';

export function PressableScale(props: PressableProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        typeof props.style === 'function' ? props.style({ pressed }) : props.style,
        pressed && styles.pressed,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});