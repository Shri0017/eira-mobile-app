import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Fontisto from 'react-native-vector-icons/Fontisto';
import {HomeScreen} from '../screens/Home';
import {SitelistScreen} from '../screens/Sitelist';
import {AnalyticsScreen} from '../screens/Analytics';
import {MonitoringScreen} from '../screens/Monitoring';
import {spacing, fontSize, fontWeight, colors} from '../theme';
import Entypo from 'react-native-vector-icons/Entypo';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export type BottomTabParamList = {
  Home: undefined;
  Satellite: undefined;
  Analytics: undefined;
  Monitoring: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.background,
        },
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.background,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm + insets.bottom,
          height: 65 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({color, size}) => (
            <Fontisto name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Satellite"
        component={SitelistScreen}
        options={{
          tabBarLabel: 'Sitelist',
          tabBarIcon: ({color, size}) => (
            <Fontisto
              name="map-marker-alt"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({color, size}) => (
            <Entypo name="bar-graph" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Monitoring"
        component={MonitoringScreen}
        options={{
          tabBarLabel: 'Monitoring',
          tabBarIcon: ({color, size}) => (
            <Fontisto name="table-2" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
