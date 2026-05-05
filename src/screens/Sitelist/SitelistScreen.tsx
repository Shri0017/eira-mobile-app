import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {View, Text, StyleSheet, FlatList, Alert, ActivityIndicator} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import {Header, SearchBar, SiteCard, StatusFilter} from '../../components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SiteListService from '@/api/siteListService';

const PLAT_STATUS = ['All Plants', 'Active', 'Down', 'Warning', 'Offline'] as const;
type PlantStatusType = (typeof PLAT_STATUS)[number];

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

const matchesSearch = (site: any, query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  return Object.values(site).some(val => {
    if (val == null) return false;
    return String(val).toLowerCase().includes(lowerQuery);
  });
};

const SitelistScreen: React.FC = () => {
  const [activePlantStatus, setActivePlantStatus] = useState<PlantStatusType>('All Plants');
  const [siteList, setSiteList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSiteList = async () => {
      try {
        setLoading(true);
        const response = await SiteListService.getSiteListByUserId();
        setSiteList(response ?? []);
      } catch (error) {
        Alert.alert('Error', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchSiteList();
  }, []);

  const filteredList = useMemo(() => {
    let result = siteList;

    if (activePlantStatus !== 'All Plants') {
      result = result.filter((site: any) => site.siteStatus === activePlantStatus);
    }

    if (searchQuery.trim()) {
      result = result.filter((site: any) => matchesSearch(site, searchQuery.trim()));
    }

    return result;
  }, [siteList, activePlantStatus, searchQuery]);

  const listHeader = useMemo(() => (
    <>
      <View style={styles.searchContainer}>
        <View style={styles.searchBarWrapper}>
          <SearchBar
            placeholder="Search by site name"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterButton}>
          <Ionicons name="filter" size={20} color={colors.white} />
        </View>
      </View>

      <StatusFilter
        options={PLAT_STATUS}
        activeOption={activePlantStatus}
        onSelect={option => setActivePlantStatus(option as PlantStatusType)}
      />
    </>
  ), [searchQuery, activePlantStatus]);

  const renderItem = useCallback(({item}: {item: any}) => (
    <SiteCard
      siteId={item.siteId}
      name={item.siteName}
      updatedAgo={item.lastUpdatedTimestamp ? formatTimeAgo(item.lastUpdatedTimestamp) : '--'}
      date={item.lastUpdatedTimestamp ? formatDate(item.lastUpdatedTimestamp) : '--'}
      status={item.siteStatus}
      todayEnergy={item.sumOfTodayEnergy ?? '--'}
      totalEnergy={item.sumOfTotalEnergy ?? '--'}
      specificYield={item.specificYield?.toFixed(2) ?? '--'}
      capacity={String(item.installationCapacity ?? '--')}
      inverters={`${item.activeInverterCount ?? 0}/${item.inverterCount ?? 0}`}
      irradiation={item.irradiation ?? '--'}
    />
  ), []);

  const listEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sites found</Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      <Header />
      {listHeader}
      <FlatList
        style={{ flex: 1 }}
        data={filteredList}
        renderItem={renderItem}
        keyExtractor={item => String(item.siteId)}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[styles.plantList, {paddingBottom: 65 + spacing.md}]}
        showsVerticalScrollIndicator={false}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  searchBarWrapper: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantList: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
  },
});

export default SitelistScreen;
