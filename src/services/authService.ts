import { UserProfile } from '../types';

const TOKEN_KEY = 'studymate_auth_token';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  data?: any;
  error?: string;
  message?: string;
}

export class AuthService {
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  static setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  static clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  static async signup(params: {
    name: string;
    email: string;
    password: string;
    gradeLevel?: string;
    selectedSubjects?: string[];
  }): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create account. Please check your information.',
        };
      }

      if (data.token) {
        this.setToken(data.token);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        data: data.data,
      };
    } catch (err: any) {
      console.error('[AuthService] signup error:', err);
      return {
        success: false,
        error: 'Unable to connect to authentication service. Please try again.',
      };
    }
  }

  static async login(params: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Invalid email or password.',
        };
      }

      if (data.token) {
        this.setToken(data.token);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        data: data.data,
      };
    } catch (err: any) {
      console.error('[AuthService] login error:', err);
      return {
        success: false,
        error: 'Unable to connect to authentication service. Please check your network connection.',
      };
    }
  }

  static async getMe(): Promise<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'No active session' };
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        this.clearToken();
        return {
          success: false,
          error: data.error || 'Session expired. Please log in again.',
        };
      }

      return {
        success: true,
        user: data.user,
        data: data.data,
      };
    } catch (err: any) {
      console.error('[AuthService] getMe error:', err);
      return {
        success: false,
        error: 'Failed to verify session.',
      };
    }
  }

  static async logout(): Promise<boolean> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn('[AuthService] logout API warning:', err);
    } finally {
      this.clearToken();
    }
    return true;
  }

  static async forgotPassword(email: string, newPassword?: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.error || 'Could not process request.',
          error: data.error,
        };
      }

      return {
        success: true,
        message: data.message || 'Password reset request processed successfully.',
      };
    } catch (err: any) {
      console.error('[AuthService] forgotPassword error:', err);
      return {
        success: false,
        message: 'Network error. Please try again.',
        error: 'Network error',
      };
    }
  }

  static async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        return data.user;
      }
    } catch (err) {
      console.error('[AuthService] updateProfile error:', err);
    }
    return null;
  }

  static async syncUserData(userData: any): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/user/data/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
      return res.ok;
    } catch (err) {
      console.warn('[AuthService] syncUserData error:', err);
      return false;
    }
  }
}
