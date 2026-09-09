import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { moodForEnergy, type Mood } from '../creature/stages';
import { shadeHex } from '../lib/color';
import type { Accessory } from '../lib/wardrobe';

const EYE = '#2C2621';
const NOSE = '#2C2621';
const MOUTH = '#3E322C';
const TONGUE = '#F2839B';
const TONGUE_DARK = '#D96A84';
const GOLD = '#F2C94C';

interface Props {
  coatColor: string;
  energy: number;
  equipped: Record<string, Accessory>;
  width?: number;
  height?: number;
}

export default function DachshundView({
  coatColor,
  energy,
  equipped,
  width = 240,
  height = 250,
}: Props) {
  const coat = coatColor;
  const dark = shadeHex(coat, 0.66);
  const deep = shadeHex(coat, 0.5);
  const belly = shadeHex(coat, 1.32);
  const bellySoft = shadeHex(coat, 1.16);
  const eyeArc = EYE;
  const mood: Mood = moodForEnergy(energy);

  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'sad') {
      bob.stopAnimation();
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mood, bob]);

  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  const hat = equipped.head;
  const face = equipped.face;
  const neck = equipped.neck;
  const back = equipped.back;

  return (
    <View style={{ width, height }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={width} height={height} viewBox="0 0 240 250">
          <Defs>
            <LinearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={coat} />
              <Stop offset="1" stopColor={dark} />
            </LinearGradient>
            <LinearGradient id="gHead" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={coat} />
              <Stop offset="1" stopColor={dark} />
            </LinearGradient>
            <LinearGradient id="gBelly" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={belly} />
              <Stop offset="1" stopColor={bellySoft} />
            </LinearGradient>
            <LinearGradient id="gEar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={dark} />
              <Stop offset="1" stopColor={deep} />
            </LinearGradient>
          </Defs>

          {/* tail (wagging on the left) */}
          <Ellipse
            cx={56}
            cy={166}
            rx={10}
            ry={27}
            fill={deep}
            transform="rotate(16 56 166)"
          />
          <Ellipse
            cx={54}
            cy={166}
            rx={5}
            ry={14}
            fill={shadeHex(deep, 1.22)}
            opacity={0.5}
            transform="rotate(16 54 166)"
          />

          {/* cape (back slot) */}
          {back && (
            <>
              <Rect x={78} y={116} width={84} height={62} rx={26} fill={back.color} />
              <Rect
                x={112}
                y={122}
                width={16}
                height={16}
                rx={7}
                fill={shadeHex(back.color, 0.7)}
              />
            </>
          )}

          {/* ears (behind head, hanging on the sides) */}
          <Ellipse cx={47} cy={104} rx={19} ry={42} fill="url(#gEar)" transform="rotate(11 47 104)" />
          <Ellipse cx={193} cy={104} rx={19} ry={42} fill="url(#gEar)" transform="rotate(-11 193 104)" />
          <Ellipse
            cx={49}
            cy={110}
            rx={9}
            ry={27}
            fill={deep}
            opacity={0.5}
            transform="rotate(11 49 110)"
          />
          <Ellipse
            cx={191}
            cy={110}
            rx={9}
            ry={27}
            fill={deep}
            opacity={0.5}
            transform="rotate(-11 191 110)"
          />

          {/* body (upright torso) */}
          <Ellipse cx={120} cy={158} rx={34} ry={44} fill={dark} opacity={0.55} transform="rotate(-4 120 158)" />
          <Rect x={88} y={116} width={64} height={86} rx={31} fill="url(#gBody)" />

          {/* belly patch */}
          <Ellipse cx={120} cy={168} rx={29} ry={35} fill="url(#gBelly)" />

          {/* stubby T-rex arms */}
          <Rect x={72} y={138} width={15} height={36} rx={7.5} fill={coat} transform="rotate(26 79 156)" />
          <Ellipse cx={76} cy={152} rx={8} ry={9} fill={belly} transform="rotate(26 76 152)" />
          <Rect x={153} y={138} width={15} height={36} rx={7.5} fill={coat} transform="rotate(-26 161 156)" />
          <Ellipse cx={164} cy={152} rx={8} ry={9} fill={belly} transform="rotate(-26 164 152)" />

          {/* legs + feet */}
          <Rect x={97} y={196} width={19} height={28} rx={9.5} fill={coat} />
          <Rect x={124} y={196} width={19} height={28} rx={9.5} fill={coat} />
          <Ellipse cx={107} cy={226} rx={16} ry={8} fill={belly} />
          <Ellipse cx={133} cy={226} rx={16} ry={8} fill={belly} />

          {/* neck */}
          <Rect x={104} y={92} width={32} height={30} rx={14} fill="url(#gHead)" />

          {/* head */}
          <Ellipse cx={120} cy={56} rx={58} ry={54} fill="url(#gHead)" />
          <Ellipse cx={106} cy={28} rx={22} ry={11} fill={bellySoft} opacity={0.35} transform="rotate(-16 106 28)" />

          {/* blush */}
          {mood !== 'sad' && (
            <>
              <Ellipse cx={79} cy={80} rx={12} ry={7} fill={TONGUE} opacity={0.32} />
              <Ellipse cx={161} cy={80} rx={12} ry={7} fill={TONGUE} opacity={0.32} />
            </>
          )}

          {/* eyes */}
          {mood === 'happy' && (
            <>
              <Path d="M80 34 Q94 24 108 34" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" fill="none" />
              <Path d="M132 34 Q146 24 160 34" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" fill="none" />
              <Ellipse cx={93} cy={54} rx={13} ry={14} fill="#FFFFFF" />
              <Ellipse cx={147} cy={54} rx={13} ry={14} fill="#FFFFFF" />
              <Circle cx={96} cy={56} r={6} fill={eyeArc} />
              <Circle cx={150} cy={56} r={6} fill={eyeArc} />
              <Circle cx={93} cy={52} r={2.2} fill="#FFFFFF" />
              <Circle cx={147} cy={52} r={2.2} fill="#FFFFFF" />
            </>
          )}
          {mood === 'neutral' && (
            <>
              <Path d="M82 36 L106 36" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" />
              <Path d="M134 36 L158 36" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" />
              <Circle cx={95} cy={54} r={6.5} fill={eyeArc} />
              <Circle cx={145} cy={54} r={6.5} fill={eyeArc} />
              <Circle cx={93} cy={52} r={2} fill="#FFFFFF" opacity={0.85} />
              <Circle cx={143} cy={52} r={2} fill="#FFFFFF" opacity={0.85} />
            </>
          )}
          {mood === 'sad' && (
            <>
              <Path d="M82 32 L106 40" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" />
              <Path d="M134 40 L158 32" stroke={eyeArc} strokeWidth={3.5} strokeLinecap="round" />
              <Ellipse cx={95} cy={58} rx={10} ry={6} fill={eyeArc} />
              <Ellipse cx={145} cy={58} rx={10} ry={6} fill={eyeArc} />
              <Circle cx={88} cy={74} r={3} fill={eyeArc} opacity={0.8} />
              <Circle cx={152} cy={74} r={3} fill={eyeArc} opacity={0.8} />
            </>
          )}

          {/* muzzle + nose */}
          <Ellipse cx={120} cy={84} rx={30} ry={21} fill="url(#gBelly)" />
          <Ellipse cx={120} cy={72} rx={14} ry={10} fill={NOSE} />
          <Ellipse cx={115} cy={68} rx={4} ry={2.5} fill="#FFFFFF" opacity={0.55} transform="rotate(-18 115 68)" />

          {/* mouth / tongue */}
          {mood === 'happy' && (
            <>
              <Path d="M104 88 Q120 105 136 88 Q120 93 104 88 Z" fill={MOUTH} />
              <Ellipse cx={120} cy={98} rx={11} ry={8.5} fill={TONGUE} />
              <Path d="M104 88 Q120 105 136 88" stroke={MOUTH} strokeWidth={3} strokeLinecap="round" fill="none" />
              <Ellipse cx={120} cy={98} rx={3.5} ry={5} fill={TONGUE_DARK} opacity={0.5} />
            </>
          )}
          {mood === 'neutral' && (
            <Path d="M108 89 Q120 98 132 89" stroke={MOUTH} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          )}
          {mood === 'sad' && (
            <Path d="M110 96 Q120 89 130 96" stroke={MOUTH} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          )}

          {/* head accessories */}
          {hat?.id === 'hat' && (
            <>
              <Circle cx={168} cy={14} r={4.5} fill={shadeHex(hat.color, 0.7)} />
              <Ellipse cx={120} cy={32} rx={42} ry={23} fill={hat.color} />
              <Ellipse cx={120} cy={44} rx={50} ry={9} fill={shadeHex(hat.color, 1.15)} />
            </>
          )}
          {hat?.id === 'crown' && (
            <>
              <Path d="M96 22 L104 6 L112 22 Z" fill={GOLD} stroke={shadeHex(GOLD, 0.75)} strokeWidth={1} />
              <Path d="M108 22 L116 4 L124 22 Z" fill={GOLD} stroke={shadeHex(GOLD, 0.75)} strokeWidth={1} />
              <Path d="M132 22 L140 4 L148 22 Z" fill={GOLD} stroke={shadeHex(GOLD, 0.75)} strokeWidth={1} />
              <Path d="M120 22 L128 6 L136 22 Z" fill={GOLD} stroke={shadeHex(GOLD, 0.75)} strokeWidth={1} />
              <Rect x={90} y={22} width={60} height={10} rx={3} fill={GOLD} />
              <Circle cx={120} cy={26} r={3} fill="#FFFFFF" opacity={0.85} />
            </>
          )}

          {/* face accessories (glasses) */}
          {face && (
            <>
              <Rect x={80} y={42} width={28} height={22} rx={11} fill="rgba(15,15,15,0.35)" stroke="#111111" strokeWidth={3} />
              <Rect x={132} y={42} width={28} height={22} rx={11} fill="rgba(15,15,15,0.35)" stroke="#111111" strokeWidth={3} />
              <Rect x={108} y={51} width={24} height={6} rx={3} fill="#111111" />
              <Rect x={53} y={49} width={28} height={5} rx={2.5} fill="#111111" />
              <Rect x={159} y={49} width={28} height={5} rx={2.5} fill="#111111" />
            </>
          )}

          {/* neck accessories */}
          {neck?.id === 'bandana' && (
            <>
              <Path d="M98 100 L142 100 L120 134 Z" fill={neck.color} />
              <Circle cx={120} cy={106} r={9} fill={shadeHex(neck.color, 0.85)} />
              <Circle cx={120} cy={106} r={3} fill={shadeHex(neck.color, 1.3)} opacity={0.7} />
            </>
          )}
          {neck?.id === 'collar' && (
            <>
              <Rect x={100} y={98} width={40} height={12} rx={6} fill={neck.color} />
              <Circle cx={120} cy={106} r={9} fill={GOLD} />
              <Circle cx={120} cy={106} r={9} fill="none" stroke={shadeHex(GOLD, 0.7)} strokeWidth={2} />
              <Circle cx={117} cy={103} r={2.5} fill="#FFFFFF" opacity={0.8} />
            </>
          )}
          {neck?.id === 'scarf' && (
            <>
              <Rect x={98} y={96} width={44} height={14} rx={7} fill={neck.color} />
              <Rect x={106} y={108} width={13} height={30} rx={6.5} fill={neck.color} transform="rotate(3 112 123)" />
              <Rect x={121} y={108} width={13} height={30} rx={6.5} fill={shadeHex(neck.color, 1.1)} transform="rotate(3 127 123)" />
              <Rect x={106} y={130} width={13} height={6} rx={3} fill={shadeHex(neck.color, 0.75)} opacity={0.6} transform="rotate(3 112 123)" />
              <Rect x={121} y={130} width={13} height={6} rx={3} fill={shadeHex(neck.color, 0.75)} opacity={0.6} transform="rotate(3 127 123)" />
            </>
          )}
        </Svg>
      </Animated.View>
      <View style={s.shadow} />
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: '60%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
});