import React, {useEffect, useState} from 'react';
import {Dimensions, View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BarChart, LineChart} from 'react-native-gifted-charts';
import {GestureDetector, Gesture, ScrollView as GHScrollView} from 'react-native-gesture-handler';
import {useSharedValue, runOnJS} from 'react-native-reanimated';
import {SearchBar, StatusFilter} from '../../components';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import SiteDetailService from '@/api/siteDetailService';

const ICON_SIZE = 38;

const parseValueUnit = (str: string | null | undefined): {value: string; unit: string} => {
  if (!str) return {value: '--', unit: ''};
  const match = str.trim().match(/^([\d.,]+)\s*(.*)$/);
  if (match) return {value: match[1], unit: match[2]};
  return {value: str, unit: ''};
};

const getOverviewMetrics = (site: any) => {
  const energy = parseValueUnit(site?.sumOfTodayEnergy);
  const power = parseValueUnit(site?.sumOfActivePower);
  const pr = parseValueUnit(site?.performanceRatio);
  const cuf = parseValueUnit(site?.cuf);
  return [
    {label: "Today's Energy", value: energy.value, unit: energy.unit, icon: 'clock-outline', bgColor: '#FEF3C7', iconColor: '#D97706'},
    {label: 'Active Power', value: power.value, unit: power.unit, icon: 'lightning-bolt', bgColor: '#F3E8FF', iconColor: '#9333EA'},
    {label: 'PR', value: pr.value, unit: pr.unit, icon: 'chart-bar', bgColor: '#DBEAFE', iconColor: '#2563EB'},
    {label: 'CUF', value: cuf.value, unit: cuf.unit, icon: 'chart-line', bgColor: '#FEE2E2', iconColor: '#DC2626'},
  ];
};

const BAR_COLORS = [
  '#F97316', '#EF4444', '#8B5CF6', '#0D9488', '#CA8A04',
  '#F97316', '#3B82F6', '#06B6D4', '#EC4899', '#F59E0B',
  '#6366F1', '#10B981', '#E11D48', '#7C3AED', '#14B8A6',
  '#F43F5E', '#A855F7',
];

const MetricIcon: React.FC<{icon: string; bgColor: string; iconColor: string}> = ({
  icon,
  bgColor,
  iconColor,
}) => (
  <View style={[styles.iconCircle, {backgroundColor: bgColor}]}>
    <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
  </View>
);

