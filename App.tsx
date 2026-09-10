import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import {
  useFonts,
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { PressableScale as Pressable } from './src/components/PressableScale';
import { migrateDb } from './src/db/migrations';
import { ThemeProvider, useTheme } from './src/theme';
import { getProfile } from './src/db/profile';
import { getCreature } from './src/db/creature';
import type { RootTabParamList } from './src/navigation';
import { onAppReset } from './src/lib/appReset';
import { onCreatureName } from './src/lib/creatureEvents';
import BrandHeader from './src/components/BrandHeader';
import { FONT } from './src/lib/fonts';
import TodayScreen from './src/screens/TodayScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import CreatureScreen from './src/screens/CreatureScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TrainingsScreen from './src/screens/TrainingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AtividadesScreen from './src/screens/AtividadesScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={styles.tabIcon}>{emoji}</Text>;
}

function HomeTabIcon() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -8,
        backgroundColor: theme.primary,
        borderWidth: 3,
        borderColor: theme.primaryDark,
      }}
    >
      <Text style={styles.homeIcon}>🏠</Text>
    </View>
  );
}

function HeaderGear() {
  const { theme } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('Config')} hitSlop={8}>
      <View style={styles.headerGear}>
        <Text style={[styles.headerGearIcon, { color: theme.subtext }]}>⚙️</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
  homeIcon: {
    fontSize: 22,
  },
  headerGear: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerGearIcon: {
    fontSize: 19,
    opacity: 0.9,
  },
  boot: {
    flex: 1,
  },
  crash: {
    backgroundColor: '#1a0f0f',
    padding: 24,
    justifyContent: 'center',
  },
  crashTitle: {
    color: '#ffb4b4',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  crashText: {
    color: '#8ca894',
    fontSize: 13,
  },
});

function Navigator() {
  const db = useSQLiteContext();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const [creatureName, setCreatureName] = React.useState('Ordo');

  React.useEffect(() => {
    let alive = true;
    getCreature(db).then((c) => {
      if (alive) setCreatureName(c.name);
    });
    const off = onCreatureName(setCreatureName);
    return () => {
      alive = false;
      off();
    };
  }, [db]);

  const navTheme = React.useMemo(
    () => ({
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: theme.bg,
        card: theme.card,
        text: theme.text,
        border: theme.border,
        primary: theme.primary,
      },
    }),
    [baseTheme, theme]
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Hoje"
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTitleStyle: {
            color: theme.text,
            fontFamily: FONT.bold,
            fontSize: 18,
          },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerRight: () => <HeaderGear />,
          tabBarStyle: {
            backgroundColor: theme.card,
            height: 56 + insets.bottom,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 6),
            borderTopWidth: 0,
          },
          tabBarItemStyle: { paddingVertical: 2 },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.subtext,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        }}
      >
        <Tab.Screen
          name="Atividades"
          component={AtividadesScreen}
          options={{
            title: 'Atividades',
            headerTitle: () => <BrandHeader title="Atividades" />,
            tabBarIcon: () => <TabIcon emoji="📊" />,
          }}
        />
        <Tab.Screen
          name="Treinos"
          component={TrainingsScreen}
          options={{
            title: 'Treinos',
            headerTitle: () => <BrandHeader title="Treinos" />,
            tabBarIcon: () => <TabIcon emoji="🏋️" />,
          }}
        />
        <Tab.Screen
          name="Rotina"
          component={RoutineScreen}
          options={{
            title: 'Rotina',
            headerTitle: () => <BrandHeader title="Rotina" />,
            tabBarIcon: () => <TabIcon emoji="📋" />,
          }}
        />
        <Tab.Screen
          name="Hoje"
          component={TodayScreen}
          options={{
            title: 'Hoje',
            headerTitle: () => <BrandHeader title="Hoje" />,
            tabBarIcon: () => <HomeTabIcon />,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '900' },
          }}
        />
        <Tab.Screen
          name="Criatura"
          component={CreatureScreen}
          options={{
            title: creatureName,
            headerTitle: () => <BrandHeader title={creatureName} />,
            tabBarLabel: creatureName,
            tabBarIcon: () => <TabIcon emoji="🐶" />,
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{
            title: 'Perfil',
            headerTitle: () => <BrandHeader title="Perfil" />,
            tabBarIcon: () => <TabIcon emoji="👤" />,
          }}
        />
        <Tab.Screen
          name="Ferramentas"
          component={ToolsScreen}
          options={{
            title: 'Ferramentas',
            headerTitle: () => <BrandHeader title="Ferramentas" />,
            tabBarIcon: () => <TabIcon emoji="🧰" />,
          }}
        />
        <Tab.Screen
          name="Config"
          component={SettingsScreen}
          options={{
            title: 'Defin.',
            headerTitle: () => <BrandHeader title="Definições" />,
            tabBarItemStyle: { display: 'none' },
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function Root() {
  const db = useSQLiteContext();
  const { theme, isDark } = useTheme();
  const [checked, setChecked] = React.useState(false);
  const [hasProfile, setHasProfile] = React.useState(false);

  React.useEffect(() => {
    getProfile(db).then((profile) => {
      setHasProfile(profile != null);
      setChecked(true);
    });
    return onAppReset(() => setHasProfile(false));
  }, [db]);

  if (!checked) {
    return <View style={[styles.boot, { backgroundColor: theme.bg }]} />;
  }

  if (!hasProfile) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onDone={() => setHasProfile(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navigator />
    </>
  );
}

export default function App() {
  const [, fontError] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  React.useEffect(() => {
    if (fontError) {
      console.warn('Falha ao carregar fontes Sora, a usar fonte do sistema:', fontError);
    }
  }, [fontError]);

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="ordo.db" onInit={migrateDb}>
        <ThemeProvider>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={[styles.boot, styles.crash]}>
          <Text style={styles.crashTitle}>Algo correu mal</Text>
          <Text style={styles.crashText}>{String(this.state.error?.message || this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}