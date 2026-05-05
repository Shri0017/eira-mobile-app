import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import {storage} from '../utils/storage';
import {STORAGE_KEYS} from '../constants';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: unknown) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await storage.get<string>(STORAGE_KEYS.USER_DATA);
      setIsAuthenticated(userData !== null);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (userData: unknown) => {
    await storage.set(STORAGE_KEYS.USER_DATA, userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    await storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.remove(STORAGE_KEYS.USER_DATA);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{isAuthenticated, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
