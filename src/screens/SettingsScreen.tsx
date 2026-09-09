import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation';
import { testNotification } from '../lib/notifications';
import { resetAllData, clearHistory, emitAppReset } from '../lib/appReset';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { theme, isDark, setDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setBusy(false);
    }, [])
  );

  const onTestNotification = async () => {
    const ok = await testNotification();
    Alert.alert(
      ok ? 'Notificação agendada 🔔' : 'Não disponível no Expo Go',
      ok
        ? 'Já deves recebê-la dentro de momentos.'
        : 'As notificações só funcionam numa development build. No Expo Go a app abre, mas os lembretes ficam desligados. Depois faço-te o build.'
    );
  };

  const confirmReset = (
    title: string,
    message: string,
    action: () => Promise<void>
  ) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim, apagar', style: 'destructive', onPress: async () => { await action(); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌗 Tema</Text>
        <Text style={styles.hint}>Escolhe o aspeto da app.</Text>
        <View style={styles.segRow}>
          {(
            [
              [true, '🌙 Escuro'],
              [false, '☀️ Claro'],
            ] as const
          ).map(([dark, label]) => {
            const active = isDark === dark;
            return (
              <Pressable
                key={label}
                style={[styles.seg, active && styles.segActive]}
                onPress={() => setDark(dark)}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Notificações</Text>
        <Text style={styles.hint}>
          Cada tarefa tem o seu próprio lembrete (se o queres e quanto tempo antes). Vês isso ao
          editar uma tarefa na página Rotina.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onTestNotification}>
          <Text style={styles.primaryButtonText}>Enviar notificação de teste</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Rotina')}>
          <Text style={styles.linkButtonText}>Abrir Rotina →</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧭 Check-in diário</Text>
        <Text style={styles.hint}>
          A tua hora de acordar, nome e foto estão no Perfil. A criatura (nome, cor e loja) está em
          Criatura.
        </Text>
        <View style={styles.linkRow}>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Perfil')}>
            <Text style={styles.linkButtonText}>Abrir Perfil →</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Criatura')}>
            <Text style={styles.linkButtonText}>Abrir Criatura →</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗑️ Dados e recomeço</Text>
        <Text style={styles.hint}>Tudo fica guardado apenas neste telemóvel.</Text>
        <Pressable
          style={[styles.dangerButton, busy && { opacity: 0.5 }]}
          disabled={busy}
          onPress={() =>
            confirmReset(
              'Repor o onboarding',
              'Vão ser apagados o teu perfil, tarefas e criatura. A app volta às perguntas iniciais, como na primeira vez. Continuar?',
              async () => {
                setBusy(true);
                await resetAllData(db);
                emitAppReset();
              }
            )
          }
        >
          <Text style={styles.dangerButtonText}>Repor onboarding (primeira vez)</Text>
        </Pressable>
        <Pressable
          style={[styles.dangerButton, busy && { opacity: 0.5 }]}
          disabled={busy}
          onPress={() =>
            confirmReset(
              'Apagar histórico',
              'Vão ser apagados os treinos, pesagens, sessões de foco e check-ins. O perfil e as tarefas ficam. Continuar?',
              async () => {
                setBusy(true);
                await clearHistory(db);
                setBusy(false);
                Alert.alert('Feito!', 'Histórico apagado.');
              }
            )
          }
        >
          <Text style={styles.dangerButtonText}>Apagar histórico (treinos, peso, foco)</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ Sobre</Text>
        <Text style={styles.hint}>
          Ordo · a tua rotina com o teu cão. Um dia bonito começa com uma manhã guardada.
        </Text>
        <Text style={styles.version}>Versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hint: { color: theme.subtext, fontSize: 12, marginTop: 8, lineHeight: 17 },
    segRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    seg: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.cardAlt,
    },
    segActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    segText: { color: theme.subtext, fontSize: 14, fontWeight: '700' },
    segTextActive: { color: '#FFFFFF' },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    linkRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    linkButton: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      alignSelf: 'flex-start',
      marginTop: 12,
    },
    linkButtonText: { color: theme.primary, fontSize: 13, fontWeight: '700' },
    dangerButton: {
      borderWidth: 1,
      borderColor: 'rgba(228,105,91,0.5)',
      backgroundColor: 'rgba(228,105,91,0.1)',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    dangerButtonText: { color: theme.danger, fontSize: 14, fontWeight: '700' },
    version: { color: theme.subtext, fontSize: 12, marginTop: 8 },
  });