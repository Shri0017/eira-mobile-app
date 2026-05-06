import React, { useState } from 'react';
import { View, Image, ImageBackground, StyleSheet, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { AxiosError } from 'axios';
import { fontSize, fontWeight, borderRadius, spacing, colors } from '../../theme/spacing';
import { Input } from '../../components';
import Button from '../../components/Button';
import AuthService from '@/api/authService';
import { PassEncrypt } from '@/utils/encryption';
import { useAuth } from '@/context';
import Entypo from 'react-native-vector-icons/Entypo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      next.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Enter a valid email address';
    }

    if (!password) {
      next.password = 'Password is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data = {
        deviceType: 'Mobile',
        email: email.trim(),
        password: PassEncrypt(password),
      };
      const response = await AuthService.login(data);
      await login(response);
    } catch (error) {
      const axiosErr = error as AxiosError<{ statusDescription?: string }>;
      const message = axiosErr.response?.data?.statusDescription ?? axiosErr.message ?? 'Something went wrong';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        bounces={false}
      >
        <ImageBackground
          source={require('../../assets/images/banner.png')}
          resizeMode='cover'
          style={styles.background}
        >
          <View style={styles.container}>
            <Image source={require('../../assets/logo/loginScreenLogo.png')} resizeMode='contain' style={styles.logo} />
            <Text style={styles.title}>Empowering Your</Text>
            <Text style={styles.title}>Solar Investment</Text>
          </View>
        </ImageBackground>
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>Login to Inspire</Text>
          <Input
            placeholder='Enter Email'
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors(prev => ({ ...prev, email: undefined })); }}
            error={errors.email}
            keyboardType='email-address'
            autoCapitalize='none'
          />
          <View style={styles.passwordWrapper}>
            <Input
              placeholder='Enter Password'
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors(prev => ({ ...prev, password: undefined })); }}
              error={errors.password}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(prev => !prev)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            >
              <Entypo
                name={showPassword ? 'eye' : 'eye-with-line'}
                size={20}
                color='#94A3B8'
              />
            </TouchableOpacity>
          </View>
          <Button title='Login' onPress={handleLogin} />
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    width: '100%',
    flex: 1,
    minHeight: 300,
  },
  // overlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: 'rgba(0, 0, 0, 0.30)',
  // },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.medium,
    color: 'white',
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: -borderRadius.lg,
    gap: spacing.sm,
    marginBottom: 20,
  },
  contentTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: 'black',
    marginBottom: spacing.sm,
  },
  forgotPassword: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    color: colors.primary,
    textAlign: 'right',
    marginTop: spacing.md,
  },
  passwordWrapper: {
    width: '100%',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 15,
  },
});

export default LoginScreen;