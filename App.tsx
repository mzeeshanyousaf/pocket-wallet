import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet, WalletProvider } from './src/context/WalletContext';
import { AboutScreen } from './src/screens/AboutScreen';
import { BillsSalaryScreen } from './src/screens/BillsSalaryScreen';
import { FriendsLedgerScreen } from './src/screens/FriendsLedgerScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { WelcomeOnboardingScreen } from './src/screens/WelcomeOnboardingScreen';
import { StorageService } from './src/services/storage';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

function MainTabs({ navigation }: { navigation?: any }) {
  const insets = useSafeAreaInsets();
  const { bills, friendEntries } = useWallet();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const billsBadge = bills.filter((b) => {
    if (b.isPaid) return false;
    const due = new Date(b.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() <= today.getTime();
  }).length;

  const friendsBadge = friendEntries.filter((e) => {
    if (e.isSettled) return false;
    const rec = new Date(e.recoveryDate);
    rec.setHours(0, 0, 0, 0);
    return rec.getTime() < today.getTime();
  }).length;

  // Safe bottom padding for both modern gesture navigation and 3-button hardware/soft keys
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 12);
  const barHeight = 58 + bottomInset;

  return (
    <Tab.Navigator
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
        tabBarActiveTintColor: colors.ink,
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
        tabBarIconStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        },
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap = 'account-balance-wallet';
          let badgeCount = 0;

          if (route.name === 'Home') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'Bills & Salary') {
            iconName = 'receipt-long';
            badgeCount = billsBadge;
          } else if (route.name === 'Give & Take') {
            iconName = 'group';
            badgeCount = friendsBadge;
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return (
            <View style={[styles.tabIconPill, focused && styles.tabIconPillActive]}>
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

/**
 * Branded Welcome Splash Screen displayed on app startup / reload
 * Uses native Modal with statusBarTranslucent so it renders directly on top of
 * any native screen hierarchies on both Android and iOS without zIndex conflicts.
 */
function WelcomeSplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, onFinish]);

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <Animated.View style={[styles.welcomeModalOverlay, { opacity: fadeAnim }]}>
        <StatusBar style="light" />
        <Image
          source={require('./assets/splash.png')}
          style={styles.welcomeSplashImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.skipWelcomeBtn}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.skipPill}>
            <MaterialIcons name="arrow-forward" size={14} color="#8E9AA6" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function AppContent() {
  const { isLoaded, isUnlocked, unlockApp, securitySettings } = useWallet();
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const onboarded = await StorageService.getIsOnboarded();
      setIsOnboarded(onboarded);
    })();
  }, []);

  const handleCompleteOnboarding = async () => {
    await StorageService.setOnboarded();
    setIsOnboarded(true);
  };

  // 1. Initial splash branding
  if (showWelcomeSplash) {
    return (
      <View style={styles.appContainer}>
        <WelcomeSplashScreen onFinish={() => setShowWelcomeSplash(false)} />
      </View>
    );
  }

  // 2. Loading state while reading AsyncStorage
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

  // 3. First-time account creation & onboarding
  if (!isOnboarded) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="dark" />
        <WelcomeOnboardingScreen onComplete={handleCompleteOnboarding} />
      </View>
    );
  }

  // 4. PIN Lock Screen (if PIN is enabled and app is locked)
  if (securitySettings.isPinEnabled && securitySettings.pin && !isUnlocked) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="dark" />
        <PinLockScreen onSuccess={unlockApp} />
      </View>
    );
  }

  // 5. Main Authenticated Application
  return (
    <View style={styles.appContainer}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <MainTabs />
      </NavigationContainer>
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
  centeredLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 72,
    height: 72,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
    flex: 1,
  },
  tabBarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPill: {
    width: 48,
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
  welcomeModalOverlay: {
    flex: 1,
    backgroundColor: '#070A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSplashImage: {
    width: '100%',
    height: '100%',
  },
  skipWelcomeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    right: 20,
    zIndex: 10,
  },
  skipPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
