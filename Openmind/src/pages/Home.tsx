import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, User, Bookmark, Bot, Trash2, Copy, Check, Paperclip, Image, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/chatStore';
import { useBookmarkStore } from '../store/bookmarkStore';

interface SuggestedPrompt {
  title: string;
  description: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

const suggestedPrompts: SuggestedPrompt[] = [
  {
    title: "Draft an email",
    description: "to reply to job offer"
  },
  {
    title: "How does Ai",
    description: "work in technical capacity"
  },
  {
    title: "Explain neural",
    description: "networks to me"
  }
];

function Home() {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openmind');
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [newBookmark, setNewBookmark] = useState({ title: '', url: '' });
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', prompt: '' });
  const [agents, setAgents] = useState<Array<{ id: string; name: string; description: string; prompt: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollTop = useRef(0);

  const { messages, isLoading, sendMessage } = useChatStore();
  const { bookmarks, loadBookmarks, addBookmark, deleteBookmark } = useBookmarkStore();

  useEffect(() => {
    loadUserData();
    loadBookmarks();
    loadAgents();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowHeader(scrollTop < lastScrollTop.current || scrollTop < 100);
      lastScrollTop.current = scrollTop;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserName(data.name);
        setUserEmail(data.email);
      }
    }
  };

  const loadAgents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);
      if (data) {
        setAgents(data);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (error) throw error;

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          const newAttachment = {
            id: data.path,
            name: file.name,
            url: publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'file'
          };

          setAttachments(prev => [...prev, newAttachment]);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = async (id: string) => {
    try {
      await supabase.storage
        .from('attachments')
        .remove([id]);

      setAttachments(prev => prev.filter(att => att.id !== id));
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    let messageToSend = input;
    if (attachments.length > 0) {
      const attachmentsList = attachments
        .map(att => `[${att.name}](${att.url})`)
        .join('\n');
      messageToSend = `${input}\n\nAttachments:\n${attachmentsList}`;
    }
    
    if (selectedAgent) {
      const agent = agents.find(a => a.id === selectedAgent);
      if (agent) {
        messageToSend = `${agent.prompt}\n\nUser: ${messageToSend}`;
      }
    }
    
    await sendMessage(messageToSend, selectedModel);
    setInput('');
    setAttachments([]);
  };

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBookmark(newBookmark.title, newBookmark.url);
    setNewBookmark({ title: '', url: '' });
    setShowBookmarkForm(false);
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          user_id: user.id,
          name: newAgent.name,
          description: newAgent.description,
          prompt: newAgent.prompt
        }])
        .select()
        .single();

      if (!error && data) {
        setAgents([...agents, data]);
        setNewAgent({ name: '', description: '', prompt: '' });
        setShowAgentForm(false);
      }
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(index);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-800 to-black">
      {/* Left Sidebar */}
      <div className="fixed left-4 top-24 glass-bg rounded-lg p-2 flex flex-col space-y-2">
        <button 
          onClick={() => {
            setShowBookmarks(true);
            setShowBookmarkForm(false);
          }}
          className="flex items-center space-x-2 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-800/50"
        >
          <Bookmark className="w-5 h-5" />
          <span>Bookmark</span>
        </button>
        <button 
          onClick={() => setShowAgentForm(true)}
          className="flex items-center space-x-2 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-800/50"
        >
          <Bot className="w-5 h-5" />
          <span>Agent</span>
        </button>
      </div>

      {/* Bookmarks Modal */}
      {showBookmarks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-bg rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light text-white">Bookmarks</h2>
              <button
                onClick={() => setShowBookmarks(false)}
                className="p-2 glass-button rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <button
              onClick={() => setShowBookmarkForm(true)}
              className="w-full glass-button mb-4 py-2 rounded-lg text-white"
            >
              Add Bookmark
            </button>

            {showBookmarkForm && (
              <form onSubmit={handleAddBookmark} className="mb-4 space-y-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={newBookmark.title}
                  onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                  className="w-full glass-input px-4 py-2 rounded-lg text-white"
                />
                <input
                  type="url"
                  placeholder="URL"
                  value={newBookmark.url}
                  onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                  className="w-full glass-input px-4 py-2 rounded-lg text-white"
                />
                <button
                  type="submit"
                  className="w-full bg-white py-2 rounded-lg text-gray-900"
                >
                  Save
                </button>
              </form>
            )}

            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center justify-between p-3 glass-button rounded-lg"
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300"
                  >
                    {bookmark.title}
                  </a>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Modal */}
      {showAgentForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-bg rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light text-white">AI Agents</h2>
              <button
                onClick={() => setShowAgentForm(false)}
                className="p-2 glass-button rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="mb-6 space-y-4">
              <input
                type="text"
                placeholder="Agent Name"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                className="w-full glass-input px-4 py-2 rounded-lg text-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                className="w-full glass-input px-4 py-2 rounded-lg text-white"
              />
              <textarea
                placeholder="System Prompt"
                value={newAgent.prompt}
                onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                className="w-full glass-input px-4 py-2 rounded-lg text-white min-h-[100px]"
              />
              <button
                type="submit"
                className="w-full bg-white py-2 rounded-lg text-gray-900"
              >
                Create Agent
              </button>
            </form>

            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-3 glass-button rounded-lg cursor-pointer ${
                    selectedAgent === agent.id ? 'border border-white/30' : ''
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-medium">{agent.name}</h3>
                    {selectedAgent === agent.id && (
                      <span className="text-xs text-green-400">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-40 transition-transform duration-300 ${
        showHeader ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center space-x-4">
          <button className="p-2 glass-button rounded-lg">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <h1 className="logo text-3xl text-white absolute left-1/2 -translate-x-1/2">openmind</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-2 glass-button px-4 py-2 rounded-lg text-gray-300"
            >
              <span>{selectedModel === 'openmind' ? 'OpenMind' : selectedModel}</span>
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 glass-bg rounded-lg shadow-xl">
                {['Google', 'Gemini', 'Claude', 'Chatgpt', 'Openmind'].map((model) => (
                  <button
                    key={model.toLowerCase()}
                    onClick={() => {
                      setSelectedModel(model.toLowerCase());
                      setShowMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800/50"
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 glass-button rounded-lg"
            >
              <User className="w-5 h-5 text-gray-300" />
            </button>
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-64 glass-bg rounded-lg shadow-xl p-4">
                <div className="text-white">
                  <h3 className="font-medium mb-1">{userName}</h3>
                  <p className="text-sm text-gray-400">{userEmail}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        <h2 className="text-5xl text-white mb-2">
          Hi there, {userName}
        </h2>
        <h3 className="text-5xl font-light text-white mb-12">What would like to know?</h3>
        <p className="text-gray-400 text-center mb-8">
          Use one the most common prompts<br />below or use your own to begin
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {suggestedPrompts.map((prompt, index) => (
            <button
              key={index}
              className="glass-button p-4 rounded-lg text-left"
              onClick={() => setInput(`${prompt.title} ${prompt.description}`)}
            >
              <p className="text-white font-light">{prompt.title}</p>
              <p className="text-gray-400">{prompt.description}</p>
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="mb-8 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`relative group max-w-[80%] ${
                  message.role === 'user'
                    ? 'glass-bg rounded-2xl rounded-tr-sm'
                    : 'glass-bg rounded-2xl rounded-tl-sm'
                } p-4`}
                >
                  <p className="text-white text-sm whitespace-pre-wrap">{message.content}</p>
                  <button
                    onClick={() => handleCopyMessage(message.content, index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedMessageId === index ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="glass-bg rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                  <p className="text-gray-300 text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-4xl mx-auto">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((file) => (
                <div key={file.id} className="flex items-center glass-bg rounded-lg p-2">
                  {file.type === 'image' ? (
                    <Image className="w-4 h-4 text-gray-400 mr-2" />
                  ) : (
                    <File className="w-4 h-4 text-gray-400 mr-2" />
                  )}
                  <span className="text-sm text-white mr-2">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask whatever you want..."
              className="w-full bg-black/20 backdrop-blur-xl pl-4 pr-24 py-3 rounded-full text-white placeholder-gray-500 focus:outline-none border border-white/10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
                disabled={isUploading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isUploading}
                className="p-1"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;