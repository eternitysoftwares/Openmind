import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  loadBookmarks: () => Promise<void>;
  addBookmark: (title: string, url: string) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarks: [],
  isLoading: false,
  loadBookmarks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        set({ bookmarks: data });
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  addBookmark: async (title: string, url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert([{ user_id: user.id, title, url }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          set((state) => ({
            bookmarks: [data, ...state.bookmarks],
          }));
        }
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  },
  deleteBookmark: async (id: string) => {
    try {
      await supabase.from('bookmarks').delete().eq('id', id);
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  },
}));