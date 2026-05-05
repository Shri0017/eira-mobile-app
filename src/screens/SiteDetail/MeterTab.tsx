import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import SiteDetailService from '@/api/siteDetailService';

interface MeterData {
  equipmentId: number;
  displayName: string;
  serialNo: string;
  activePower: number | null;
  reactivePower: number | null;
  powerFactor: number | null;
  importEnergy: number | null;
  exportEnergy: number | null;
  peakPower: number | null;
  lastUpdated: string | null;
  capacity: number | null;
}

const COLUMNS = [
  {key: 'displayName', label: 'Meter Name', width: 130},
  {key: 'activePower', label: 'Active Power (kW)', width: 130},
  {key: 'importEnergy', label: 'Import Energy (kWh)', width: 140},
  {key: 'exportEnergy', label: 'Export Energy (kWh)', width: 140},
  {key: 'peakPower', label: 'Peak Power (kW)', width: 130},
  {key: 'powerFactor', label: 'Power Factor', width: 110},
  {key: 'lastUpdated', label: 'Last Updated', width: 160},
] as const;

const formatNum = (val: number | null | undefined, decimals = 2): string =>
  val != null ? val.toFixed(decimals) : '--';

const formatTime = (ts: string | null): string => {
  if (!ts) return '--';
  let d = new Date(ts);
  if (ts.endsWith('+00:00') || ts.endsWith('Z')) {
    d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const getCellValue = (meter: MeterData, key: string): string => {
  switch (key) {
    case 'displayName': return meter.displayName;
    case 'activePower': return formatNum(meter.activePower);
    case 'importEnergy': return formatNum(meter.importEnergy, 1);
    case 'exportEnergy': return formatNum(meter.exportEnergy, 1);
    case 'peakPower': return formatNum(meter.peakPower, 1);
    case 'powerFactor': return formatNum(meter.powerFactor, 4);
    case 'lastUpdated': return formatTime(meter.lastUpdated);
    default: return '--';
  }
};

const MeterTab: React.FC<{siteId: string}> = ({siteId}) => {
  const [meters, setMeters] = useState<MeterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteId) fetchMeters();
  }, [siteId]);

  const fetchMeters = async () => {
    try {
      setLoading(true);
      const response = await SiteDetailService.getSiteDetailMeters(siteId);
      const sorted = [...(response ?? [])].sort(
        (a: MeterData, b: MeterData) => a.equipmentId - b.equipmentId,
      );
      setMeters(sorted);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (meters.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No meters found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.tableCard}>
        <GHScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.headerRow}>
              {COLUMNS.map(col => (
                <View key={col.key} style={[styles.headerCell, {width: col.width}]}>
                  <Text style={styles.headerText}>{col.label}</Text>
                </View>
              ))}
            </View>

            {meters.map((meter, rowIdx) => (
              <View
                key={meter.equipmentId}
                style={[styles.dataRow, rowIdx % 2 === 1 && styles.dataRowAlt]}>
                {COLUMNS.map(col => (
                  <View key={col.key} style={[styles.dataCell, {width: col.width}]}>
                    <Text
                      style={[
                        styles.dataText,
                        col.key === 'displayName' && styles.nameText,
                      ]}
                      numberOfLines={1}>
                      {getCellValue(meter, col.key)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </GHScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.white},
  content: {flexGrow: 1, paddingVertical: 10},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100},
  emptyText: {fontSize: fontSize.md, color: colors.mutedForeground},
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing.md,
  },
  tableCard: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dataRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  dataCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  dataText: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  nameText: {
    fontWeight: fontWeight.semibold,
  },
});

export default MeterTab;
