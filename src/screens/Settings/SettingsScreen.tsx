import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import {useAuth} from '../../context';

interface SettingItemProps {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  value,
  onPress,
  showChevron = true,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.settingRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const {logout} = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingItem label="Edit Profile" onPress={() => {}} />
        <SettingItem label="Change Password" onPress={() => {}} />
        <SettingItem label="Privacy Settings" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingItem label="Push Notifications" value="On" onPress={() => {}} />
        <SettingItem label="Email Notifications" value="Off" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem label="Help Center" onPress={() => {}} />
        <SettingItem label="Contact Us" onPress={() => {}} />
        <SettingItem label="Terms of Service" onPress={() => {}} />
        <SettingItem label="Privacy Policy" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.mutedForeground,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
    color: colors.mutedForeground,
  },
  chevron: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.mutedForeground,
  },
  logoutButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#EF4444',
  },
  logoutText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  version: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});

export default SettingsScreen;
