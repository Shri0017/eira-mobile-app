import React, { useEffect, useState } from 'react';
import {View, StyleSheet, ScrollView, Alert} from 'react-native';
import {spacing, colors} from '../../theme';
import {Header, SiteHealthCard, PerformanceTabs} from '../../components';
import SiteListService from '@/api/siteListService';

const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [dashboardDetails, setDashboardDetails] = useState<any>(null);
  const [siteList, setSiteList] = useState<any>(null);
  useEffect(() => {
    const fetchDashboardDetailsAndSiteList = async () => {
      try {
      setLoading(true);
        const dashboardDetailsResponse = await SiteListService.getDashboardDetailsByUserId();
        console.log('get dashboard details response -->', dashboardDetailsResponse);
        setDashboardDetails(dashboardDetailsResponse);
        const siteListResponse = await SiteListService.getSiteListByUserId();
        console.log('get site list response -->', siteListResponse);
        setSiteList(siteListResponse);
        setLoading(false);
      } catch (error) {
        Alert.alert('Error', (error as Error).message);
      }
      finally {
        setLoading(false);
      }
    };
    fetchDashboardDetailsAndSiteList();
  }, []);
  return (
    <View style={styles.container}>
      <Header />
      
        <SiteHealthCard dashboardDetails={dashboardDetails} />
        <PerformanceTabs overallPerformance={dashboardDetails} siteList={siteList} loading={loading} />
        
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xs,
  },
});

export default HomeScreen;