const OverviewTab: React.FC<{siteId: string}> = ({siteId}) => {
  const [timeFilter, setTimeFilter] = useState('Week');
  const [siteDetail, setSiteDetail] = useState<any>(null);
  const [equipmentList, setEquipmentList] = useState<any>([]);
  const [energyPerformance, setEnergyPerformance] = useState<any>([]);
  const [parameterData, setParameterData] = useState<any[]>([]);
  const [xLabels, setXLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (siteId) {
      fetchAllData();
    }
  }, [siteId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [siteRes, equipRes] = await Promise.all([
        SiteDetailService.getSiteDetailOverview(siteId),
        SiteDetailService.getSiteDetailOverviewEquipmentListBySiteId(siteId),
      ]);

      const site = siteRes?.[0] ?? null;
      const equipment = equipRes ?? [];
      setSiteDetail(site);
      setEquipmentList(equipment);

      if (site && equipment.length > 0) {
        const equipmentIds = equipment.map((e: any) => e?.equipmentId);
        const today = new Date().toISOString().split('T')[0];

        const energyData = {
          GraphType: 'Energy Performance',
          capacity: site.installationCapacity,
          domain: 'webdyn',
          energyFlag: 0,
          energyGenBasedOn: 0,
          equipmentIds,
          fromDate: today,
          toDate: today,
          intervalMins: site.intervalMins,
          range: 'custom',
          siteId: site.siteId,
          timeperiod: 'custom',
        };
        const energyRes = await SiteDetailService.getSiteDetailEnergyPerformance(energyData);
        const perfData = Array.isArray(energyRes) ? energyRes : energyRes?.data ?? energyRes?.result ?? [];
        const validPerfData = Array.isArray(perfData) ? perfData : [];
        setEnergyPerformance(validPerfData);
        barCountSV.value = Math.max(validPerfData.length, 1);

        // Only request parameter comparison for the same equipment IDs in energy performance
        const perfEquipmentIds = validPerfData.map((e: any) => e.equipmentId);

        const paramData = {
          GraphType: 'Parameter Comparision',
          capacity: site.installationCapacity,
          domain: 'webdyn',
          energyFlag: 0,
          energyGenBasedOn: 0,
          equipmentIds: perfEquipmentIds,
          fromDate: today,
          toDate: today,
          intervalMins: 5,
          parameters: ['ActivePower'],
          range: 'daily',
          siteId: site.siteId,
          timeperiod: 'Daily',
        };
        const paramRes = await SiteDetailService.getSiteDetailParameterComparision(paramData);
        console.log('param response length -->', Array.isArray(paramRes) ? paramRes.length : 'not array');
        // Pass perfEquipmentIds as the allowed set — only show INV items (same as bar chart)
        parseParameterData(paramRes, equipment, new Set(perfEquipmentIds.map(String)));
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const parseParameterData = (response: any, equipment: any[], allowedIds?: Set<string>) => {
    try {
      const flat = Array.isArray(response) ? response : [];
      if (flat.length === 0) {
        console.log('parseParameterData: empty array');
        return;
      }

      const grouped: Record<string, any[]> = {};
      flat.forEach((pt: any) => {
        const id = String(pt.EquipmentId ?? pt.equipmentId);
        if (!grouped[id]) grouped[id] = [];
        grouped[id].push(pt);
      });

      const responseIds = new Set(Object.keys(grouped));
      console.log('parseParameterData: equipments in response =', responseIds.size);

      const labels: string[] = [];
      let labelsSet = false;

      // Iterate equipmentList to preserve order and color index — only include
      // equipment whose ID exists in both the response AND the allowed set (energy performance IDs)
      const datasets = equipment
        .map((equip: any, idx: number) => {
          const id = String(equip.equipmentId);
          if (!responseIds.has(id)) return null;
          if (allowedIds && !allowedIds.has(id)) return null;

          const arr = grouped[id];
          const step = Math.max(1, Math.floor(arr.length / 48));
          const sampled = arr.filter((_: any, i: number) => i % step === 0);

          const points = sampled.map((pt: any, pIdx: number) => {
            const tsRaw = pt.TimeStamp || pt.timestamp;
            let timeLabel = '';
            if (tsRaw) {
              const t = new Date(tsRaw.replace(' ', 'T'));
              timeLabel = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
            }
            if (!labelsSet) {
              labels.push(pIdx % 6 === 0 ? timeLabel : '');
            }
            return {value: pt.ActivePower ?? pt.activePower ?? 0, ts: timeLabel};
          });

          if (!labelsSet && labels.length > 0) labelsSet = true;
          return {
            name: equip.displayName || `Equip ${idx + 1}`,
            data: points,
            color: BAR_COLORS[idx % BAR_COLORS.length],
          };
        })
        .filter(Boolean);

      console.log('parseParameterData: datasets =', datasets.length, ', points per line =', datasets[0]?.data?.length);
      setParameterData(datasets);
      setXLabels(labels);
      lineCountSV.value = Math.max(datasets[0]?.data?.length ?? 1, 1);
    } catch (e) {
      console.log('Failed to parse parameter data', e);
    }
  };
  const [selectedBar, setSelectedBar] = useState<{name: string; energy: number} | null>(null);

  // Track counts as shared values so they are readable on the UI thread
  const barCountSV  = useSharedValue(1);
  const lineCountSV = useSharedValue(1);

  // Chart area width (screen minus Y-axis ~55px and card padding ~24px)
  const CHART_W = Dimensions.get('window').width - 79;
  const BAR_SPACING_MAX  = 80;
  const BAR_WIDTH_MAX    = 80;
  const LINE_SPACING_MAX = 80;

  // Minimum zoom-out: every bar/point must still be visible (≥1px slot)
  const barMinSlot = () => {
    'worklet';
    return Math.max(6, Math.floor(CHART_W / Math.max(barCountSV.value, 1)));
  };
  const lineMinSlot = () => {
    'worklet';
    return Math.max(3, Math.floor(CHART_W / Math.max(lineCountSV.value, 1)));
  };

  const svBarSpacing  = useSharedValue(16);
  const svBarWidth    = useSharedValue(28);
  const svLineSpacing = useSharedValue(14);

  // Snapshot values captured at the START of each pinch gesture so that
  // e.scale (which is always relative to gesture start) is applied correctly
  const pinchStartBarSpacing  = useSharedValue(16);
  const pinchStartBarWidth    = useSharedValue(28);
  const pinchStartLineSpacing = useSharedValue(14);

  const [barSpacing,       setBarSpacing]       = useState(16);
  const [barWidthState,    setBarWidthState]     = useState(28);
  const [lineSpacing,      setLineSpacing]       = useState(14);
  const [barScrollEnabled, setBarScrollEnabled]  = useState(true);
  const [lineScrollEnabled, setLineScrollEnabled] = useState(true);

  // Clamp helpers that enforce dynamic min — must be worklets since they
  // are called synchronously inside pinch gesture handlers on the UI thread
  const clampBar = (s: number, w: number) => {
    'worklet';
    const slot = barMinSlot();
    const wClamped = Math.max(Math.floor(slot * 0.55), Math.min(w, BAR_WIDTH_MAX));
    const sClamped = Math.max(Math.max(1, slot - wClamped), Math.min(s, BAR_SPACING_MAX));
    return {s: sClamped, w: wClamped};
  };
  const clampLine = (s: number) => {
    'worklet';
    return Math.max(lineMinSlot(), Math.min(s, LINE_SPACING_MAX));
  };

  // +/- buttons
  const zoomBarIn = () => {
    const {s, w} = clampBar(svBarSpacing.value + 8, svBarWidth.value + 6);
    svBarSpacing.value = s; svBarWidth.value = w;
    setBarSpacing(s); setBarWidthState(w);
  };
  const zoomBarOut = () => {
    const {s, w} = clampBar(svBarSpacing.value - 6, svBarWidth.value - 4);
    svBarSpacing.value = s; svBarWidth.value = w;
    setBarSpacing(s); setBarWidthState(w);
  };
  const zoomLineIn = () => {
    const s = clampLine(svLineSpacing.value + 6);
    svLineSpacing.value = s; setLineSpacing(s);
  };
  const zoomLineOut = () => {
    const s = clampLine(svLineSpacing.value - 4);
    svLineSpacing.value = s; setLineSpacing(s);
  };

  // Pinch gestures:
  //  • onBegin  — disable the inner ScrollView so it can't steal the gesture
  //  • onStart  — snapshot the current spacing so e.scale (relative to gesture
  //               start) is always multiplied against the correct base value
  //  • onUpdate — derive new spacing from snapshot × current scale
  //  • onFinalize — re-enable scroll regardless of success/cancel
  const barPinchGesture = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(setBarScrollEnabled)(false);
    })
    .onStart(() => {
      pinchStartBarSpacing.value = svBarSpacing.value;
      pinchStartBarWidth.value   = svBarWidth.value;
    })
    .onUpdate(e => {
      const raw = clampBar(
        pinchStartBarSpacing.value * e.scale,
        pinchStartBarWidth.value   * e.scale,
      );
      svBarSpacing.value = raw.s;
      svBarWidth.value   = raw.w;
      runOnJS(setBarSpacing)(Math.round(raw.s));
      runOnJS(setBarWidthState)(Math.round(raw.w));
    })
    .onFinalize(() => {
      runOnJS(setBarScrollEnabled)(true);
    });

  const linePinchGesture = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(setLineScrollEnabled)(false);
    })
    .onStart(() => {
      pinchStartLineSpacing.value = svLineSpacing.value;
    })
    .onUpdate(e => {
      const s = clampLine(pinchStartLineSpacing.value * e.scale);
      svLineSpacing.value = s;
      runOnJS(setLineSpacing)(Math.round(s));
    })
    .onFinalize(() => {
      runOnJS(setLineScrollEnabled)(true);
    });

  const maxEnergyValue = Math.max(...energyPerformance.map((item: any) => item.todayEnergy ?? 0), 1);
  // Add 35% headroom so the tallest bar never reaches the top, keeping tooltip always visible
  const barChartMaxValue = Math.ceil(maxEnergyValue * 1.35);

  const barChartData = energyPerformance.map((item: any) => {
    const equipIdx = equipmentList.findIndex((e: any) => e.equipmentId === item.equipmentId);
    const equip = equipIdx >= 0 ? equipmentList[equipIdx] : null;
    const name = item.displayName || equip?.displayName || `Equip ${equipIdx + 1}`;
    const energy = item.todayEnergy ?? 0;
    const baseColor = BAR_COLORS[equipIdx >= 0 ? equipIdx % BAR_COLORS.length : 0];
    const isSelected = selectedBar?.name === name;
    const isFaded = selectedBar !== null && !isSelected;
    return {
      value: energy,
      frontColor: isFaded ? baseColor + '30' : baseColor,
      label: name,
      labelComponent: () => {
        const labelWidth = 40;
        return (
          <View style={{ width: labelWidth, marginTop: 25, alignItems: 'center' }}>
            <Text style={styles.xAxisLabel} numberOfLines={1}>{name}</Text>
          </View>
        );
      },
      displayName: name,
      onPress: () => setSelectedBar(isSelected ? null : {name, energy}),
      topLabelComponent: isSelected
        ? () => (
            <View style={styles.barTooltip}>
              <Text style={styles.barTooltipName} numberOfLines={1}>{name}</Text>
              <Text style={styles.barTooltipValue}>{energy.toFixed(1)} kWh</Text>
              <View style={styles.barTooltipArrow} />
            </View>
          )
        : () => <View>
              <Text style={styles.barTooltipValueLabel}>{energy.toFixed(1)} kWh</Text>
            </View>,
    };
  });

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <View style={styles.metricsGrid}>
        {getOverviewMetrics(siteDetail).map(m => (
          <View key={m.label} style={styles.metricCard}>
            <View style={styles.metricTextWrapper}>
              <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                <Text style={[styles.metricValue, {flexShrink: 1}]} numberOfLines={1} ellipsizeMode="tail">
                  {m.value}
                </Text>
                {m.unit ? <Text style={styles.metricUnit}> {m.unit}</Text> : null}
              </View>
              <Text style={styles.metricLabel} numberOfLines={1}>{m.label}</Text>
            </View>
            <MetricIcon icon={m.icon} bgColor={m.bgColor} iconColor={m.iconColor} />
          </View>
        ))}
      </View>

      <View style={styles.capacityRow}>
        <View style={styles.capacityItem}>
          <Ionicons name="flash" size={14} color={colors.mutedForeground} />
          <Text style={styles.capacityText}>
            AC Capacity: <Text style={styles.capacityValue}>{siteDetail?.installationCapacity ?? '--'} kW</Text>
          </Text>
        </View>
        <View style={styles.capacityItem}>
          <Ionicons name="flash" size={14} color={colors.mutedForeground} />
          <Text style={styles.capacityText}>
            DC Capacity: <Text style={styles.capacityValue}>{siteDetail?.invertersCapacity ?? '--'}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Total Energy</Text>
          <Text style={styles.infoValue}>{siteDetail?.sumOfTotalEnergy ?? '--'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Specific Yield</Text>
          <Text style={styles.infoValue}>{siteDetail?.specificYield != null ? siteDetail.specificYield.toFixed(2) : '--'}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Irradiation</Text>
          <Text style={styles.infoValue}>{siteDetail?.irradiation != null ? siteDetail.irradiation.toFixed(2) : '--'} kWh/m²</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>CO₂ Saved</Text>
          <Text style={styles.infoValue}>{siteDetail?.co2 ?? '--'}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Module Temp</Text>
          <Text style={styles.infoValue}>{siteDetail?.moduleTemperature != null ? `${siteDetail.moduleTemperature}°C` : '--'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Inverters</Text>
          <Text style={styles.infoValue}>{siteDetail?.activeInverterCount ?? '--'} / {siteDetail?.inverterCount ?? '--'}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Energy Performance</Text>

        <View style={styles.zoomRow}>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomBarOut}>
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomBarIn}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={barPinchGesture}>
          <View style={[styles.chartWrapper, {overflow: 'visible'}]}>
            {barChartData.length > 0 ? (
              <GHScrollView horizontal scrollEnabled={barScrollEnabled} showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barChartData}
                  height={200}
                  barWidth={barWidthState}
                  spacing={2}
                  barBorderRadius={2}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#E5E7EB"
                  rulesColor="#E5E7EB"
                  rulesType="dashed"
                  dashGap={4}
                  dashWidth={3}
                  noOfSections={4}
                  maxValue={barChartMaxValue}
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.xAxisLabel}
                  xAxisLabelsHeight={48}
                  labelsDistanceFromXaxis={6}
                  isAnimated
                />
              </GHScrollView>
            ) : (
              <Text style={styles.noDataText}>No energy data available</Text>
            )}
          </View>
        </GestureDetector>

        <View style={styles.legendGrid}>
          {barChartData.map((item: any, idx: number) => (
            <View key={idx} style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: item.frontColor}]} />
              <Text style={styles.legendText} numberOfLines={1}>{item.displayName}</Text>
            </View>
          ))}
        </View>
      </View>

      {parameterData.length > 0 && (() => {
        const allValues = parameterData.flatMap((ds: any) => ds.data.map((d: any) => d.value));
        const maxVal = Math.max(...allValues, 0);
        const yMax = maxVal <= 0 ? 10 : Math.ceil(maxVal / 10) * 10 + 10;
        const pointCount = parameterData[0]?.data?.length ?? 0;

        return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Generation</Text>

          <View style={styles.zoomRow}>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomLineOut}>
              <Text style={styles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomLineIn}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* <GestureDetector gesture={linePinchGesture}> */}
          <View>
          <GHScrollView horizontal scrollEnabled={lineScrollEnabled} showsHorizontalScrollIndicator={false}>
            <LineChart
              dataSet={parameterData.map((ds: any) => ({
                data: ds.data,
                color: ds.color,
              }))}
              height={240}
              width={Math.max((pointCount - 1) * lineSpacing + 40, CHART_W)}
              spacing={lineSpacing}
              thickness={2}
              hideDataPoints
              yAxisThickness={1}
              yAxisColor="#E5E7EB"
              xAxisThickness={1}
              xAxisColor="#E5E7EB"
              rulesColor="#E5E7EB"
              rulesType="dashed"
              dashGap={4}
              dashWidth={3}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.xAxisLabel}
              xAxisLabelsHeight={24}
              noOfSections={6}
              maxValue={yMax}
              curved
              xAxisLabelTexts={xLabels}
              pointerConfig={lineScrollEnabled ? {
                pointerStripHeight: 220,
                pointerStripColor: '#94A3B8',
                pointerStripWidth: 1,
                pointerColor: '#64748B',
                radius: 5,
                pointerLabelWidth: 190,
                pointerLabelHeight: Math.min(parameterData.length * 22 + 36, 220),
                activatePointersOnLongPress: false,
                persistPointer: true,
                autoAdjustPointerLabelPosition: true,
                shiftPointerLabelY: -20,
                pointerLabelComponent: (items: any[]) => {
                  const timeStr = items?.[0]?.ts ?? '';
                  return (
                    <View style={styles.lineTooltip}>
                      {!!timeStr && (
                        <Text style={styles.lineTooltipTime}>{timeStr}</Text>
                      )}
                      <ScrollView
                        style={{maxHeight: Math.min(parameterData.length * 22 + 4, 180)}}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={parameterData.length > 7}>
                        {items.map((item: any, i: number) => (
                          <View key={i} style={styles.lineTooltipRow}>
                            <View style={[styles.lineTooltipDot, {backgroundColor: parameterData[i]?.color ?? '#888'}]} />
                            <Text style={styles.lineTooltipText} numberOfLines={1}>
                              {parameterData[i]?.name ?? `Line ${i + 1}`}: {(item.value ?? 0).toFixed(2)} kW
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  );
                },
              } : undefined}
            />
          </GHScrollView>
          </View>
          {/* </GestureDetector> */}

          <View style={styles.legendGrid}>
            {parameterData.map((ds: any, idx: number) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: ds.color}]} />
                <Text style={styles.legendText} numberOfLines={1}>{ds.name}</Text>
              </View>
            ))}
          </View>
        </View>
        );
      })()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: 100},
  searchWrapper: {marginBottom: spacing.md},
  metricsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  metricTextWrapper: {flex: 1, marginRight: spacing.xs},
  metricValue: {fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.black, flexWrap: 'wrap'},
  metricUnit: {fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.mutedForeground},
  metricLabel: {fontSize: fontSize.md, color: colors.mutedForeground, marginTop: spacing.xs},
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  capacityRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-around',
  },
  capacityItem: {flexDirection: 'row', alignItems: 'center'},
  capacityText: {fontSize: fontSize.sm, color: colors.mutedForeground, marginLeft: spacing.xs},
  capacityValue: {fontWeight: fontWeight.semibold, color: colors.black},
  infoRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  infoItem: {flex: 1, alignItems: 'center'},
  infoLabel: {fontSize: fontSize.md, color: colors.mutedForeground, marginBottom: spacing.xs},
  infoValue: {fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.black},
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm},
  chartTitle: {fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: spacing.sm},
  dismissText: {fontSize: fontSize.md, color: colors.mutedForeground, padding: spacing.xs},
  tooltip: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  tooltipName: {fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: spacing.xs},
  tooltipValue: {fontSize: fontSize.sm, color: colors.mutedForeground},
  barTooltip: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    minWidth: 72,
    height: 35,
    flexShrink: 0,
    zIndex: 1000,
    elevation: 10,
  },
  barTooltipName: {
    color: '#fff',
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    marginBottom: 1,
  },
  barTooltipValue: {
    color: '#E5E7EB',
    fontSize: 9,
  },
  barTooltipValueLabel: {
    color: '#282828ff',
    fontSize: fontSize.xxs,
    textAlign: 'center'
  },
  barTooltipArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1F2937',
  },
  lineTooltip: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    width: 190,
  },
  lineTooltipTime: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: '#374151',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  lineTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  lineTooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  lineTooltipText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
  },
  chartDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.foreground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  chartDropdownText: {fontSize: fontSize.md, color: colors.black},
  chartWrapper: {marginBottom: spacing.md},
  zoomRow: {flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: spacing.xs},
  zoomBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnText: {fontSize: 18, color: '#374151', lineHeight: 22, fontWeight: fontWeight.medium},
  axisText: {fontSize: fontSize.xs, color: colors.mutedForeground},
  xAxisLabel: {fontSize: 8, color: colors.mutedForeground, width: 30, textAlign: 'center'},
  noDataText: {fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.xl},
  legendGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  legendItem: {flexDirection: 'row', alignItems: 'center', width: '23%', borderWidth: 1, borderColor: colors.foreground, padding: spacing.xs, borderRadius: borderRadius.sm},
  legendDot: {width: 12, height: 12, borderRadius: 6, marginRight: 4, flexShrink: 0},
  legendText: {fontSize: 10, color: colors.black, flex: 1},
});

export default OverviewTab;
