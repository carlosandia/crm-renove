import { createContext, useContext } from 'react';
import { User } from '../types/User';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshTokens: () => Promise<AuthTokens | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  loading: false,
  authenticatedFetch: async () => new Response(),
  refreshTokens: async () => null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;
