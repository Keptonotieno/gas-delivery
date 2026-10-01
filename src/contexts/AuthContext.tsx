import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  registerDriver: (data: any) => Promise<any>;
  logout: () => void;
  devSetUser: (mockUser: User | null) => void;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isDevMode = Boolean(import.meta.env.DEV);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string, role?: string): Promise<User> => {
    const res = await api.login(email, password, role);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await api.register(data);
    setUser(res.user);
    return res.user;
  };

  const registerDriver = async (data: any): Promise<any> => {
    const res = await api.applyAsDriver(data);
    return res;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  // Clean dev environment session override without interfering with production JWT auth
  const devSetUser = (mockUser: User | null) => {
    if (!isDevMode) return;
    if (mockUser) {
      // Safe base64 token compatible with server-side verifyToken
      const devPayload = {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7
      };
      const devToken = btoa(JSON.stringify(devPayload));
      localStorage.setItem('gasdeliver_token', devToken);
      localStorage.setItem('gasdeliver_user', JSON.stringify(mockUser));
      setUser(mockUser);
    } else {
      localStorage.removeItem('gasdeliver_token');
      localStorage.removeItem('gasdeliver_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        registerDriver,
        logout,
        devSetUser,
        isDevMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
