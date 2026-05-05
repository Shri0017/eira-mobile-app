import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import SiteDetailService from '@/api/siteDetailService';

const getCellBg = (value: number | null): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (value === 0) return '#FEE2E2';
  return '#DCFCE7';
};

const getCellTextColor = (value: number | null): string => {
  if (value === null || value === undefined) return '#64748B';
  if (value === 0) return '#DC2626';
  return '#16A34A';
};

const fmt = (val: any): string => {
  if (val === null || val === undefined) return '--';
  const n = parseFloat(val);
  return isNaN(n) ? String(val) : n.toFixed(2);
};

const StringsTab: React.FC<{siteId: string}> = ({siteId}) => {
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<{id: string; name: string}[]>([]);
  const [rows, setRows] = useState<{stringName: string; values: Record<string, number | null>}[]>([]);

  useEffect(() => {
    if (siteId) fetchAllData();
  }, [siteId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const equipRes = await SiteDetailService.getSiteDetailOverviewEquipmentListBySiteId(siteId);
      const allEquipment: any[] = equipRes ?? [];

      const equipmentIds = allEquipment.map((e: any) => e.equipmentId).join(',');
      if (!equipmentIds) {
        setLoading(false);
        return;
      }

      const stringsRes = await SiteDetailService.getSiteDetailStrings(equipmentIds);
      console.log('strings response type -->', typeof stringsRes, Array.isArray(stringsRes));
      if (stringsRes) {
        const sample = Array.isArray(stringsRes) ? stringsRes[0] : stringsRes[Object.keys(stringsRes)[0]];
        console.log('strings response sample -->', JSON.stringify(sample)?.slice(0, 300));
      }

      parseStringsData(stringsRes, allEquipment);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const parseStringsData = (response: any, equipment: any[]) => {
    if (!Array.isArray(response) || response.length === 0) {
      console.log('parseStringsData: invalid or empty response');
      return;
    }

    // Response: [{equipmentId, inputCurrent_01..inputCurrent_30, ...}, ...]
    // Columns = each equipment sorted by equipmentId
    const sorted = [...response].sort((a, b) => a.equipmentId - b.equipmentId);

    const cols = sorted.map((item: any) => {
      const equip = equipment.find((e: any) => e.equipmentId === item.equipmentId);
      return {id: String(item.equipmentId), name: equip?.displayName || `ID ${item.equipmentId}`};
    });

    // Rows = inputCurrent_01 to inputCurrent_30, skip rows where ALL values are null
    const stringKeys = Array.from({length: 30}, (_, i) =>
      `inputCurrent_${String(i + 1).padStart(2, '0')}`,
    );

    const tableRows = stringKeys
      .map(key => {
        const values: Record<string, number | null> = {};
        sorted.forEach((item: any) => {
          const id = String(item.equipmentId);
          values[id] = item[key] != null ? parseFloat(item[key]) : null;
        });
        const allNull = Object.values(values).every(v => v === null);
        if (allNull) return null;
        return {stringName: key.replace('inputCurrent_', 'String_'), values};
      })
      .filter(Boolean) as {stringName: string; values: Record<string, number | null>}[];

    console.log('parseStringsData: cols=', cols.length, 'rows=', tableRows.length);
    setColumns(cols);
    setRows(tableRows);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No string data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <GHScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, styles.nameCell]}>
              <Text style={styles.headerText}>String</Text>
            </View>
            {columns.map(col => (
              <View key={col.id} style={[styles.headerCell, styles.valueCell]}>
                <Text style={styles.headerText} numberOfLines={1}>{col.name}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={[styles.dataRow, rowIdx % 2 === 1 && styles.dataRowAlt]}>
              <View style={[styles.dataCell, styles.nameCell]}>
                <Text style={styles.nameText}>{row.stringName}</Text>
              </View>
              {columns.map(col => {
                const val = row.values[col.id];
                return (
                  <View
                    key={col.id}
                    style={[styles.dataCell, styles.valueCell, {backgroundColor: getCellBg(val)}]}>
                    <Text style={[styles.valueText, {color: getCellTextColor(val)}]}>{fmt(val)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </GHScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.white},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100},
  emptyText: {fontSize: fontSize.md, color: colors.mutedForeground},
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  nameCell: {width: 110},
  valueCell: {width: 90, alignItems: 'center'},
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dataRowAlt: {backgroundColor: '#FAFAFA'},
  dataCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  nameText: {fontSize: fontSize.sm, color: colors.black, fontWeight: fontWeight.medium},
  valueText: {fontSize: fontSize.sm, color: colors.black, textAlign: 'center'},
});

export default StringsTab;
