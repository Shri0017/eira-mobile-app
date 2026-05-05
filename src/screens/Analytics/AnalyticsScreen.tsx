import React, {useEffect, useState} from 'react';
import {Dimensions, View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator} from 'react-native';
import {ScrollView as GHScrollView, GestureDetector, Gesture} from 'react-native-gesture-handler';
import {useSharedValue, runOnJS} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import {Header, SearchBar} from '../../components';
import Dropdown, {DropdownOption} from '../../components/Dropdown';
import {LineChart, BarChart, LineChartBicolor} from 'react-native-gifted-charts';
import TabNavigator from '../../components/TabNavigator';
import OverviewTab from '../SiteDetail/OverviewTab';
import Calendar from '../../components/Calendar';
import AnalyticsService from '@/api/analyticsService';

const ANALYTICS_TYPES = [
  {label: 'Daily Generation', value: 'daily_generation'},
  {label: 'Specific Yield', value: 'specific_yield'},
  {label: 'DG PV Grid Management', value: 'dg_pv_grid_management'},
  {label: 'String Current', value: 'string_current'},
];

const roundUpMax = (max: number): number => {
  if (max <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitude) * magnitude;
};

const niceScale = (dataMax: number, targetSections = 5) => {
  if (dataMax <= 0) return {maxValue: 10, stepValue: 2, noOfSections: 5};
  const roughStep = dataMax / targetSections;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / mag;
  let niceStep: number;
  if (residual <= 1.5) niceStep = mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;
  const maxValue = Math.ceil(dataMax / niceStep) * niceStep;
  const noOfSections = Math.round(maxValue / niceStep);
  return {maxValue, stepValue: niceStep, noOfSections};
};

/** Abbreviate large energy values for Y-axis (e.g. 40000 → 40K, 148855 → 149K). */
const formatEnergyYAxisLabel = (label: string): string => {
  const n = parseFloat(String(label).replace(/,/g, ''));
  if (Number.isNaN(n)) return label;
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    const text =
      Math.abs(k - Math.round(k)) < 1e-6
        ? String(Math.round(k))
        : k.toFixed(1).replace(/\.0$/, '');
    return `${text}K`;
  }
  return label;
};

