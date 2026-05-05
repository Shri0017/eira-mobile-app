import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {PieChart} from 'react-native-gifted-charts';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../theme';

const CHART_RADIUS = 80;
const CHART_INNER_RADIUS = 60;

const SiteHealthCard: React.FC<{dashboardDetails: any}> = ({dashboardDetails}) => {
  const pieData = [
    {label: 'Active', value: dashboardDetails?.activeCount || 0, color: '#22C55E'},
    {label: 'Warning', value: dashboardDetails?.warningCount || 0, color: '#F59E0B'},
    {label: 'Offline', value: dashboardDetails?.offlineCount || 0, color: '#94A3B8'},
    {label: 'Down', value: dashboardDetails?.downCount || 0, color: '#EF4444'},
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Site health</Text>

      <View style={styles.chartWrapper}>
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            donut
            semiCircle
            radius={CHART_RADIUS}
            innerRadius={CHART_INNER_RADIUS}
            innerCircleColor={colors.white}
          />
        </View>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerValue}>{dashboardDetails?.siteCount || 0}</Text>
          <Text style={styles.centerText}>Total Sites</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        {pieData.map((status: any, index: number) => (
          <View
            key={status.label}
            style={[
              styles.statusItem,
              index < pieData.length - 1 && styles.statusItemBorder,
            ]}>
            <View style={[styles.statusDot, {backgroundColor: status.color}]} />
            <Text style={styles.statusValue}>{status.value}</Text>
            <Text style={styles.statusLabel}>{status.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderColor: colors.foreground,
    borderWidth: 1,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  chartWrapper: {
    height: CHART_RADIUS + 40,
    alignItems: 'center',
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  centerLabel: {
    position: 'absolute',
    top: CHART_RADIUS * 0.45,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centerValue: {
    fontSize: fontSize.xxxxl,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    includeFontPadding: false,
  },
  centerText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    includeFontPadding: false,
  },
  statusRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statusItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: spacing.xs,
  },
  statusValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});

export default SiteHealthCard;
