import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { migrateDb } from './src/db/migrations';
import { ThemeProvider, useTheme } from './src/theme';
import { getProfile } from './src/db/profile';
import { getCreature } from './src/db/creature';
import type { RootTabParamList } from './src/navigation';
import { onAppReset } from './src/lib/appReset';
import { onCreatureName } from './src/lib/creatureEvents';
import TodayScreen from './src/screens/TodayScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import CreatureScreen from './src/screens/CreatureScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TrainingsScreen from './src/screens/TrainingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

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

function SettingsHeaderButton() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => navigation.navigate('Config')}
      hitSlop={10}
      style={{
        marginRight: 16,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.cardAlt,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>⚙️</Text>
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
  boot: {
    flex: 1,
  },
});

function Navigator() {
  const db = useSQLiteContext();
  const { theme, isDark } = useTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const [creatureName, setCreatureName] = React.useState('Criatura');

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
          headerTitleStyle: { color: theme.text, fontWeight: '800' },
          headerShadowVisible: false,
          headerRight: () => <SettingsHeaderButton />,
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.subtext,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tab.Screen
          name="Rotina"
          component={RoutineScreen}
          options={{ title: 'Rotina', tabBarIcon: () => <TabIcon emoji="📋" /> }}
        />
        <Tab.Screen
          name="Treinos"
          component={TrainingsScreen}
          options={{ title: 'Treinos', tabBarIcon: () => <TabIcon emoji="🏋️" /> }}
        />
        <Tab.Screen
          name="Hoje"
          component={TodayScreen}
          options={{
            title: 'Hoje',
            tabBarIcon: () => <HomeTabIcon />,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '900' },
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{ title: 'Perfil', tabBarIcon: () => <TabIcon emoji="👤" /> }}
        />
        <Tab.Screen
          name="Criatura"
          component={CreatureScreen}
          options={{ title: creatureName, tabBarLabel: creatureName, tabBarIcon: () => <TabIcon emoji="🐶" /> }}
        />
        <Tab.Screen
          name="Config"
          component={SettingsScreen}
          options={{
            title: 'Config',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
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
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="ordo.db" onInit={migrateDb}>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}