const fmtTime = (ts: string): string => {
  const d = new Date(ts.replace(' ', 'T'));
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const TIME_FILTERS = ['Daily', 'Week', 'Month', 'Year'] as const;

const TIME_PERIOD_MAP: Record<string, {range: string; timeperiod: string}> = {
  Daily: {range: 'daily',     timeperiod: 'Daily'},
  Week:  {range: 'daily',     timeperiod: 'Weekly'},
  Month: {range: 'yearly',    timeperiod: 'Monthly'},
  Year:  {range: 'yearlyCum', timeperiod: 'Yearly'},
};

const getDateRange = (period: string, fromDate: Date | null, toDate: Date | null) => {
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const today = new Date();
  if (fromDate && toDate) return {fromDate: fmt(fromDate), toDate: fmt(toDate)};
  switch (period) {
    case 'Week': {
      const from = new Date(today);
      const diff = (today.getDay() === 0) ? 7 : today.getDay();
      from.setDate(today.getDate() - diff);
      return {fromDate: fmt(from), toDate: fmt(today)};
    }
    case 'Month': {
      const from = new Date(today.getFullYear(), 0, 1);
      from.setMinutes(from.getMinutes() + 330);
      return {fromDate: fmt(from), toDate: fmt(today)};
    }
    case 'Year': {
      const from = new Date(today.getFullYear(), 0, 1);
      from.setMinutes(from.getMinutes() + 330);
      return {fromDate: fmt(from), toDate: fmt(today)};
    }
    default:
      return {fromDate: fmt(today), toDate: fmt(today)};
  }
};

const CHART_S_MIN = 3;
const CHART_S_MAX = 120;
const CHART_W_MIN = 4;
const CHART_W_MAX = 80;

const AnalyticsScreen: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>(ANALYTICS_TYPES[0].value);
  const [activeChartType, setActiveChartType] = useState<string>('line');
  const [activeTimeFilter, setActiveTimeFilter] = useState<string>('Daily');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [equipmentList, setEquipmentList] = useState<any>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [siteList, setSiteList] = useState<any>([]);
  const [selectedSite, setSelectedSite] = useState<any>('');

  // Zoom & gesture state
  const svSpacing          = useSharedValue(40);
  const svBarWidth         = useSharedValue(16);
  const pinchStartSpacing  = useSharedValue(40);
  const pinchStartBarWidth = useSharedValue(16);
  const [chartSpacing,     setChartSpacing]     = useState(40);
  const [chartBarWidth,    setChartBarWidth]     = useState(16);
  const [scrollEnabled,    setScrollEnabled]     = useState(true);
  const [selectedBarIndex, setSelectedBarIndex]  = useState<number | null>(null);
  const [isPinchingState,  setIsPinchingState]   = useState(false);
  const isPinching = useSharedValue(false);
  const [pointerIndex,     setPointerIndex]      = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = React.useRef(0);

  useEffect(() => {
    fetchSiteListByUserId();
  }, []);

  useEffect(() => {
    if(selectedSite) {
      fetchEquiDropdownListBySiteId();
    }
  }, [selectedSite]);

  useEffect(() => {
    if (!selectedSite) return;

    const id = ++fetchIdRef.current;
    setLoading(true);
    
    const guard = (fn: () => Promise<void>) => fn().then(() => {
      // If a newer fetch started after this one, its result will overwrite – do nothing extra
      if (id === fetchIdRef.current) setLoading(false);
    }).catch(() => {
      if (id === fetchIdRef.current) setLoading(false);
    });

    if (selectedChart === 'specific_yield') {
      guard(() => fetchSpecificYield(id));
    } else if (selectedChart === 'dg_pv_grid_management') {
      guard(() => fetchDgPvGridManagement(id));
    } else if (selectedChart === 'string_current') {
      guard(() => fetchStringCurrent(id));
    } else {
      guard(() => fetchKeyMetrics(id));
    }
  }, [activeChartType,activeTimeFilter, fromDate, toDate, selectedChart, equipmentList, selectedSite]);

  // Reset zoom & selection when chart type/filter changes
  useEffect(() => {
    let points = chartData?.length || 1;
    const isDailyOrWeekly = activeTimeFilter === 'Daily' || activeTimeFilter === 'Week';
    
    if (selectedChart === 'string_current' && isDailyOrWeekly) {
      points = Math.ceil(points / 6);
    } else if (selectedChart === ANALYTICS_TYPES[0].value && isDailyOrWeekly && activeChartType === 'line') {
      points = Math.ceil(points / 6);
    }
    
    const screenWidth = Dimensions.get('window').width - 55;
    let newSpacing = 40;
    let newBarWidth = 16;

    if (points > 0) {
      if (activeChartType === 'line') {
        newSpacing = (screenWidth - 40) / Math.max(1, points - 1);
      } else {
        const totalSpace = screenWidth - 40;
        const chunk = totalSpace / Math.max(1, points);
        newBarWidth = chunk * 0.7;
        newSpacing = chunk * 0.3;
      }
    }

    newSpacing = Math.max(2, Math.min(newSpacing, 120));
    newBarWidth = Math.max(2, Math.min(newBarWidth, 80));

    svSpacing.value  = newSpacing; svBarWidth.value = newBarWidth;
    setChartSpacing(newSpacing); setChartBarWidth(newBarWidth);
    setScrollEnabled(true); setSelectedBarIndex(null);
  }, [selectedChart, activeChartType, activeTimeFilter, chartData]);

  // Clamp helpers — worklets so they run on UI thread inside pinch handler
  const clampS = (s: number): number => {
    'worklet';
    return Math.max(CHART_S_MIN, Math.min(s, CHART_S_MAX));
  };
  const clampW = (w: number): number => {
    'worklet';
    return Math.max(CHART_W_MIN, Math.min(w, CHART_W_MAX));
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin((e) => {
      if (e.numberOfPointers < 2) return;
      isPinching.value = true;
      runOnJS(setIsPinchingState)(true);
      runOnJS(setScrollEnabled)(false);
    })
    .onStart(() => {
      if (!isPinching.value) return;
      pinchStartSpacing.value  = svSpacing.value;
      pinchStartBarWidth.value = svBarWidth.value;
    })
    .onUpdate(e => {
      if (!isPinching.value) return;
      const s = clampS(pinchStartSpacing.value  * e.scale);
      const w = clampW(pinchStartBarWidth.value * e.scale);
      svSpacing.value  = s; svBarWidth.value = w;
      runOnJS(setChartSpacing)(Math.round(s));
      runOnJS(setChartBarWidth)(Math.round(w));
    })
    .onFinalize(() => {
      isPinching.value = false;
      runOnJS(setIsPinchingState)(false);
      runOnJS(setScrollEnabled)(true);
    });

  const zoomIn = () => {
    const s = clampS(svSpacing.value  + 4);
    const w = clampW(svBarWidth.value + 4);
    svSpacing.value  = s; svBarWidth.value = w;
    setChartSpacing(Math.round(s)); setChartBarWidth(Math.round(w));
  };
  const zoomOut = () => {
    const s = clampS(svSpacing.value  - 3);
    const w = clampW(svBarWidth.value - 3);
    svSpacing.value  = s; svBarWidth.value = w;
    setChartSpacing(Math.round(s)); setChartBarWidth(Math.round(w));
  };

  const handleSelectChart = (chart: DropdownOption) => {
    if (chart.value === selectedChart) return;
    setChartData([]);          // clear stale data from the previous analytics type
    setSelectedChart(chart.value);
  };

  const handleSelectSite = (site: DropdownOption) => {
    setSelectedSite(site.value);
  };

  const fetchSiteListByUserId = async () => {
    try {
      const response = await AnalyticsService.findSiteListByUserId();
      console.log('response -->', response);
      const list = response ?? [];
      setSiteList(list);
      if (list.length > 0) {
        setSelectedSite(list[0].siteId?.toString());
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const fetchEquiDropdownListBySiteId = async () => {
    try {
      const response = await AnalyticsService.findEquiDropdownListBySiteId({siteId: selectedSite});
      console.log('response -->', response);
      setEquipmentList(response ?? []);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const fetchKeyMetrics = async (fetchId: number) => {
    try {
      setLoading(true);
      const isCustomRange = (fromDate !== null && toDate !== null) || (activeChartType === 'bar' && ['Daily', 'Week'].includes(activeTimeFilter));
      const {range, timeperiod} = isCustomRange
        ? {range: 'custom', timeperiod: 'custom'}
        : TIME_PERIOD_MAP[activeTimeFilter];
      const {fromDate: from, toDate: to} = getDateRange(activeTimeFilter, fromDate, toDate);

      const data = {
        GraphType: selectedChart
          ? ANALYTICS_TYPES.find(t => t.value === selectedChart)?.label ?? 'Daily Generation'
          : 'Daily Generation',
        domain: 'Ice',
        energyFlag: 0,
        energyGenBasedOn: 0,
        equipmentIdAndCapacity: [],
        equipmentIds: equipmentList.map((equipment: any) => equipment?.equipmentId),
        fromDate: from,
        toDate: to,
        intervalMins: '5',
        range,
        siteId: Number(selectedSite),
        timeperiod,
      };

      console.log('fetchKeyMetrics data -->', data);

      let response: any;
      console.log('activeTimeFilter -->', activeTimeFilter);
      console.log('activeChartType -->', activeChartType);
      if (activeChartType === 'line') {
        response = await AnalyticsService.getDailyKeyMetrics(data);
      } else {
        response = await AnalyticsService.getWeeklyAndYearlyKeyMetrics(data);
      }

      if (fetchId !== fetchIdRef.current) return; // discard stale response
      setChartData(response);
      console.log('fetchKeyMetrics response -->', response);
      setLoading(false);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      setLoading(false);
      Alert.alert('Error', (error as Error).message);
    }
  };

  const fetchSpecificYield = async (fetchId: number) => {
    try {
      const isCustomRange = fromDate !== null && toDate !== null;
      const {range, timeperiod} = isCustomRange
        ? { range: 'custom', timeperiod: 'custom' }
        : activeTimeFilter == 'Week' ? { range: 'custom', timeperiod: 'Weekly' }
        : TIME_PERIOD_MAP[activeTimeFilter];
      const {fromDate: from, toDate: to} = getDateRange(activeTimeFilter, fromDate, toDate);

      const data = {
        GraphType: 'Specific Yield',
        siteId: Number(selectedSite),
        fromDate: from,
        toDate: to,
        equipmentIds: equipmentList.map((equipment: any) => equipment?.equipmentId),
        equipmentIdAndCapacity: equipmentList.map((equipment: any) => ({
          equipmentId: equipment?.equipmentId,
          capacity: equipment?.acCapacity,
        })),
        range,
        timeperiod,
        intervalMins: 5,
        energyFlag: 0,
        parameters: [],
        energyGenBasedOn: 0,
        domain: 'Ice',
      };
      console.log('fetchSpecificYield data -->', data);
      const response = await AnalyticsService.getSpecificYield(data);
      if (fetchId !== fetchIdRef.current) return;
      setChartData(response);
      console.log('fetchSpecificYield response -->', response);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      Alert.alert('Error', (error as Error).message);
    }
  };

  const fetchDgPvGridManagement = async (fetchId: number) => {
    const isCustomRange = fromDate !== null && toDate !== null;
    const {range, timeperiod} = isCustomRange
      ? {range: 'custom', timeperiod: 'custom'}
      : TIME_PERIOD_MAP[activeTimeFilter];
    const {fromDate: from, toDate: to} = getDateRange(activeTimeFilter, fromDate, toDate);
    const data = {
      GraphType: 'DG PV Grid Management',
      siteId: Number(selectedSite),
      fromDate: from,
      toDate: to,
      range,
      timeperiod,
      intervalMins: 5,
      energyFlag: 0,
      capacity: 532,
      energyGenBasedOn: 0,
      domain: 'Ice',
    };
    console.log('fetchDgPvGridManagement data -->', data);
    try {
      const response = await AnalyticsService.getDgPvGridManagement(data);
      if (fetchId !== fetchIdRef.current) return;
      console.log('fetchDgPvGridManagement response -->', response);
      setChartData(response);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      Alert.alert('Error', (error as Error).message);
    }
  };

  const fetchStringCurrent = async (fetchId: number) => {
    const isCustomRange = fromDate !== null && toDate !== null;
    const {range, timeperiod} = isCustomRange
      ? {range: 'custom', timeperiod: 'custom'}
      : TIME_PERIOD_MAP[activeTimeFilter];
    const {fromDate: from, toDate: to} = getDateRange(activeTimeFilter, fromDate, toDate);
    const Inputs = ['InputCurrent_01', 'InputCurrent_02', 'InputCurrent_03', 'InputCurrent_04', 'InputCurrent_05', 'InputCurrent_06', 'InputCurrent_07', 'InputCurrent_08', 'InputCurrent_09', 'InputCurrent_10', 'InputCurrent_11', 'InputCurrent_12'];
    const data = {
      GraphType: 'String Current',
      siteId: Number(selectedSite),
      fromDate: from,
      toDate: to,
      equipmentIds: [803],
      parameters: Inputs,
      range,
      timeperiod,
      intervalMins: 5,
      energyFlag: 0,
      capacity: 532,
      energyGenBasedOn: 0,
      domain: 'Ice',
    };
    console.log('fetchStringCurrent data -->', data);
    try {
      const response = await AnalyticsService.getStringCurrent(data);
      if (fetchId !== fetchIdRef.current) return;
      setChartData(response);
      console.log('fetchStringCurrent response -->', response);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      Alert.alert('Error', (error as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}>

        <View style={[styles.card, { zIndex: 1000 }]}>
          <Dropdown
            options={siteList?.map((site: any) => ({ label: site?.siteName, value: site?.siteId?.toString() })) || []}
            onSelect={handleSelectSite}
            placeholder="Select Site"
            selectedValue={selectedSite}
            label="Select Site"
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Key Metrics</Text>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownWrapper}>
              <Dropdown
                options={ANALYTICS_TYPES}
                onSelect={handleSelectChart}
                placeholder="Select Chart"
                selectedValue={selectedChart}
                label="Select Analytics Type"
              />
            </View>
            <TabNavigator
              tabs={['Daily', 'Week'].includes(activeTimeFilter) ? [
                {key: 'line', title: 'Line'},
                {key: 'bar',  title: 'Bar'},
              ] : [
                {key: 'bar',  title: 'Bar'},
              ]}
              activeTab={activeChartType}
              onTabChange={(key) => { setLoading(true); setActiveChartType(key); }}
            />
          </View>

          {/* Zoom controls */}
          <View style={styles.zoomRow}>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut}>
              <Text style={styles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{height: 300, justifyContent: 'center', alignItems: 'center'}}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (() => {
            const raw = Array.isArray(chartData) ? chartData : [];
            const isMonthlyOrYearly = activeTimeFilter === 'Month' || activeTimeFilter === 'Year';
            const cardInnerWidth = Dimensions.get('window').width - 2 * (spacing.xs + spacing.md + spacing.md);

            /* ─────────────────────────────── DG PV Grid ─────────────────────────────── */
            if (selectedChart === 'dg_pv_grid_management') {
              const dgRaw = chartData as {gridMeter?: any[]; solarMeter?: any[]; dgMeter?: any[]};
              const gridArr  = Array.isArray(dgRaw?.gridMeter)  ? dgRaw.gridMeter!  : [];
              const solarArr = Array.isArray(dgRaw?.solarMeter) ? dgRaw.solarMeter! : [];
              const dgArr    = Array.isArray(dgRaw?.dgMeter)    ? dgRaw.dgMeter!    : [];

              if (gridArr.length === 0 && solarArr.length === 0 && dgArr.length === 0) {
                return <Text style={styles.noDataText}>No data available</Text>;
              }

              const isDailyOrWeekly = activeTimeFilter === 'Daily' || activeTimeFilter === 'Week';

              const allTimestamps = Array.from(
                new Set([
                  ...gridArr.map((d: any) => d.timeStamp),
                  ...solarArr.map((d: any) => d.timeStamp),
                  ...dgArr.map((d: any) => d.timeStamp),
                ]),
              ).sort();

              const labelStep = Math.max(1, Math.floor(allTimestamps.length / 5));
              const fmtLabel = (ts: string, i: number): string => {
                if (isDailyOrWeekly) {
                  const d = new Date(ts.replace(' ', 'T'));
                  if (activeChartType === 'line') {
                    if (i % labelStep !== 0) return '';
                  } else {
                    if (d.getMinutes() !== 0 || d.getHours() % 2 !== 0) return '';
                  }
                  if (activeTimeFilter === 'Week') {
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`;
                  }
                  return `${String(d.getHours()).padStart(2, '0')}:00`;
                }
                return ts;
              };

              const toMap = (arr: any[]) =>
                Object.fromEntries(arr.map((d: any) => [d.timeStamp, d.todayEnergy ?? 0]));

              const gridMap  = toMap(gridArr);
              const solarMap = toMap(solarArr);
              const dgMap    = toMap(dgArr);

              const xLabels  = allTimestamps.map(fmtLabel);
              const gridData  = allTimestamps.map((ts, i) => ({value: gridMap[ts]  ?? 0, label: xLabels[i]}));
              const solarData = allTimestamps.map(ts => ({value: solarMap[ts] ?? 0}));
              const dgData    = allTimestamps.map(ts => ({value: dgMap[ts]    ?? 0}));

              const allValues = [
                ...gridData.map((d: any) => d.value),
                ...solarData.map((d: any) => d.value),
                ...dgData.map((d: any) => d.value),
              ];
              const primary = niceScale(Math.max(...allValues.filter(v => v >= 0), 0));

              const gridMin = Math.min(...gridData.map((d: any) => d.value), 0);
              const hasNegative = gridMin < 0;
              const noOfSectionsBelowXAxis = hasNegative
                ? Math.ceil(Math.abs(gridMin) / primary.stepValue)
                : 0;
              const mostNegativeValue = hasNegative
                ? -(noOfSectionsBelowXAxis * primary.stepValue)
                : undefined;

              const leftYWidth = 44;
              const n = allTimestamps.length;
              const chartWidth = cardInnerWidth - leftYWidth;
              const dynWidth = activeChartType === 'line' 
                ? Math.max((n - 1) * chartSpacing + 40, chartWidth)
                : Math.max(n * chartBarWidth + (n - 1) * chartSpacing + 40, chartWidth);

              const dataSet = [
                {data: gridData,  color: 'rgba(100,149,237,0.85)', hideDataPoints: true, thickness: 2},
                {data: solarData, color: 'rgba(255,165,0,0.85)',   hideDataPoints: true, thickness: 2},
                {data: dgData,    color: 'rgba(192,192,192,0.9)',  hideDataPoints: true, thickness: 2},
              ];

              const dgBarData = allTimestamps.map((ts: string, i: number) => {
                console.log("dgBarData --",dgBarData)
                const gridVal  = Math.max(0, gridMap[ts]  ?? 0);
                const solarVal = Math.max(0, solarMap[ts] ?? 0);
                const dgVal    = Math.max(0, dgMap[ts]    ?? 0);
                const total    = gridVal + solarVal + dgVal;
                return {
                  stacks: [
                    {value: gridVal,  color: 'rgba(100,149,237,0.85)'},
                    {value: solarVal, color: 'rgba(255,165,0,0.85)'},
                    {value: dgVal,    color: 'rgba(192,192,192,0.9)'},
                  ],
                  label: xLabels[i],
                  topLabelComponent: () => (
                    <Text style={styles.barValueLabel}>{formatEnergyYAxisLabel(String(total))}</Text>
                  ),
                };
              });
              const dgStackMax = allTimestamps.reduce((acc: number, ts: string) => {
                const total =
                  Math.max(0, gridMap[ts] ?? 0) +
                  Math.max(0, solarMap[ts] ?? 0) +
                  Math.max(0, dgMap[ts] ?? 0);
                return Math.max(acc, total);
              }, 0);
              const dgStackScale = niceScale(dgStackMax);

              return (
                <>
                  <GestureDetector gesture={pinchGesture}>
                    <View>
                      <GHScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false}>
                        {activeChartType === 'line' ? (
                          <LineChart
                            data={dataSet[0]?.data ?? []}
                            dataSet={dataSet.slice(1)}
                            height={300}
                            width={dynWidth}
                            spacing={chartSpacing}
                            yAxisLabelWidth={leftYWidth}
                            noOfSections={primary.noOfSections}
                            maxValue={primary.maxValue}
                            stepValue={primary.stepValue}
                            {...(hasNegative ? {mostNegativeValue, noOfSectionsBelowXAxis} : {})}
                            yAxisThickness={1}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={isDailyOrWeekly ? styles.xLabel : styles.xLabelWide}
                            xAxisTextNumberOfLines={2}
                            xAxisLabelsHeight={35}
                            formatYLabel={formatEnergyYAxisLabel}
                            pointerConfig={!isPinchingState ? {
                              pointerStripHeight: 300,
                              pointerStripColor: '#94A3B8',
                              pointerStripWidth: 1,
                              pointerColor: '#64748B',
                              radius: 4,
                              pointerLabelWidth: 170,
                              pointerLabelHeight: 84,
                              activatePointersOnLongPress: false,
                              persistPointer: true,
                              autoAdjustPointerLabelPosition: true,
                              pointerLabelComponent: (items: any[]) => (
                                <View style={styles.lineTooltip} pointerEvents="none">
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: 'rgba(100,149,237,0.85)'}]} />
                                    <Text style={styles.lineTooltipText}>Grid: {formatEnergyYAxisLabel(String((items[0]?.value ?? 0).toFixed(1)))}</Text>
                                  </View>
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: 'rgba(255,165,0,0.85)'}]} />
                                    <Text style={styles.lineTooltipText}>Solar: {formatEnergyYAxisLabel(String((items[1]?.value ?? 0).toFixed(1)))}</Text>
                                  </View>
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: 'rgba(192,192,192,0.9)'}]} />
                                    <Text style={styles.lineTooltipText}>DG: {formatEnergyYAxisLabel(String((items[2]?.value ?? 0).toFixed(1)))}</Text>
                                  </View>
                                </View>
                              ),
                            } : undefined}
                          />
                        ) : (
                          <BarChart
                            stackData={dgBarData}
                            height={300}
                            width={dynWidth}
                            spacing={chartSpacing}
                            yAxisLabelWidth={leftYWidth}
                            noOfSections={dgStackScale.noOfSections}
                            maxValue={dgStackScale.maxValue}
                            barWidth={chartBarWidth}
                            barBorderRadius={2}
                            yAxisThickness={1}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={isDailyOrWeekly ? styles.xLabel : styles.xLabelWide}
                            formatYLabel={formatEnergyYAxisLabel}
                          />
                        )}
                      </GHScrollView>
                    </View>
                  </GestureDetector>
                  <View style={styles.metrics}>
                    <View style={styles.dgLegendItem}>
                      <View style={styles.gridMeterColor} />
                      <Text style={styles.dgLegendText}>Grid Meter</Text>
                    </View>
                    <View style={styles.dgLegendItem}>
                      <View style={styles.solarMeterColor} />
                      <Text style={styles.dgLegendText}>Solar Meter</Text>
                    </View>
                    <View style={styles.dgLegendItem}>
                      <View style={styles.dgMeterColor} />
                      <Text style={styles.dgLegendText}>DG Meter</Text>
                    </View>
                  </View>
                </>
              );
            }

            /* ─────────────────────────────── String Current ─────────────────────────────── */
            if (selectedChart === 'string_current') {
              if (raw.length === 0) {
                return <Text style={styles.noDataText}>No data available</Text>;
              }

              const SC_KEYS = [
                'InputCurrent_01', 'InputCurrent_02', 'InputCurrent_03', 'InputCurrent_04',
                'InputCurrent_05', 'InputCurrent_06', 'InputCurrent_07', 'InputCurrent_08',
                'InputCurrent_09', 'InputCurrent_10', 'InputCurrent_11', 'InputCurrent_12',
              ];
              const SC_COLORS = [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4',
                '#E7598B', '#5B8FF9', '#F6BD16', '#6DC8EC',
              ];

              const isDailyOrWeekly = activeTimeFilter === 'Daily' || activeTimeFilter === 'Week';
              const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

              const sampled = isDailyOrWeekly
                ? raw.filter((_: any, i: number) => i % 6 === 0)
                : raw;

              const labelStep = Math.max(1, Math.floor(sampled.length / 5));
              const scFmtLabel = (ts: string, i: number): string => {
                const d = new Date(ts.replace(' ', 'T'));
                if (isDailyOrWeekly) {
                  if (activeChartType === 'line') {
                     if (i % labelStep !== 0) return '';
                  } else {
                     if (d.getMinutes() !== 0 || d.getHours() % 2 !== 0) return '';
                  }
                  if (activeTimeFilter === 'Week') {
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}\n${String(d.getHours()).padStart(2, '0')}:00`;
                  }
                  return `${String(d.getHours()).padStart(2, '0')}:00`;
                }
                if (activeChartType === 'line' && i % Math.max(1, Math.floor(sampled.length / 6)) !== 0) return '';
                if (activeTimeFilter === 'Month') {
                  const day = d.getDate();
                  return `${MONTHS_SHORT[d.getMonth()]} ${String(day).padStart(2, '0')}`;
                }
                return MONTHS_SHORT[d.getMonth()] || '';
              };

              const xLabels = sampled.map((d: any, i: number) => scFmtLabel(d.TimeStamp ?? '', i));

              const scDataSet = SC_KEYS.map((scKey, ki) => ({
                data: sampled.map((d: any) => ({
                  value: Math.max(0, (d[scKey] ?? 0)),
                })),
                color: SC_COLORS[ki],
                hideDataPoints: true,
                thickness: 1.5,
              }));

              const allValues = sampled.flatMap((d: any) =>
                SC_KEYS.map(k => Math.max(0, d[k] ?? 0)),
              );
              const scScale = niceScale(Math.max(...allValues, 0));

              const leftYWidth = 44;
              const scChartWidth = cardInnerWidth - leftYWidth;
              const dynWidth = activeChartType === 'line'
                ? Math.max((sampled.length - 1) * chartSpacing + 40, scChartWidth)
                : Math.max(sampled.length * chartBarWidth + (sampled.length - 1) * chartSpacing + 40, scChartWidth);

              const scStackData = sampled.map((d: any, i: number) => {
                const total = SC_KEYS.reduce((sum: number, k: string) => sum + Math.max(0, d[k] ?? 0), 0);
                return {
                  stacks: SC_KEYS.map((k: string, ki: number) => ({
                    value: Math.max(0, d[k] ?? 0),
                    color: SC_COLORS[ki],
                  })),
                  label: xLabels[i],
                  topLabelComponent: () => (
                    <Text style={styles.barValueLabel}>{formatEnergyYAxisLabel(String(total))}</Text>
                  ),
                };
              });
              const scStackMax = sampled.reduce((acc: number, d: any) => {
                const total = SC_KEYS.reduce((sum: number, k: string) => sum + Math.max(0, d[k] ?? 0), 0);
                return Math.max(acc, total);
              }, 0);
              const scStackScale = niceScale(scStackMax);

              return (
                <>
                  <GestureDetector gesture={pinchGesture}>
                    <View>
                      <GHScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false}>
                        {activeChartType === 'line' ? (
                          <LineChart
                            data={scDataSet[0]?.data ?? []}
                            dataSet={scDataSet.slice(1)}
                            isAnimated={false}
                            height={300}
                            width={dynWidth}
                            spacing={chartSpacing}
                            yAxisLabelWidth={leftYWidth}
                            noOfSections={scScale.noOfSections}
                            maxValue={scScale.maxValue}
                            stepValue={scScale.stepValue}
                            yAxisThickness={1}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={isDailyOrWeekly ? styles.xLabel : styles.xLabelWide}
                            xAxisLabelTexts={xLabels}
                            formatYLabel={formatEnergyYAxisLabel}
                            pointerConfig={!isPinchingState ? {
                              pointerStripHeight: 300,
                              pointerStripColor: '#94A3B8',
                              pointerStripWidth: 1,
                              pointerColor: '#64748B',
                              radius: 4,
                              pointerLabelWidth: 190,
                              pointerLabelHeight: 160,
                              activatePointersOnLongPress: false,
                              persistPointer: true,
                              autoAdjustPointerLabelPosition: true,
                              pointerLabelComponent: (items: any[]) => (
                                <View style={styles.lineTooltip} pointerEvents="none">
                                  {items.slice(0, 6).map((item: any, i: number) => (
                                    <View key={i} style={styles.lineTooltipRow}>
                                      <View style={[styles.lineTooltipDot, {backgroundColor: SC_COLORS[i]}]} />
                                      <Text style={styles.lineTooltipText}>{`IC ${String(i + 1).padStart(2, '0')}: ${(item?.value ?? 0).toFixed(2)} A`}</Text>
                                    </View>
                                  ))}
                                  {items.length > 6 && (
                                    <Text style={[styles.lineTooltipText, {color: '#9CA3AF', marginTop: 2}]}>
                                      +{items.length - 6} more…
                                    </Text>
                                  )}
                                </View>
                              ),
                            } : undefined}
                          />
                        ) : (
                          <BarChart
                            stackData={scStackData}
                            height={300}
                            width={dynWidth}
                            spacing={chartSpacing}
                            yAxisLabelWidth={leftYWidth}
                            noOfSections={scStackScale.noOfSections}
                            maxValue={scStackScale.maxValue}
                            barWidth={chartBarWidth}
                            barBorderRadius={2}
                            yAxisThickness={1}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={isDailyOrWeekly ? styles.xLabel : styles.xLabelWide}
                            xAxisTextNumberOfLines={2}
                            xAxisLabelsHeight={35}
                            formatYLabel={formatEnergyYAxisLabel}
                          />
                        )}
                      </GHScrollView>
                    </View>
                  </GestureDetector>
                  <View style={styles.scLegendContainer}>
                    {SC_KEYS.map((key, i) => (
                      <View key={key} style={styles.scLegendItem}>
                        <View style={[styles.scLegendDot, {backgroundColor: SC_COLORS[i]}]} />
                        <Text style={styles.scLegendText}>{`IC ${String(i + 1).padStart(2, '0')}`}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            }

            if (raw.length === 0) {
              return <Text style={styles.noDataText}>No data available</Text>;
            }

            /* ─────────────────────────────── Specific Yield ─────────────────────────────── */
            if (selectedChart === 'specific_yield') {
              const energyData = raw.map((d: any) => ({
                value: Math.max(0, d.todayEnergy ?? 0),
              }));
              const specificYieldData = raw.map((d: any) => ({
                value: Math.max(0, d.specificYield ?? 0),
              }));
              const useTimeStampAxis = activeTimeFilter != 'Daily';
              const labelStep = Math.max(1, Math.floor(raw.length / 5));
              const xLabels = raw.map((d: any, i: number) => {
                if (useTimeStampAxis) {
                  const ts = d.timeStamp ?? d.timestamp ?? d.TimeStamp;
                  if (!ts) return '';
                  if (activeChartType === 'line' && i % labelStep !== 0) return '';
                  return String(ts);
                }
                if (activeChartType === 'line' && i % labelStep !== 0) return '';
                return `INV ${String(i + 1).padStart(2, '0')}`;
              });
              const primary = niceScale(Math.max(...energyData.map((d: any) => d.value), 0));
              const secMax = Math.max(...specificYieldData.map((d: any) => d.value), 0);
              const secMaxRounded = roundUpMax(secMax);
              const secStep = secMaxRounded / primary.noOfSections;
              const secLabels = Array.from(
                {length: primary.noOfSections + 1},
                (_, i) => (i * secStep).toFixed(2),
              );
              const leftYWidth = useTimeStampAxis ? 44 : 35;
              const rightYWidth = 40;
              const chartWidth = cardInnerWidth - leftYWidth - rightYWidth;
              const dynWidth = activeChartType === 'line'
                ? Math.max((energyData.length - 1) * chartSpacing + leftYWidth + rightYWidth, cardInnerWidth)
                : Math.max(energyData.length * chartBarWidth + (energyData.length - 1) * chartSpacing + leftYWidth + rightYWidth, cardInnerWidth);

              return (
                <>
                  <GestureDetector gesture={pinchGesture}>
                    <View>
                      <GHScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false}>
                        {activeChartType === 'line' ? (
                          <LineChart
                            data={energyData}
                            secondaryData={specificYieldData}
                            height={300}
                            width={dynWidth}
                            yAxisLabelWidth={leftYWidth}
                            spacing={chartSpacing}
                            color1="#4b8aff"
                            secondaryLineConfig={{color: '#8979FF', thickness: 2, curved: false}}
                            thickness={2}
                            yAxisThickness={1}
                            yAxisColor="#4b8aff"
                            secondaryYAxis={{
                              noOfSections: primary.noOfSections,
                              maxValue: secMaxRounded,
                              stepValue: secStep,
                              showFractionalValues: true,
                              roundToDigits: 2,
                              yAxisColor: '#8979FF',
                              yAxisTextStyle: {...styles.axisText, color: '#8979FF'},
                              yAxisLabelWidth: 40,
                              yAxisLabelTexts: secLabels,
                            }}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            stepValue={primary.stepValue}
                            noOfSections={primary.noOfSections}
                            maxValue={primary.maxValue}
                            yAxisTextStyle={{...styles.axisText, color: '#4b8aff'}}
                            formatYLabel={formatEnergyYAxisLabel}
                            xAxisLabelTextStyle={styles.xLabelWide}
                            xAxisLabelTexts={xLabels}
                            pointerConfig={!isPinchingState ? {
                              pointerStripHeight: 300,
                              pointerStripColor: '#94A3B8',
                              pointerStripWidth: 1,
                              pointerColor: '#64748B',
                              radius: 4,
                              pointerLabelWidth: 180,
                              pointerLabelHeight: 64,
                              activatePointersOnLongPress: false,
                              persistPointer: true,
                              autoAdjustPointerLabelPosition: true,
                              pointerLabelComponent: (items: any[]) => (
                                <View style={styles.lineTooltip} pointerEvents="none">
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: '#4b8aff'}]} />
                                    <Text style={styles.lineTooltipText}>Energy: {formatEnergyYAxisLabel(String((items[0]?.value ?? 0).toFixed(1)))}</Text>
                                  </View>
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: '#8979FF'}]} />
                                    <Text style={styles.lineTooltipText}>Yield: {(items[1]?.value ?? 0).toFixed(2)} kWh/kWp</Text>
                                  </View>
                                </View>
                              ),
                            } : undefined}
                          />
                        ) : (
                          <BarChart
                            data={(() => {
                              const syFactor = secMaxRounded > 0 ? primary.maxValue / secMaxRounded : 1;
                              return raw.flatMap((d: any, i: number) => {
                                const energyVal = Math.max(0, d.todayEnergy  ?? 0);
                                const syVal     = Math.max(0, d.specificYield ?? 0);
                                const lbl = xLabels[i];
                                const isSelected = selectedBarIndex === i;
                                return [
                                  {
                                    value: energyVal,
                                    frontColor: '#4b8aff',
                                    spacing: 2,
                                    label: lbl,
                                    onPress: () => setSelectedBarIndex(isSelected ? null : i),
                                    topLabelComponent: () => isSelected ? (
                                      <View style={styles.barTooltip} pointerEvents="none">
                                        <Text style={styles.barTooltipValue}>Energy: {formatEnergyYAxisLabel(String(energyVal))}</Text>
                                        <Text style={styles.barTooltipValue}>Yield: {syVal.toFixed(2)}</Text>
                                        <View style={styles.barTooltipArrow} />
                                      </View>
                                    ) : (
                                      <Text style={styles.barValueLabel}>{formatEnergyYAxisLabel(String(energyVal))}</Text>
                                    ),
                                  },
                                  {
                                    value: syVal * syFactor,
                                    frontColor: '#8979FF',
                                    spacing: 14,
                                    topLabelComponent: () => isSelected ? null : (
                                      <Text style={styles.barValueLabel}>{syVal.toFixed(2)}</Text>
                                    ),
                                  },
                                ];
                              });
                            })()}
                            height={300}
                            width={Math.max(raw.length * 50 + 40, chartWidth + rightYWidth)}
                            barWidth={chartBarWidth}
                            spacing={2}
                            barBorderRadius={2}
                            yAxisThickness={1}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            noOfSections={primary.noOfSections}
                            maxValue={primary.maxValue}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={styles.xLabelWide}
                            formatYLabel={formatEnergyYAxisLabel}
                          />
                        )}
                      </GHScrollView>
                    </View>
                  </GestureDetector>
                  <View style={styles.metrics}>
                    <View style={styles.energyGenerationContainer}>
                      <View style={styles.energyGenerationColor} />
                      <Text>Energy Generation</Text>
                    </View>
                    <View style={styles.specificYieldContainer}>
                      <View style={styles.specificYieldColor} />
                      <Text>Specific Yield</Text>
                    </View>
                  </View>
                </>
              );
            }

            /* ─────────────────────────────── Monthly / Yearly ─────────────────────────────── */
            if (isMonthlyOrYearly) {
              const energyData = raw.map((d: any) => ({
                value: Math.max(0, d.todayEnergy ?? 0),
              }));
              const irradiationData = raw.map((d: any) => ({
                value: Math.max(0, d.irradiation ?? 0),
              }));
              const labelStep = Math.max(1, Math.floor(raw.length / 5));
              const xLabels = raw.map((d: any, i: number) => {
                const ts = d.timeStamp ?? d.timestamp ?? d.TimeStamp;
                if (!ts) return '';
                if (activeChartType === 'line' && i % labelStep !== 0) return '';
                return String(ts);
              });
              const yMax    = roundUpMax(Math.max(...energyData.map((d: any) => d.value), 0));
              const yMaxIrr = roundUpMax(Math.max(...irradiationData.map((d: any) => d.value), 0));
              const yMinIrr = roundUpMax(Math.min(...irradiationData.map((d: any) => d.value), 0));
              const dynWidth = Math.max((energyData.length - 1) * chartSpacing + 40, Dimensions.get('window').width - 55);

              return (
                <>
                  <GestureDetector gesture={pinchGesture}>
                    <View>
                      <GHScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false}>
                        {activeChartType === 'line' ? (
                          <LineChart
                            data={energyData}
                            secondaryData={irradiationData}
                            height={300}
                            width={dynWidth}
                            spacing={chartSpacing}
                            color1="#4b8aff"
                            secondaryLineConfig={{color: '#8979FF', thickness: 2, curved: true}}
                            thickness={2}
                            hideDataPoints
                            yAxisThickness={1}
                            yAxisColor="#4b8aff"
                            secondaryYAxis={{
                              noOfSections: 5,
                              maxValue: yMaxIrr,
                              yAxisColor: '#8979FF',
                              yAxisTextStyle: {...styles.axisText, color: '#8979FF'},
                            }}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            curved
                            yAxisTextStyle={{...styles.axisText, color: '#4b8aff'}}
                            xAxisLabelTextStyle={styles.xLabelWide}
                            noOfSections={5}
                            maxValue={yMax}
                            xAxisLabelTexts={xLabels}
                            pointerConfig={!isPinchingState ? {
                              pointerStripHeight: 300,
                              pointerStripColor: '#94A3B8',
                              pointerStripWidth: 1,
                              pointerColor: '#64748B',
                              radius: 4,
                              pointerLabelWidth: 190,
                              pointerLabelHeight: 64,
                              activatePointersOnLongPress: false,
                              persistPointer: true,
                              autoAdjustPointerLabelPosition: true,
                              pointerLabelComponent: (items: any[]) => (
                                <View style={styles.lineTooltip} pointerEvents="none">
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: '#4b8aff'}]} />
                                    <Text style={styles.lineTooltipText}>Energy: {formatEnergyYAxisLabel(String((items[0]?.value ?? 0).toFixed(1)))}</Text>
                                  </View>
                                  <View style={styles.lineTooltipRow}>
                                    <View style={[styles.lineTooltipDot, {backgroundColor: '#8979FF'}]} />
                                    <Text style={styles.lineTooltipText}>Irradiation: {(items[1]?.value ?? 0).toFixed(2)}</Text>
                                  </View>
                                </View>
                              ),
                            } : undefined}
                          />
                        ) : (
                          <BarChart
                            data={(() => {
                              return raw.map((d: any, i: number) => {
                                const energyVal = Math.max(0, d.todayEnergy ?? 0);
                                const irrVal    = Math.max(0, d.irradiation ?? 0);
                                const lbl = xLabels[i];
                                const isSelected = selectedBarIndex === i;
                                return {
                                  value: energyVal,
                                  frontColor: '#4b8aff',
                                  label: lbl,
                                  onPress: () => setSelectedBarIndex(isSelected ? null : i),
                                  topLabelComponent: () => isSelected ? (
                                    <View style={styles.barTooltip} pointerEvents="none">
                                      <Text style={styles.barTooltipValue}>Energy: {formatEnergyYAxisLabel(String(energyVal))}</Text>
                                      <Text style={styles.barTooltipValue}>Irr: {formatEnergyYAxisLabel(String(irrVal))}</Text>
                                      <View style={styles.barTooltipArrow} />
                                    </View>
                                  ) : (
                                    <Text style={styles.barValueLabel}>{formatEnergyYAxisLabel(String(energyVal))}</Text>
                                  ),
                                };
                              });
                            })()}
                            showLine
                            lineData={(() => {
                              const irrFactor = yMaxIrr > 0 ? yMax / yMaxIrr : 1;
                              return raw.map((d: any) => {
                                const irrVal = Math.max(0, d.irradiation ?? 0);
                                return { value: irrVal * irrFactor, dataPointText: '' };
                              });
                            })()}
                            lineConfig={{
                              color: '#8979FF',
                              thickness: 2,
                              hideDataPoints: false,
                              dataPointsColor: '#8979FF',
                            }}
                            height={300}
                            width={Math.max(raw.length * chartBarWidth + (raw.length - 1) * chartSpacing + 80, Dimensions.get('window').width - 55)}
                            barWidth={chartBarWidth}
                            spacing={2}
                            barBorderRadius={2}
                            yAxisThickness={1}
                            secondaryYAxis={{
                              noOfSections: 3,
                              maxValue: yMaxIrr,
                              yAxisColor: '#8979FF',
                              yAxisTextStyle: {...styles.axisText, color: '#8979FF'},
                            }}
                            xAxisThickness={1}
                            xAxisColor="#E5E7EB"
                            rulesColor="#E5E7EB"
                            rulesType="dashed"
                            dashGap={4}
                            dashWidth={3}
                            noOfSections={5}
                            maxValue={yMax}
                            yAxisTextStyle={styles.axisText}
                            xAxisLabelTextStyle={styles.xLabelWide}
                            formatYLabel={formatEnergyYAxisLabel}
                          />
                        )}
                      </GHScrollView>
                      {activeChartType === 'bar' && (
                        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, height: 300, width: 40, backgroundColor: 'white', justifyContent: 'space-between', borderLeftWidth: 1, borderLeftColor: '#E5E7EB' }}>
                          {Array.from({length: 6}).map((_, i) => (
                            <Text key={i} style={[styles.axisText, {color: '#8979FF', textAlign: 'center', transform: [{translateY: i === 0 ? -6 : i === 5 ? 6 : 0}]}]}>
                              {(yMaxIrr - i * (yMaxIrr / 5)).toFixed(2)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </GestureDetector>
                  <View style={styles.metrics}>
                    <View style={styles.irradianceContainer}>
                      <View style={styles.irradianceColor} />
                      <Text>Irradiation</Text>
                    </View>
                    <View style={styles.energyGenerationContainer}>
                      <View style={styles.energyGenerationColor} />
                      <Text>Energy Generation</Text>
                    </View>
                  </View>
                </>
              );
            }

            /* ─────────────────────────────── Daily / Weekly ─────────────────────────────── */
            const sampleStep = 6;
            const sampled = activeChartType === 'bar' ? raw : raw.filter((_: any, i: number) => i % sampleStep === 0);
            const activePowerData = sampled.map((d: any) => ({
              value: Math.max(0, d.totalActivePower ?? d.todayEnergy ?? 0),
            }));
            const irradiationData = sampled.map((d: any) => ({
              value: Math.max(0, d.irradiation ?? 0),
            }));
            const labelStep = Math.max(1, Math.floor(sampled.length / 5));
            const xLabels = sampled.map((d: any, i: number) => {
              const ts = d.timeStamp ?? d.timestamp ?? d.TimeStamp;
              if (!ts) return '';
              if (activeChartType === 'bar') {
                return String(ts);
              }
              if (i % labelStep === 0) {
                const date = new Date(ts.replace(' ', 'T'));
                if (activeTimeFilter === 'Week') {
                  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}\n${String(date.getHours()).padStart(2, '0')}:00`;
                }
                return `${String(date.getHours()).padStart(2, '0')}:00`;
              }
              return '';
            });
            const yMax    = roundUpMax(Math.max(...activePowerData.map((d: any) => d.value), 0));
            const yMaxIrr = roundUpMax(Math.max(...irradiationData.map((d: any) => d.value), 0));
            const dynWidth = Math.max((activePowerData.length - 1) * chartSpacing + 40, Dimensions.get('window').width - 55);

            return (
              <>
                <GestureDetector gesture={pinchGesture}>
                  <View>
                    <GHScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false}>
                      {activeChartType === 'line' ? (
                        <LineChart
                          data={activePowerData}
                          secondaryData={irradiationData}
                          height={300}
                          width={dynWidth}
                          spacing={chartSpacing}
                          color1="#FF928A"
                          secondaryLineConfig={{color: '#8979FF', thickness: 2, curved: true}}
                          thickness={2}
                          hideDataPoints
                          yAxisThickness={1}
                          yAxisColor="#FF928A"
                          secondaryYAxis={{
                            noOfSections: 5,
                            maxValue: yMaxIrr,
                            yAxisColor: '#8979FF',
                            yAxisTextStyle: {...styles.axisText, color: '#8979FF'},
                          }}
                          xAxisThickness={1}
                          xAxisColor="#E5E7EB"
                          rulesColor="#E5E7EB"
                          rulesType="dashed"
                          dashGap={4}
                          dashWidth={3}
                          curved
                          yAxisTextStyle={{...styles.axisText, color: '#FF928A'}}
                          xAxisLabelTextStyle={styles.xLabel}
                          xAxisTextNumberOfLines={2}
                          xAxisLabelsHeight={35}
                          noOfSections={5}
                          maxValue={yMax}
                          xAxisLabelTexts={xLabels}
                          pointerConfig={!isPinchingState ? {
                            pointerStripHeight: 300,
                            pointerStripColor: '#94A3B8',
                            pointerStripWidth: 1,
                            pointerColor: '#64748B',
                            radius: 4,
                            pointerLabelWidth: 190,
                            pointerLabelHeight: 64,
                            activatePointersOnLongPress: false,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: (items: any[]) => {
                              const irrVal = irradiationData[pointerIndex]?.value ?? 0;
                              return (
                              <View style={styles.lineTooltip} pointerEvents="none">
                                <View style={styles.lineTooltipRow}>
                                  <View style={[styles.lineTooltipDot, {backgroundColor: '#FF928A'}]} />
                                  <Text style={styles.lineTooltipText}>Active Power: {formatEnergyYAxisLabel(String((items[0]?.value ?? 0).toFixed(1)))}</Text>
                                </View>
                                <View style={styles.lineTooltipRow}>
                                  <View style={[styles.lineTooltipDot, {backgroundColor: '#8979FF'}]} />
                                  <Text style={styles.lineTooltipText}>Irradiation: {irrVal.toFixed(2)}</Text>
                                </View>
                              </View>);
                            },
                          } : undefined}
                          getPointerProps={({pointerIndex: idx}: {pointerIndex: number}) => {
                            setPointerIndex(idx);
                          }}
                        />
                      ) : (
                          <BarChart
                            data={(() => {
                              return sampled.map((d: any, i: number) => {
                                const energyVal = Math.max(0, d.todayEnergy ?? d.totalActivePower ?? 0);
                                const irrVal = Math.max(0, d.irradiation ?? 0);
                                const lbl = xLabels[i] || '';
                                const isSelected = selectedBarIndex === i;
                                return {
                                  value: energyVal,
                                  frontColor: '#4b8aff',
                                  label: lbl,
                                  onPress: () => setSelectedBarIndex(isSelected ? null : i),
                                  topLabelComponent: () => isSelected ? (
                                    <View style={styles.barTooltip} pointerEvents="none">
                                      <Text style={styles.barTooltipValue}>Energy: {formatEnergyYAxisLabel(String(energyVal))}</Text>
                                      <Text style={styles.barTooltipValue}>Irr: {formatEnergyYAxisLabel(String(irrVal))}</Text>
                                      <View style={styles.barTooltipArrow} />
                                    </View>
                                  ) : (
                                    <Text style={styles.barValueLabel}>{formatEnergyYAxisLabel(String(energyVal))}</Text>
                                  ),
                                };
                              });
                            })()}
                            showLine
                            lineData={(() => {
                              const irrFactor = yMaxIrr > 0 ? yMax / yMaxIrr : 1;
                              return sampled.map((d: any) => {
                                const irrVal = Math.max(0, d.irradiation ?? 0);
                                return { value: irrVal * irrFactor, dataPointText: '' };
                              });
                            })()}
                            lineConfig={{
                              color: '#8979FF',
                              thickness: 2,
                              hideDataPoints: false,
                              dataPointsColor: '#8979FF',
                            }}
                          height={300}
                          width={Math.max(sampled.length * chartBarWidth + (sampled.length - 1) * chartSpacing + 80, Dimensions.get('window').width - 55)}
                          barWidth={chartBarWidth}
                          spacing={2}
                          barBorderRadius={2}
                          yAxisThickness={1}
                          secondaryYAxis={{
                            noOfSections: 5,
                            maxValue: yMaxIrr,
                            yAxisColor: '#8979FF',
                            yAxisTextStyle: {...styles.axisText, color: '#8979FF'},
                          }}
                          xAxisThickness={1}
                          xAxisColor="#E5E7EB"
                          rulesColor="#E5E7EB"
                          rulesType="dashed"
                          dashGap={4}
                          dashWidth={3}
                          noOfSections={5}
                          maxValue={yMax}
                          yAxisTextStyle={styles.axisText}
                          xAxisLabelTextStyle={styles.xLabelWide}
                          formatYLabel={formatEnergyYAxisLabel}
                        />
                      )}
                    </GHScrollView>
                    {activeChartType === 'bar' && (
                      <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, height: 300, width: 40, backgroundColor: 'white', justifyContent: 'space-between', borderLeftWidth: 1, borderLeftColor: '#E5E7EB' }}>
                        {Array.from({length: 6}).map((_, i) => (
                          <Text key={i} style={[styles.axisText, {color: '#8979FF', textAlign: 'center', transform: [{translateY: i === 0 ? -6 : i === 5 ? 6 : 0}]}]}>
                            {(yMaxIrr - i * (yMaxIrr / 5)).toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </GestureDetector>
                <View style={styles.metrics}>
                  <View style={styles.irradianceContainer}>
                    <View style={styles.irradianceColor} />
                    <Text>Irradiation</Text>
                  </View>
                  <View style={activeChartType === 'bar' ? styles.energyGenerationContainer : styles.temperatureContainer}>
                    <View style={activeChartType === 'bar' ? styles.energyGenerationColor : styles.temperatureColor} />
                    <Text>{activeChartType === 'bar' ? 'Energy Generation' : 'Active Power'}</Text>
                  </View>
                </View>
              </>
            );
          })()}
        </View>

        <View style={styles.chartContainer}>
          <TabNavigator
            tabs={[
              {key: 'Daily', title: 'Daily'},
              {key: 'Week',  title: 'Week'},
              {key: 'Month', title: 'Month'},
              {key: 'Year',  title: 'Year'},
            ]}
            activeTab={activeTimeFilter}
            onTabChange={(key) => {
              setLoading(true);
              setActiveTimeFilter(key as typeof TIME_FILTERS[number]);
              setActiveChartType(key === 'Daily' ? 'line' : 'bar');
              setFromDate(null);
              setToDate(null);
            }}
            style={styles.tabNavigator}
          />
          <Text style={styles.chartTitle}>Range</Text>
          <Calendar
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xs,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dropdownWrapper: {
    flex: 1,
  },
  tabNavigator: {
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  irradianceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  irradianceColor: {
    width: 25,
    height: 5,
    backgroundColor: '#8979FF',
  },
  temperatureColor: {
    width: 25,
    height: 5,
    backgroundColor: '#FF928A',
  },
  axisText: {fontSize: 9, color: colors.mutedForeground},
  xLabel: {fontSize: 9, color: colors.mutedForeground, width: 44, textAlign: 'center'},
  xLabelWide: {fontSize: 9, color: colors.mutedForeground, width: 60, textAlign: 'center'},
  energyGenerationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  energyGenerationColor: {
    width: 25,
    height: 5,
    backgroundColor: '#4b8aff',
  },
  specificYieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  specificYieldColor: {
    width: 25,
    height: 5,
    backgroundColor: '#8979FF',
  },
  noDataText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  dgLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dgLegendText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  gridMeterColor: {
    width: 25,
    height: 5,
    backgroundColor: 'rgba(100,149,237,0.85)',
  },
  solarMeterColor: {
    width: 25,
    height: 5,
    backgroundColor: 'rgba(255,165,0,0.85)',
  },
  dgMeterColor: {
    width: 25,
    height: 5,
    backgroundColor: 'rgba(192,192,192,0.9)',
  },
  scLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  scLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scLegendDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  scLegendText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  barValueLabel: {
    fontSize: 8,
    color: colors.mutedForeground,
    marginBottom: 2,
    textAlign: 'center',
  },
  // Zoom controls
  zoomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: spacing.xs,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 18,
    color: '#374151',
    lineHeight: 22,
    fontWeight: fontWeight.medium,
  },
  // Line chart pointer tooltip
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
  // Bar chart press tooltip
  barTooltip: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    minWidth: 110,
    height: 35,
    flexShrink: 0,
    zIndex: 1000,
    elevation: 10,
  },
  barTooltipValue: {
    color: '#E5E7EB',
    fontSize: 9,
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
});

export default AnalyticsScreen;
