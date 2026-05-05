import React, {useState} from 'react';
import {
  View,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {colors, spacing, borderRadius, fontSize, fontWeight} from '../theme';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { useAuth } from '@/context';

const Header: React.FC = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const {logout} = useAuth();

  const handleProfile = () => {
    setDropdownVisible(false);
    // TODO: navigate to profile screen
  };

  const handleLogOut = async () => {
    setDropdownVisible(false);
    await logout();
  };

  return (
    <View style={styles.header}>
      <Image
        source={require('../assets/logo/InspireEnergyLogo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      <View style={styles.headerIcons}>
        <View style={styles.iconWrapper}>
          <Fontisto name="bell" color={colors.black} size={24} />
        </View>

        <TouchableOpacity
          style={styles.iconWrapper}
          onPress={() => setDropdownVisible(true)}
          activeOpacity={0.7}>
          <FontAwesome name="user-circle" color={colors.black} size={30} />
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={dropdownVisible}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}>
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleProfile}
              activeOpacity={0.7}>
              <FontAwesome
                name="user"
                size={16}
                color={colors.black}
                style={styles.dropdownIcon}
              />
              <Text style={styles.dropdownText}>Profile</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleLogOut}
              activeOpacity={0.7}>
              <FontAwesome
                name="sign-out"
                size={16}
                color="#EF4444"
                style={styles.dropdownIcon}
              />
              <Text style={[styles.dropdownText, styles.logoutText]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingTop: Platform.OS === 'ios' ? spacing.xl : 0,
  },
  headerLogo: {
    width: 150,
    height: 100,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 90,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 150,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dropdownIcon: {
    marginRight: spacing.sm,
    width: 18,
    textAlign: 'center',
  },
  dropdownText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
  logoutText: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: spacing.sm,
  },
});

export default Header;
