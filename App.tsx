import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet, WalletProvider } from './src/context/WalletContext';
import { AboutScreen } from './src/screens/AboutScreen';
import { BillsSalaryScreen } from './src/screens/BillsSalaryScreen';
import { CreditCardLedgerScreen } from './src/screens/CreditCardLedgerScreen';
import { FriendsLedgerScreen } from './src/screens/FriendsLedgerScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { WelcomeOnboardingScreen } from './src/screens/WelcomeOnboardingScreen';
import { StorageService } from './src/services/storage';
import { colors } from './src/theme/colors';
import { getDaysUntil, isDueTodayOrPast } from './src/utils/formatters';

type RootTabParamList = {
  Home: undefined;
  'Bills & Salary': undefined;
  'Credit Card': undefined;
  'Give & Take': undefined;
  Profile: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { bills, friendEntries } = useWallet();

  const billsBadge = bills.filter(
    (b) => !b.isPaid && isDueTodayOrPast(b.dueDate)
  ).length;

  const friendsBadge = friendEntries.filter(
    (e) => !e.isSettled && getDaysUntil(e.recoveryDate).isPast
  ).length;

  // Safe bottom padding for both modern gesture navigation and 3-button hardware/soft keys
  const bottomInset =
    insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 8 : 12;
  const barHeight = 58 + bottomInset;

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          flexDirection: 'row',
          justifyContent: 'space-around',
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          textAlign: 'center',
          width: '100%',
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 2,
        },
        tabBarButton: (props) => {
          const {
            children,
            style,
            onPress,
            onLongPress,
            accessibilityState,
            accessibilityLabel,
            testID,
          } = props;
          return (
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityState={accessibilityState}
              accessibilityLabel={accessibilityLabel}
              testID={testID}
              android_ripple={{
                color: colors.brandSoft,
                borderless: true,
                radius: 30,
              }}
              style={({ pressed }) => [
                style,
                {
                  opacity: pressed ? 0.75 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              {children}
            </Pressable>
          );
        },
        tabBarIconStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        },
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap =
            'account-balance-wallet';
          let badgeCount = 0;

          if (route.name === 'Home') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'Bills & Salary') {
            iconName = 'receipt-long';
            badgeCount = billsBadge;
          } else if (route.name === 'Credit Card') {
            iconName = 'credit-card';
          } else if (route.name === 'Give & Take') {
            iconName = 'group';
            badgeCount = friendsBadge;
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return (
            <View
              style={[styles.tabIconPill, focused && styles.tabIconPillActive]}
            >
              <MaterialIcons
                name={iconName}
                size={20}
                color={focused ? colors.brand : colors.subtle}
              />
              {badgeCount > 0 && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{badgeCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Wallet' }}
      />
      <Tab.Screen
        name="Bills & Salary"
        component={BillsSalaryScreen}
        options={{ tabBarLabel: 'Bills' }}
      />
      <Tab.Screen
        name="Credit Card"
        component={CreditCardLedgerScreen}
        options={{ tabBarLabel: 'Card' }}
      />
      <Tab.Screen
        name="Give & Take"
        component={FriendsLedgerScreen}
        options={{ tabBarLabel: 'Friends' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const {
    isLoaded,
    isUnlocked,
    unlockApp,
    lockApp,
    securitySettings,
    isAutoLockSuppressed,
  } = useWallet();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const appStateRef = useRef<string>('active');
  const navigationRef = useNavigationContainerRef<RootTabParamList>();
  const pendingNotificationTabRef = useRef<
    'Bills & Salary' | 'Give & Take' | null
  >(null);

  useEffect(() => {
    (async () => {
      const onboarded = await StorageService.getIsOnboarded();
      setIsOnboarded(onboarded);
    })();
  }, []);

  const flushPendingNotificationRoute = useCallback(() => {
    const targetTab = pendingNotificationTabRef.current;
    if (!targetTab || !isUnlocked || !navigationRef.isReady()) return;

    pendingNotificationTabRef.current = null;
    navigationRef.navigate(targetTab);
    if (Platform.OS !== 'web') {
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // Ignore if unavailable
      }
    }
  }, [isUnlocked, navigationRef]);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null | undefined) => {
      if (!response) return;
      const dataType = response.notification?.request?.content?.data?.type;
      let targetTab: 'Bills & Salary' | 'Give & Take' | null = null;
      if (dataType === 'bill' || dataType === 'salary') {
        targetTab = 'Bills & Salary';
      } else if (dataType === 'friend_recovery') {
        targetTab = 'Give & Take';
      }
      if (!targetTab) return;

      pendingNotificationTabRef.current = targetTab;
      flushPendingNotificationRoute();
    },
    [flushPendingNotificationRoute]
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    try {
      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse) {
        handleNotificationResponse(lastResponse);
      }
    } catch {
      // Ignore on unsupported runtimes
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  useEffect(() => {
    flushPendingNotificationRoute();
  }, [isUnlocked, flushPendingNotificationRoute]);

  // Lock the app on background and shield screen on inactive/background (respecting system biometric prompts)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const isLockEnabled =
        securitySettings.isPinEnabled || securitySettings.biometricsEnabled;
      const suppressed = isAutoLockSuppressed();

      const goingInactive =
        nextState === 'background' || nextState === 'inactive';
      setIsBackgrounded(goingInactive && !suppressed);

      if (
        isLockEnabled &&
        nextState === 'background' &&
        !suppressed &&
        appStateRef.current !== 'background'
      ) {
        lockApp();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [securitySettings, lockApp, isAutoLockSuppressed]);

  const handleCompleteOnboarding = async () => {
    await StorageService.setOnboarded();
    setIsOnboarded(true);
  };

  // 1. Loading state while reading AsyncStorage (fast native hydrator)
  if (!isLoaded || isOnboarded === null) {
    return (
      <View style={[styles.appContainer, styles.centeredLoading]}>
        <Image
          source={require('./assets/logos/logo_mark_symbol_1024x1024.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 2. First-time account creation & onboarding
  if (!isOnboarded) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="dark" />
        <WelcomeOnboardingScreen onComplete={handleCompleteOnboarding} />
      </View>
    );
  }

  // 3. PIN / Biometric Lock Screen (if lock is enabled and app is locked)
  const isLockEnabled =
    securitySettings.isPinEnabled || securitySettings.biometricsEnabled;
  if (isLockEnabled && !isUnlocked) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="dark" />
        <PinLockScreen onSuccess={unlockApp} />
        {/* Privacy Shield when minimized in multitasking carousel */}
        {isBackgrounded && (
          <View style={styles.privacyShield}>
            <Image
              source={require('./assets/logos/logo_mark_symbol_1024x1024.png')}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <Text style={styles.privacyShieldText}>
              Pocket Wallet is Locked
            </Text>
          </View>
        )}
      </View>
    );
  }

  // 4. Main Authenticated Application
  return (
    <View style={styles.appContainer}>
      <NavigationContainer
        ref={navigationRef}
        onReady={flushPendingNotificationRoute}
      >
        <StatusBar style="dark" />
        <MainTabs />
      </NavigationContainer>

      {/* Multitasking Privacy Shield: Obscures financial balances in OS app switcher */}
      {isBackgrounded && isLockEnabled && (
        <View style={styles.privacyShield}>
          <Image
            source={require('./assets/logos/logo_mark_symbol_1024x1024.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.privacyShieldText}>Pocket Wallet is Locked</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  privacyShield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  privacyShieldText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  centeredLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 72,
    height: 72,
  },
  tabIconPill: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPillActive: {
    backgroundColor: colors.brandSoft,
  },
  badgePill: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.neg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
