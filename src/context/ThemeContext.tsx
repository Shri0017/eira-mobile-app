import React, {createContext, useContext, ReactNode} from 'react';
import {StatusBar} from 'react-native';
import {lightColors, ThemeColors} from '../theme/colors';

interface ThemeContextType {
  theme: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const theme = lightColors;

  return (
    <ThemeContext.Provider value={{theme}}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
