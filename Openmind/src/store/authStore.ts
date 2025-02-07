import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  error: string | null;
  setUser: (user: User | null) => void;
  signUp: (email: string, password: string, name: string, dob: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  error: null,
  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
  signUp: async (email, password, name, dob) => {
    try {
      set({ error: null });
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        set({ error: 'Please enter a valid email address' });
        return;
      }

      // Validate password
      if (password.length < 6) {
        set({ error: 'Password must be at least 6 characters long' });
        return;
      }

      // First create the auth user
      const { error: authError, data } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name,
            dob
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          set({ error: 'This email is already registered. Please sign in instead.' });
        } else {
          set({ error: authError.message });
        }
        return;
      }

      if (data.user) {
        // Then create the user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([{ 
            id: data.user.id,
            email, 
            name, 
            dob 
          }])
          .select()
          .single();
        
        if (profileError) {
          set({ error: 'Failed to create user profile. Please try again.' });
          return;
        }

        set({ user: { id: data.user.id, name, email } });
      }
    } catch (error) {
      set({ error: 'An unexpected error occurred. Please try again.' });
    }
  },
  signIn: async (email, password) => {
    try {
      set({ error: null });
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        set({ error: 'Please enter a valid email address' });
        return;
      }

      // Validate password is not empty
      if (!password.trim()) {
        set({ error: 'Please enter your password' });
        return;
      }

      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          set({ error: 'Incorrect email or password. Please try again.' });
        } else if (error.message.includes('Email not confirmed')) {
          set({ error: 'Please verify your email address before signing in.' });
        } else {
          set({ error: error.message });
        }
        return;
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          set({ error: 'Failed to load user profile. Please try again.' });
          return;
        }

        if (userData) {
          set({ user: { id: data.user.id, name: userData.name, email: userData.email } });
        } else {
          set({ error: 'User profile not found. Please contact support.' });
        }
      }
    } catch (error) {
      set({ error: 'An unexpected error occurred. Please try again.' });
    }
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        set({ error: 'Failed to sign out. Please try again.' });
      } else {
        set({ user: null, error: null });
      }
    } catch (error) {
      set({ error: 'An unexpected error occurred while signing out.' });
    }
  },
}));