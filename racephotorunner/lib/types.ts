export type Role = 'admin' | 'photographer' | 'athlete' | 'moderator';

export interface User {
  id: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  role?: Role;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
} 