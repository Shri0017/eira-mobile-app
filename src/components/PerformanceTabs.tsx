import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../theme';
import {SiteCard, StatusFilter} from '.';

const TABS = ['Plant Performance', 'Overall Performance'] as const;
const PLAT_STATUS = ['All Plants', 'Active', 'Down', 'Warning', 'Offline'] as const;
type Tab = (typeof TABS)[number];
type PlantStatusType = (typeof PLAT_STATUS)[number];

const RING_SIZE = 44;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ProgressRing: React.FC<{
  progress: number;
  color: string;
  icon: string;
}> = ({progress, color, icon}) => {
  const strokeDashoffset =
    RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

  return (
    <View style={styles.ringWrapper}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#E5E7EB"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringIconContainer}>
        <MaterialCommunityIcons name={icon} size={23} color={colors.black} />
      </View>
    </View>
  );
};

const formatTimeAgo = (timestamp: string): string => {
  let date = new Date(timestamp);
  // Backend sometimes sends local time with UTC suffix, correct it to actual local time
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

const formatDate = (timestamp: string): string => {
  const d = new Date(timestamp);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};

const PerformanceTabs: React.FC<{overallPerformance: any; siteList: any[]; loading?: boolean}> = ({overallPerformance, siteList, loading}) => {
  const [activeTab, setActiveTab] = useState<Tab>('Plant Performance');
  const [activePlantStatus, setActivePlantStatus] = useState<PlantStatusType>('All Plants');

  const filteredSiteList = useMemo(() => {
    if (!siteList) return [];
    if (activePlantStatus === 'All Plants') return siteList;
    return siteList.filter((site: any) => site.siteStatus === activePlantStatus);
  }, [siteList, activePlantStatus]);

  const overallPerformanceData = useMemo(() => [
    {
      label: "Today's Energy",
      value: overallPerformance?.totalTodayEnergy?.split(' ')[0],
      unit: overallPerformance?.totalTodayEnergy?.split(' ')[2],
      icon: 'clock-outline' as const,
      ringColor: '#E9A23B',
      progress: 72,
    },
    {
      label: 'Total Energy',
      value: overallPerformance?.sumOfTotalEnergy?.split(' ')[0],
      unit: overallPerformance?.sumOfTotalEnergy?.split(' ')[2],
      icon: 'lightning-bolt' as const,
      ringColor: '#C084FC',
      progress: 65,
    },
    {
      label: 'Total Active Power',
      value: overallPerformance?.totalActivePower?.split(' ')[0],
      unit: overallPerformance?.totalActivePower?.split(' ')[2],
      icon: 'power-plug-outline' as const,
      ringColor: '#67B5C8',
      progress: 58,
    },
    {
      label: 'CO2  Avoided',
      value: overallPerformance?.co2?.split(' ')[0],
      unit: overallPerformance?.co2?.split(' ')[1],
      icon: 'pine-tree' as const,
      ringColor: '#86C068',
      progress: 80,
    },
  ], [overallPerformance]);

  return (
    <View style={styles.card}>
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'Plant Performance' ? (
        <View style={styles.tab1Content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={{flex: 1, marginTop: spacing.sm}}
              contentContainerStyle={styles.cardsContainer}
              showsVerticalScrollIndicator={false}
            >
              <StatusFilter
                options={PLAT_STATUS}
                activeOption={activePlantStatus}
                onSelect={option => setActivePlantStatus(option as PlantStatusType)}
              />
          
      
            {filteredSiteList.map((site: any) => (
              <SiteCard
                siteId={site.siteId}
                key={site.siteId}
                name={site.siteName}
                updatedAgo={site.lastUpdatedTimestamp ? formatTimeAgo(site.lastUpdatedTimestamp) : '--'}
                date={site.lastUpdatedTimestamp ? formatDate(site.lastUpdatedTimestamp) : '--'}
                status={site.siteStatus}
                todayEnergy={site.sumOfTodayEnergy ?? '--'}
                totalEnergy={site.sumOfTotalEnergy ?? '--'}
                specificYield={site.specificYield?.toFixed(2) ?? '--'}
                capacity={String(site.installationCapacity ?? '--')}
                inverters={`${site.activeInverterCount ?? 0}/${site.inverterCount ?? 0}`}
                irradiation={site.irradiation ?? '--'}
                />
            ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={styles.tab2Content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.metricsGrid}>
            {overallPerformanceData.map((metric: any) => (
              <View key={metric.label} style={styles.metricCard}>
                <ProgressRing
                  progress={metric.progress}
                  color={metric.ringColor}
                  icon={metric.icon}
                />
                <Text style={styles.metricValue}>
                  {metric.value}
                  <Text style={styles.metricUnit}> {metric.unit}</Text>
                </Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  card: {
    flex: 1,
    marginVertical: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: RING_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  ringIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginTop: spacing.sm,
  },
  metricUnit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.black,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',

  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tab1Content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  tab2Content: {
     flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 0,
    backgroundColor: colors.background,
  },
  xLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  yLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  cardsContainer: {
    gap: spacing.sm,
    paddingBottom: 20,
  },
  });

export default PerformanceTabs;
