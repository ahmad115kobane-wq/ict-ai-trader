// src/navigation/AppNavigator.tsx
// نظام التنقل الرئيسي للتطبيق

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Pressable } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors, fontSizes, spacing, borderRadius } from '../theme';

// الشاشات
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import TradesScreen from '../screens/TradesScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import FullChartScreen from '../screens/FullChartScreen';
import EconomicCalendarScreen from '../screens/EconomicCalendarScreen';

// أنواع المسارات
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Trades: undefined;
  Subscription: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  FullChart: undefined;
  EconomicCalendar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// شاشة التحميل
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <View style={styles.logoContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>ICT</Text>
      </View>
      <Text style={styles.appName}>ICT AI Trader</Text>
    </View>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

// مسارات المصادقة
const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      animation: 'fade',
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// التبويبات الرئيسية
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Platform.OS === 'ios' ? 28 : 16,
        backgroundColor: colors.card,
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 76 : 64,
        paddingBottom: Platform.OS === 'ios' ? 16 : 10,
        paddingTop: 10,
        paddingHorizontal: 12,
        borderRadius: 22,
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
        borderRadius: 16,
        flex: 1,
      },
      tabBarButton: (props) => {
        const { accessibilityState, children, onPress, onLongPress } = props;
        const focused = accessibilityState?.selected;

        return (
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                marginHorizontal: 4,
                borderRadius: 16,
                backgroundColor: focused ? colors.primary + '22' : 'transparent',
                borderWidth: focused ? 1 : 0,
                borderColor: focused ? colors.primary + '55' : 'transparent',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {children}
          </Pressable>
        );
      },
      tabBarIcon: ({ focused, color }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Trades') {
          iconName = focused ? 'analytics' : 'analytics-outline';
        } else if (route.name === 'Subscription') {
          iconName = focused ? 'diamond' : 'diamond-outline';
        } else {
          iconName = 'help-outline';
        }

        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
          </View>
        );
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{ tabBarLabel: 'الرئيسية' }}
    />
    <Tab.Screen
      name="Trades"
      component={TradesScreen}
      options={{ tabBarLabel: 'السجلات' }}
    />
    <Tab.Screen
      name="Subscription"
      component={SubscriptionScreen}
      options={{ tabBarLabel: 'الاشتراكات' }}
    />
  </Tab.Navigator>
);

// المتصفح الرئيسي
const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="FullChart" 
              component={FullChartScreen}
              options={{
                animation: 'slide_from_bottom',
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen 
              name="EconomicCalendar" 
              component={EconomicCalendarScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  appName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },

});

export default AppNavigator;
