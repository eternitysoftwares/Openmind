import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  sendMessage: (content: string, model: string) => Promise<void>;
}

const GEMINI_API_KEY = '';

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  sendMessage: async (content: string, model: string) => {
    set({ isLoading: true });
    
    try {
      // Add user message
      get().addMessage({ role: 'user', content });

      if (model.toLowerCase() === 'google') {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(content)}`, '_blank');
        return;
      }

      let response;
      
      // Check if user has API key for selected model
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: apiKey } = await supabase
          .from('api_keys')
          .select('api_key')
          .eq('user_id', user.id)
          .eq('provider', model.toLowerCase())
          .single();

        if (apiKey) {
          // Use user's API key
          // For now, we'll just use Gemini as an example
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey.api_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: content }] }]
            })
          });
        }
      }

      // Fallback to default Gemini API if no user API key
      if (!response) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: content }] }]
          })
        });
      }

      const data = await response.json();
      const assistantMessage = data.candidates[0].content.parts[0].text;

      get().addMessage({ role: 'assistant', content: assistantMessage });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));