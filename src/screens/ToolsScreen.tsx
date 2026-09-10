import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { PressableScale as Pressable } from '../components/PressableScale';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { FONT } from '../lib/fonts';
import Logo from '../components/Logo';
import MottoFooter from '../components/MottoFooter';

type ToolKey = 'pomodoro' | 'timer' | 'stopwatch' | 'breath';

const TOOLS: { key: ToolKey; emoji: string; title: string; desc: string }[] = [
  { key: 'pomodoro', emoji: '🍅', title: 'Pomodoro', desc: 'Foco de 25 min com pausas' },
  { key: 'timer', emoji: '⏲️', title: 'Temporizador', desc: 'Conta atrás para o que precisares' },
  { key: 'stopwatch', emoji: '⏱️', title: 'Cronómetro', desc: 'Tempo decorrido com voltas' },
  { key: 'breath', emoji: '🌬️', title: 'Respiração', desc: 'Exercício 4-7-8 para acalmar' },
];

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function hms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 10));
  const cs = total % 100;
  const s = Math.floor(total / 100) % 60;
  const m = Math.floor(total / 6000) % 60;
  const h = Math.floor(total / 360000);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const cc = String(cs).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}.${cc}`;
}

function Ring({
  size = 230,
  stroke = 13,
  progress,
  color,
  track,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color: string;
  track: string;
  children: React.ReactNode;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

function BigTime({ children, color }: { children: string; color: string }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <Text style={[styles.bigTime, { color }]} adjustsFontSizeToFit numberOfLines={1}>
      {children}
    </Text>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  disabled,
  theme,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  disabled?: boolean;
  theme: Theme;
}) {
  const styles = makeStyles(theme);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          style={[styles.stepperBtn, disabled && styles.stepperBtnDisabled]}
          disabled={disabled || value <= min}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(Math.max(min, value - step));
          }}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value} <Text style={styles.stepperUnit}>{suffix}</Text>
        </Text>
        <Pressable
          style={[styles.stepperBtn, disabled && styles.stepperBtnDisabled]}
          disabled={disabled || value >= max}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(Math.min(max, value + step));
          }}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ControlBtn({
  label,
  primary,
  onPress,
  style,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      style={[styles.controlBtn, primary ? styles.controlBtnPrimary : styles.controlBtnGhost, style]}
      onPress={onPress}
    >
      <Text style={[styles.controlBtnText, { color: primary ? theme.onPrimary : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Pomodoro({ theme }: { theme: Theme }) {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(workMin * 60);
  const [finished, setFinished] = useState(0);
  const styles = makeStyles(theme);

  const adjustDuration = (w: number, b: number) => {
    setWorkMin(w);
    setBreakMin(b);
    if (!running) setRemaining(25 * 60);
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (mode === 'work') {
      setMode('break');
      setRemaining(breakMin * 60);
      setFinished((c) => c + 1);
    } else {
      setMode('work');
      setRemaining(workMin * 60);
    }
  }, [remaining, running, mode, breakMin, workMin]);

  const total = mode === 'work' ? workMin * 60 : breakMin * 60;
  const disabledSteppers = running;

  return (
    <View style={styles.toolBody}>
      <Ring
        progress={remaining / total}
        color={mode === 'work' ? theme.primary : theme.warn}
        track={theme.cardAlt}
      >
        <View style={styles.ringCenter}>
          <Text style={styles.modeLabel}>{mode === 'work' ? 'FOCAR' : 'PAUSA'}</Text>
          <BigTime color={theme.text}>{mmss(remaining)}</BigTime>
          {finished > 0 && <Text style={styles.cycleText}>{finished} pomodoros feitos</Text>}
        </View>
      </Ring>
      <View style={styles.controlRow}>
        <ControlBtn
          label={running ? 'Pausar' : 'Iniciar'}
          primary
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setRunning((r) => !r);
          }}
        />
        <ControlBtn
          label="Reiniciar"
          onPress={() => {
            setRunning(false);
            setMode('work');
            setRemaining(workMin * 60);
          }}
        />
      </View>
      <View style={styles.stepperWrap}>
        <Stepper
          label="Foco"
          value={workMin}
          onChange={(w) => adjustDuration(w, breakMin)}
          min={5}
          max={60}
          step={5}
          suffix="min"
          disabled={disabledSteppers}
          theme={theme}
        />
        <Stepper
          label="Pausa"
          value={breakMin}
          onChange={(b) => adjustDuration(workMin, b)}
          min={1}
          max={30}
          step={1}
          suffix="min"
          disabled={disabledSteppers}
          theme={theme}
        />
      </View>
    </View>
  );
}

function TempTimer({ theme }: { theme: Theme }) {
  const [minutes, setMinutes] = useState(5);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [finished, setFinished] = useState(false);
  const styles = makeStyles(theme);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      if (!finished) {
        setFinished(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('O tempo acabou!', 'O temporizador terminou. Boa!');
      }
    }
  }, [remaining, running, finished]);

  const changeMinutes = (m: number) => {
    setMinutes(m);
    setRemaining(m * 60);
    setFinished(false);
  };

  const presets = [1, 3, 5, 10, 15, 25];

  return (
    <View style={styles.toolBody}>
      <Ring progress={(minutes * 60 - remaining) / (minutes * 60)} color={theme.primary} track={theme.cardAlt}>
        <View style={styles.ringCenter}>
          <Text style={styles.modeLabel}>TEMPORIZADOR</Text>
          <BigTime color={theme.text}>{mmss(remaining)}</BigTime>
        </View>
      </Ring>
      {!running && (
        <View style={styles.chipRow}>
          {presets.map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, minutes === m && styles.chipActive]}
              onPress={() => changeMinutes(m)}
            >
              <Text style={[styles.chipText, minutes === m && styles.chipTextActive]}>{m}′</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.stepperWrap}>
        <Stepper
          label="Duração"
          value={minutes}
          onChange={changeMinutes}
          min={1}
          max={120}
          step={1}
          suffix="min"
          disabled={running}
          theme={theme}
        />
      </View>
      <View style={styles.controlRow}>
        <ControlBtn
          label={running ? 'Pausar' : 'Iniciar'}
          primary
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            if (remaining === 0) setRemaining(minutes * 60);
            setRunning((r) => !r);
          }}
        />
        <ControlBtn
          label="Reiniciar"
          onPress={() => {
            setRunning(false);
            setFinished(false);
            setRemaining(minutes * 60);
          }}
        />
      </View>
    </View>
  );
}

function Stopwatch({ theme }: { theme: Theme }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const accRef = useRef(0);
  const styles = makeStyles(theme);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(accRef.current + (Date.now() - startRef.current)), 100);
    return () => {
      clearInterval(id);
      accRef.current += Date.now() - startRef.current;
    };
  }, [running]);

  return (
    <View style={styles.toolBody}>
      <Ring progress={0} color={theme.primary} track="transparent">
        <View style={styles.ringCenter}>
          <Text style={styles.modeLabel}>CRONÓMETRO</Text>
          <BigTime color={theme.text}>{hms(elapsed)}</BigTime>
        </View>
      </Ring>
      <View style={styles.controlRow}>
        <ControlBtn
          label={running ? 'Pausar' : 'Iniciar'}
          primary
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setRunning((r) => !r);
          }}
        />
        {running && (
          <ControlBtn
            label="Volta"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setLaps((l) => [...l, elapsed]);
            }}
          />
        )}
        <ControlBtn
          label="Reiniciar"
          onPress={() => {
            setRunning(false);
            accRef.current = 0;
            setElapsed(0);
            setLaps([]);
          }}
        />
      </View>
      {laps.length > 0 && (
        <View style={styles.lapCard}>
          {laps
            .slice()
            .reverse()
            .map((lap, i) => {
              const num = laps.length - i;
              const prev = num < laps.length ? laps[num] : 0;
              return (
                <View key={num} style={styles.lapRow}>
                  <Text style={styles.lapNum}>Volta {num}</Text>
                  <Text style={styles.lapTime}>{hms(lap)}</Text>
                  <Text style={styles.lapDelta}>+{hms(lap - prev)}</Text>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );
}

function Breathing({ theme }: { theme: Theme }) {
  type Pattern = { name: string; phases: { label: string; sec: number }[] };
  const PATTERNS: Record<string, Pattern> = {
    '478': {
      name: '4-7-8 (acalmar)',
      phases: [
        { label: 'INSPIRA', sec: 4 },
        { label: 'SEGURA', sec: 7 },
        { label: 'EXPIRA', sec: 8 },
      ],
    },
    '444': {
      name: '4-4-4 (coerência)',
      phases: [
        { label: 'INSPIRA', sec: 4 },
        { label: 'SEGURA', sec: 4 },
        { label: 'EXPIRA', sec: 4 },
      ],
    },
  };
  const [patternKey, setPatternKey] = useState<'478' | '444'>('478');
  const [phase, setPhase] = useState(0);
  const [remaining, setRemaining] = useState(PATTERNS['478'].phases[0].sec);
  const [running, setRunning] = useState(false);
  const styles = makeStyles(theme);
  const pattern = PATTERNS[patternKey];

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    const next = (phase + 1) % pattern.phases.length;
    setPhase(next);
    setRemaining(pattern.phases[next].sec);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [remaining, running, phase, pattern]);

  const start = (key: '478' | '444') => {
    setPatternKey(key);
    setPhase(0);
    setRemaining(PATTERNS[key].phases[0].sec);
    setRunning(true);
  };

  const current = pattern.phases[phase];

  return (
    <View style={styles.toolBody}>
      <Ring
        progress={remaining / current.sec}
        color={phase === 2 ? theme.danger : theme.primary}
        track={theme.cardAlt}
      >
        <View style={styles.ringCenter}>
          <Text style={styles.modeLabel}>{current.label}</Text>
          <BigTime color={phase === 2 ? theme.danger : theme.text}>{String(remaining)}</BigTime>
          <Text style={styles.cycleText}>{pattern.name}</Text>
        </View>
      </Ring>
      {!running && (
        <View style={styles.chipRow}>
          {Object.keys(PATTERNS).map((k) => (
            <Pressable
              key={k}
              style={[styles.chip, patternKey === k && styles.chipActive]}
              onPress={() => start(k as '478' | '444')}
            >
              <Text style={[styles.chipText, patternKey === k && styles.chipTextActive]}>
                {PATTERNS[k].name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.controlRow}>
        <ControlBtn
          label={running ? 'Parar' : 'Iniciar'}
          primary
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setRunning((r) => !r);
          }}
        />
        <ControlBtn
          label="Reiniciar"
          onPress={() => {
            setRunning(false);
            setPhase(0);
            setRemaining(pattern.phases[0].sec);
          }}
        />
      </View>
      {running && (
        <Text style={styles.cycleText}>Segue o ritmo: inspira pela nariz, solta devagar.</Text>
      )}
    </View>
  );
}

export default function ToolsScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [tool, setTool] = useState<ToolKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTool(null);
    }, [])
  );

  if (tool != null) {
    const info = TOOLS.find((t) => t.key === tool);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={() => setTool(null)} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Todas as ferramentas</Text>
        </Pressable>
        <View style={styles.toolHeader}>
          <Logo size={16} />
          <Text style={styles.toolTitle}>{info?.title}</Text>
        </View>
        <View style={styles.toolCard} key={tool}>
          {tool === 'pomodoro' && <Pomodoro theme={theme} />}
          {tool === 'timer' && <TempTimer theme={theme} />}
          {tool === 'stopwatch' && <Stopwatch theme={theme} />}
          {tool === 'breath' && <Breathing theme={theme} />}
        </View>
        <MottoFooter />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Utilitários prontos a usar. Escolhe uma ferramenta.</Text>
      <View style={styles.grid}>
        {TOOLS.map((t) => (
          <Pressable key={t.key} style={styles.gridCard} onPress={() => setTool(t.key)}>
            <Text style={styles.gridEmoji}>{t.emoji}</Text>
            <Text style={styles.gridTitle}>{t.title}</Text>
            <Text style={styles.gridDesc}>{t.desc}</Text>
          </Pressable>
        ))}
      </View>
      <MottoFooter />
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    intro: { color: theme.subtext, fontSize: 13 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridCard: {
      flex: 1,
      minWidth: 140,
      maxWidth: '48%',
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    gridEmoji: { fontSize: 30 },
    gridTitle: { color: theme.text, fontSize: 16, fontWeight: '800', fontFamily: FONT.extrabold, marginTop: 10 },
    gridDesc: { color: theme.subtext, fontSize: 12, marginTop: 4, lineHeight: 16 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    backArrow: { color: theme.primary, fontSize: 26, marginTop: -4 },
    backText: { color: theme.primary, fontSize: 14, fontWeight: '700', fontFamily: FONT.bold },
    toolHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    toolTitle: { color: theme.text, fontSize: 26, fontWeight: '800', fontFamily: FONT.extrabold },
    toolCard: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      alignItems: 'center',
    },
    toolBody: { alignItems: 'center', alignSelf: 'stretch' },
    ringCenter: { alignItems: 'center' },
    modeLabel: {
      color: theme.subtext,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: FONT.semibold,
      letterSpacing: 2,
      marginBottom: 4,
    },
    bigTime: {
      fontSize: 46,
      fontWeight: '800',
      fontFamily: FONT.extrabold,
      fontVariant: ['tabular-nums'],
    },
    cycleText: { color: theme.subtext, fontSize: 12, marginTop: 6 },
    controlRow: { flexDirection: 'row', gap: 10, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' },
    controlBtn: {
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 30,
      minWidth: 116,
      alignItems: 'center',
    },
    controlBtnPrimary: { backgroundColor: theme.primary },
    controlBtnGhost: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.border },
    controlBtnText: { fontSize: 15, fontWeight: '700', fontFamily: FONT.bold },
    stepperWrap: { flexDirection: 'row', gap: 12, marginTop: 18, alignSelf: 'stretch' },
    stepper: {
      flex: 1,
      backgroundColor: theme.cardAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      alignItems: 'center',
    },
    stepperLabel: { color: theme.subtext, fontSize: 12, fontWeight: '700', fontFamily: FONT.semibold },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    stepperBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnDisabled: { opacity: 0.3 },
    stepperBtnText: { color: theme.onPrimary, fontSize: 20, fontWeight: '800' },
    stepperValue: { color: theme.text, fontSize: 16, fontWeight: '800', fontFamily: FONT.extrabold },
    stepperUnit: { color: theme.subtext, fontSize: 12, fontWeight: '600' },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { color: theme.subtext, fontSize: 14, fontWeight: '700', fontFamily: FONT.bold },
    chipTextActive: { color: theme.onPrimary },
    lapCard: { marginTop: 18, alignSelf: 'stretch', gap: 4 },
    lapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.cardAlt,
      borderRadius: 10,
    },
    lapNum: { color: theme.subtext, fontSize: 13, fontFamily: FONT.semibold },
    lapTime: { color: theme.text, fontSize: 15, fontWeight: '800', fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
    lapDelta: { color: theme.subtext, fontSize: 12, fontVariant: ['tabular-nums'] },
  });