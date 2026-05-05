import React from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {spacing, fontSize, fontWeight, borderRadius, colors} from '../../theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Welcome to Eira!',
    message: 'Thanks for joining us. Explore the app to get started.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    title: 'Profile Updated',
    message: 'Your profile information has been successfully updated.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '3',
    title: 'New Feature Available',
    message: 'Check out our new dark mode feature in settings!',
    time: '2 days ago',
    read: true,
  },
  {
    id: '4',
    title: 'Security Alert',
    message: 'A new device has logged into your account.',
    time: '3 days ago',
    read: true,
  },
];

const NotificationsScreen: React.FC = () => {
  const renderNotification = ({item}: {item: Notification}) => (
    <View
      style={[
        styles.notificationCard,
        item.read ? styles.readCard : styles.unreadCard,
      ]}>
      <View style={styles.notificationHeader}>
        <Text
          style={[
            styles.notificationTitle,
            {fontWeight: item.read ? fontWeight.medium : fontWeight.bold},
          ]}>
          {item.title}
        </Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTime}>{item.time}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mockNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  notificationCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  readCard: {
    backgroundColor: colors.white,
    borderLeftColor: colors.background,
  },
  unreadCard: {
    backgroundColor: '#EEF2FF',
    borderLeftColor: colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontSize: fontSize.md,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
  },
  notificationMessage: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
    color: colors.mutedForeground,
  },
  notificationTime: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
  },
});

export default NotificationsScreen;
