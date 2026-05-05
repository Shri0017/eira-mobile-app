import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {spacing, fontSize, fontWeight, colors} from '../../theme';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import OverviewTab from './OverviewTab';
import InvertersTab from './InvertersTab';
import StringsTab from './StringsTab';
import MeterTab from './MeterTab';

const TABS = ['Overview', 'Inverters', 'Strings', 'Meters', 'Alarms'] as const;

const SiteDetailScreen: React.FC = () => {
  const {width: SCREEN_WIDTH} = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SiteDetail'>>();
  const {name, siteId, irradiation} = route.params;
  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({x: index * SCREEN_WIDTH, animated: true});
  };

  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'Overview':
        return <OverviewTab siteId={siteId} />;
      case 'Inverters':
        return <InvertersTab siteId={siteId} irradiation={irradiation} />;
      case 'Strings':
        return <StringsTab siteId={siteId} />;
      case 'Meters':
        return <MeterTab siteId={siteId} />;
      default:
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{tab}</Text>
            <Text style={styles.placeholderSub}>Coming soon</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
      </View>

      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            onPress={() => handleTabPress(index)}
            style={[styles.tabItem, activeTab === index && styles.tabItemActive]}>
            <Text style={[styles.tabLabel, activeTab === index && styles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}>
        {TABS.map(tab => (
          <View key={tab} style={{width: SCREEN_WIDTH}}>
            {renderTabContent(tab)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.white},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {marginRight: spacing.sm, padding: spacing.xs},
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.foreground,
  },
  tabBarContent: {paddingHorizontal: spacing.md},
  tabItem: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {borderBottomColor: colors.primary},
  tabLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
  tabLabelActive: {color: colors.primary, fontWeight: fontWeight.semibold},
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  placeholderText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  placeholderSub: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});

export default SiteDetailScreen;
