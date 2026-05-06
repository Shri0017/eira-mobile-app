import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../theme';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome6Icon from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SiteCardProps {
  name: string;
  updatedAgo: string;
  date: string;
  status: 'Active' | 'Warning' | 'Offline' | 'Down';
  todayEnergy: string;
  totalEnergy: string;
  specificYield: string;
  capacity: string;
  inverters: string;
  siteId: string;
  irradiation: string;
}

const STATUS_COLORS: Record<SiteCardProps['status'], string> = {
  Active: '#22C55E',
  Warning: '#F59E0B',
  Offline: '#64748B',
  Down: '#EF4444',
};

const SiteCard: React.FC<SiteCardProps> = ({
  name,
  updatedAgo,
  date,
  status,
  todayEnergy,
  totalEnergy,
  specificYield,
  capacity,
  inverters,
  siteId,
  irradiation,
}) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SiteDetail', {name, status, siteId, irradiation})}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <FontAwesome6Icon
            name="solar-panel"
            solid
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Updated {updatedAgo}</Text>
            <Text style={styles.metaDot}>·</Text>
            <FontAwesome name="calendar-o" size={13} color={colors.mutedForeground} />
            <Text style={styles.metaText}> {date}</Text>
          </View>
        </View>
        <View
          style={[styles.badge, {backgroundColor: STATUS_COLORS[status]}]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.energyRow}>
        <View style={styles.energyItem}>
          <View style={styles.labelRow}>
            <Ionicons name="flash-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.label}> Today Energy</Text>
          </View>
          <Text style={styles.value}>{todayEnergy}</Text>
        </View>
        <View style={[styles.energyItem, styles.energyItemBorder]}>
          <View style={styles.labelRow}>
            <FontAwesome6Icon name="chart-line" size={14} color={colors.mutedForeground} />
            <Text style={styles.label}> Total Energy</Text>
          </View>
          <Text style={styles.value}>{totalEnergy}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons
              name="leaf"
              size={14}
              color={colors.mutedForeground}
            />
            <Text style={styles.label}> Specific Yield</Text>
          </View>
          <Text style={styles.value}>{specificYield}</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <View style={styles.labelRow}>
            <FontAwesome6Icon
            
              name="server"
              size={14}
              color={colors.mutedForeground}
            />
            <Text style={styles.label}> Capacity</Text>
          </View>
          <Text style={styles.value}>{capacity}</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <View style={styles.labelRow}>
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={14}
              color={colors.mutedForeground}
            />
            <Text style={styles.label}> Inverters</Text>
          </View>
          <Text style={styles.value}>{inverters}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.foreground,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  metaDot: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginHorizontal: spacing.xs,
    fontWeight: fontWeight.bold,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  energyRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.foreground,
  },
  energyItem: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  energyItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.foreground,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.foreground,
  },
  statItem: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 4,
    alignItems: 'center',
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.foreground,
  },
});

export default SiteCard;
