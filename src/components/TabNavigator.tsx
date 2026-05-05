import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../theme';

export interface TabItem {
  key: string;
  title: string;
}

interface TabNavigatorProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  style?: StyleProp<ViewStyle>; 
}

const TabNavigator: React.FC<TabNavigatorProps> = ({
  tabs,
  activeTab,
  onTabChange,
  style,
}) => {
  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive, style]}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.foreground,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.foreground,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.foreground,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});

export default TabNavigator;
