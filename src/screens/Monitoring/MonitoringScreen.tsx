import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';
import {Header} from '../../components';

const MonitoringScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Header />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Status</Text>
        <Text style={styles.cardText}>
          Monitor your systems and view real-time data here.
        </Text>
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
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
});

export default MonitoringScreen;
