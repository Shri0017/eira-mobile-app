import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {StatusFilter} from '../../components';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import SiteDetailService from '@/api/siteDetailService';

const INVERTER_FILTERS = ['All Inverters', 'Active', 'Offline', 'Down', 'Warning'] as const;

const STATUS_COLORS: Record<string, string> = {
  Active: '#22C55E',
  Offline: '#64748B',
  Down: '#EF4444',
  Warning: '#F59E0B',
};

const formatTimeAgo = (timestamp: string): string => {
  let date = new Date(timestamp);
  if (timestamp.endsWith('+00:00') || timestamp.endsWith('Z')) {
    date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  }
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface InverterData {
  equipmentId: number;
  displayName: string;
  serialNo: string;
  irradiation: number | null;
  performanceRatio: string | null;
  activePower: number | null;
  totalEnergy: number | null;
  todayEnergy: number | null;
  derivedStatusName: string | null;
  specificYield: number | null;
  peakPower: number | null;
  energyLastUpdate: string | null;
}

const formatNum = (val: number | null | undefined, decimals = 2): string =>
  val != null ? val.toFixed(decimals) : '--';

const MetricCell: React.FC<{
  icon: string;
  iconType?: 'ionicon' | 'mci';
  iconColor: string;
  label: string;
  value: string;
  borderRight?: boolean;
}> = ({icon, iconType = 'mci', iconColor, label, value, borderRight = false}) => (
  <View style={[styles.metricCell, borderRight && styles.metricCellBorder]}>
    <View style={styles.metricLabelRow}>
      {iconType === 'mci' ? (
        <MaterialCommunityIcons name={icon} size={14} color={iconColor} />
      ) : (
        <Ionicons name={icon as any} size={14} color={iconColor} />
      )}
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const InverterCard: React.FC<{inverter: InverterData}> = ({inverter}) => {
  const status = inverter.derivedStatusName ?? 'Unknown';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{inverter.displayName}</Text>
        <View style={[styles.badge, {backgroundColor: STATUS_COLORS[status] || colors.mutedForeground}]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
        <View style={styles.perfBadge}>
          <Text style={styles.perfText}>Last update: {inverter.energyLastUpdate ? formatTimeAgo(inverter.energyLastUpdate) : '--'}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricCell icon="chart-bar" iconColor="#7C3AED" label="PR%" value={inverter.performanceRatio ?? '--'} borderRight />
        <MetricCell icon="leaf" iconColor="#22C55E" label="Specific Yield" value={formatNum(inverter.specificYield)} borderRight />
        <MetricCell icon="factory" iconColor="#991B1B" label="Peak Power" value={formatNum(inverter.peakPower, 2)} />
      </View>

      <View style={styles.metricsRow}>
        <MetricCell icon="power-plug-outline" iconColor="#EA580C" label="Active Power" value={formatNum(inverter.activePower, 2)} borderRight />
        <MetricCell icon="flash" iconType="ionicon" iconColor="#F59E0B" label="Today Energy" value={`${formatNum(inverter.todayEnergy, 1)} kWh`} borderRight />
        <MetricCell icon="clipboard-text-outline" iconColor="#991B1B" label="Total Energy" value={`${formatNum(inverter.totalEnergy, 0)} kWh`} />
      </View>
    </View>
  );
};

const InvertersTab: React.FC<{siteId: string,irradiation: string}> = ({siteId,irradiation}) => {
  const [filter, setFilter] = useState('All Inverters');
  const [inverters, setInverters] = useState<any>([]);
  console.log('siteId in inverters tab', siteId);
  console.log('irradiation in inverters tab', irradiation);
  useEffect(() => {
    if (siteId) {
      console.log('in siteid and irradiation');
      fetchInverters();
    }
  }, [siteId, irradiation]);

  const fetchInverters = async () => {
    try {
      const response = await SiteDetailService.getSiteDetailInverters(siteId, irradiation);
      console.log('response fetch inverters-->', response);
      const sorted = [...(response ?? [])].sort((a: InverterData, b: InverterData) => a.equipmentId - b.equipmentId);
      setInverters(sorted);
    } catch (error) {
      Alert.alert('Error in fetching inverters', (error as Error).message);  
    }
  };

  console.log('inverters', inverters);
  const filteredInverters = inverters.filter((inv: InverterData) => {
    if (filter === 'All Inverters') return true;
    const status = (inv.derivedStatusName ?? '').toLowerCase();
    return status === filter.toLowerCase();
  });
  console.log('filteredInverters', filteredInverters);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StatusFilter
        options={INVERTER_FILTERS}
        activeOption={filter}
        onSelect={setFilter}
      />
      <View style={styles.listContainer}>
        {filteredInverters.length > 0 ? filteredInverters.map((inv: InverterData) => (
          <InverterCard key={inv.equipmentId} inverter={inv} />
        )) : <Text style={styles.emptyText}>No inverters found</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: 100},
  listContainer: {paddingHorizontal: spacing.md, gap: spacing.sm},
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardName: {fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.black},
  badge: {paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: borderRadius.full},
  badgeText: {fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.white},
  perfBadge: {flexDirection: 'row', alignItems: 'center', marginLeft: 'auto'},
  perfText: {fontSize: fontSize.sm, color: colors.mutedForeground, marginLeft: 4},
  metricsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricCell: {
    flex: 1,
    // backgroundColor: '#F8FAFC',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  metricCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  metricLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs},
  metricLabel: {fontSize: fontSize.sm, color: colors.mutedForeground, marginLeft: 4},
  metricValue: {fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.black},
  emptyText: {fontSize: fontSize.md, color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.xl},
});

export default InvertersTab;
