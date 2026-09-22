import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TerminalScreen } from './src/screens/TerminalScreen';
import { CoursesScreen } from './src/screens/CoursesScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { ToolsScreen } from './src/screens/ToolsScreen';
import { AuthProvider } from './src/context/AuthContext';
import { I18nProvider, useI18n } from './src/i18n/I18nContext';
import { colors } from './src/theme';
import { registerPushToken } from './src/notifications';
import { OnboardingOverlay } from './src/components/OnboardingOverlay';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { hasSeenOnboarding, markOnboardingSeen } from './src/onboarding';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconActive]}>
      <Text style={[styles.iconText, focused && styles.iconTextActive]}>{label}</Text>
    </View>
  );
}

function RootTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void registerPushToken();
  }, []);

  useEffect(() => {
    (async () => {
      const seen = await hasSeenOnboarding();
      if (!seen) setShowOnboarding(true);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // منع ترجمة كروم التلقائية لرموز مثل EURUSD و 15m
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
    document.body?.classList.add('notranslate');
  }, []);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            ...styles.tabBar,
            height: 52 + bottomPad,
            paddingBottom: bottomPad,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={TerminalScreen}
          options={{
            title: t.tabHome,
            tabBarLabel: t.tabHome,
            tabBarIcon: ({ focused }) => <TabIcon label="FX" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            title: t.tabTools,
            tabBarLabel: t.tabTools,
            tabBarIcon: ({ focused }) => <TabIcon label="SC" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Courses"
          component={CoursesScreen}
          options={{
            title: t.tabAcademy,
            tabBarLabel: t.tabAcademy,
            tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{
            title: t.tabAccount,
            tabBarLabel: t.tabAccount,
            tabBarIcon: ({ focused }) => <TabIcon label="ME" focused={focused} />,
          }}
        />
      </Tab.Navigator>
      <OnboardingOverlay
        visible={showOnboarding}
        onDone={() => {
          setShowOnboarding(false);
          void markOnboardingSeen();
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" />
        <AppErrorBoundary>
          <AuthProvider>
            <NavigationContainer theme={navTheme}>
              <RootTabs />
            </NavigationContainer>
          </AuthProvider>
        </AppErrorBoundary>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '700' },
  iconWrap: {
    minWidth: 28,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconActive: { backgroundColor: colors.accentSoft },
  iconText: { color: colors.textDim, fontSize: 10, fontWeight: '800' },
  iconTextActive: { color: colors.accent },
});
