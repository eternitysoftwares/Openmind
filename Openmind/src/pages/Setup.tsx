import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

function Setup() {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState({
    claude: '',
    chatgpt: '',
    gemini: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    
    if (user) {
      const keys = Object.entries(apiKeys).filter(([_, value]) => value);
      if (keys.length > 0) {
        await Promise.all(
          keys.map(([provider, api_key]) =>
            supabase
              .from('api_keys')
              .insert([{ user_id: user.id, provider, api_key }])
          )
        );
      }
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center p-4">
      <div className="absolute top-4 left-4">
        <button className="p-2 glass-bg rounded-lg">
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <h1 className="logo text-4xl text-white mt-16 mb-24">openmind</h1>

      <div className="w-full max-w-md">
        <h2 className="text-4xl font-light text-white text-center mb-3">
          Setup your ai's
        </h2>
        <p className="text-gray-400 text-center mb-12">
          Enter api key's if you have
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            placeholder="Gemini Api"
            className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={apiKeys.gemini}
            onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
          />
          <input
            type="password"
            placeholder="Chatgpt Api"
            className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={apiKeys.chatgpt}
            onChange={(e) => setApiKeys({ ...apiKeys, chatgpt: e.target.value })}
          />
          <input
            type="password"
            placeholder="Claude Api"
            className="w-full glass-input px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={apiKeys.claude}
            onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
          />

          <div className="space-y-4">
            <div className="rainbow-border">
              <button
                type="submit"
                className="w-full glass-button py-3 rounded-lg text-white font-light"
              >
                Complete Setup
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full glass-button py-3 rounded-lg text-gray-400 font-light text-sm"
            >
              I don't have any api, just want to use openmind
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Setup