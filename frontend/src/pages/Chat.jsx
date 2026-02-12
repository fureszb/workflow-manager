import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../utils/api';
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Bot,
  User,
  ChevronDown,
  Server,
  Cloud,
  Sparkles,
  BookOpen,
  Mail,
  HelpCircle,
  Zap,
  Search,
  X,
} from 'lucide-react';

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

// Quick prompt templates
const QUICK_PROMPTS = [
  {
    label: 'Projekt státusz',
    prompt: 'Hol tart jelenleg a projektem? Összefoglalnád a legfontosabb teendőket?',
    icon: Sparkles,
  },
  {
    label: 'Dokumentáció',
    prompt: 'Mit tartalmaz a tudásbázis? Milyen dokumentumok vannak feltöltve?',
    icon: BookOpen,
  },
  {
    label: 'Email összefoglaló',
    prompt: 'Mi volt az utolsó fontos email? Összefoglalnád a lényeget?',
    icon: Mail,
  },
  {
    label: 'Segítség',
    prompt: 'Miben tudsz segíteni? Milyen kérdéseket tehetek fel?',
    icon: HelpCircle,
  },
];

const Chat = () => {
  // Conversations state
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Provider/model state
  const [openrouterModels, setOpenrouterModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // RAG toggle
  const [useRag, setUseRag] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // WebSocket ref
  const wsRef = useRef(null);

  // Ref to track accumulated streaming content (avoids closure issues)
  const streamingContentRef = useRef('');

  // Refs
  const messagesEndRef = useRef(null);
  const modelDropdownRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load conversations on mount and when search changes
  useEffect(() => {
    loadConversations(debouncedSearch);
  }, [debouncedSearch]);

  // Load OpenRouter models when provider is openrouter
  useEffect(() => {
    if (activeConversation?.ai_provider === 'openrouter' && openrouterModels.length === 0) {
      loadOpenrouterModels();
    }
  }, [activeConversation?.ai_provider, openrouterModels.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadConversations = async (search = '') => {
    try {
      const params = search ? { search } : {};
      const res = await api.get('/v1/chat/conversations', { params });
      setConversations(res.data);
    } catch {
      toast.error('Hiba a beszélgetések betöltésekor');
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const res = await api.get(`/v1/chat/conversations/${convId}`);
      setActiveConversation(res.data);
      setMessages(res.data.messages || []);
    } catch {
      toast.error('Hiba a beszélgetés betöltésekor');
    }
  };

  const loadOpenrouterModels = async () => {
    setLoadingModels(true);
    try {
      const res = await api.get('/v1/ai/models/openrouter');
      setOpenrouterModels(res.data);
    } catch {
      // Silently fail - might not have API key configured
    } finally {
      setLoadingModels(false);
    }
  };

  const createConversation = async () => {
    try {
      const res = await api.post('/v1/chat/conversations', {
        title: 'Új beszélgetés',
      });
      setConversations((prev) => [res.data, ...prev]);
      setActiveConversation(res.data);
      setMessages([]);
      toast.success('Új beszélgetés létrehozva');
    } catch {
      toast.error('Hiba a beszélgetés létrehozásakor');
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/v1/chat/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversation?.id === convId) {
        setActiveConversation(null);
        setMessages([]);
      }
      toast.success('Beszélgetés törölve');
    } catch {
      toast.error('Hiba a beszélgetés törlésekor');
    }
  };

  const updateConversationSettings = async (updates) => {
    if (!activeConversation) return;

    try {
      const res = await api.patch(`/v1/chat/conversations/${activeConversation.id}`, updates);
      setActiveConversation(res.data);
      setConversations((prev) =>
        prev.map((c) => (c.id === res.data.id ? res.data : c))
      );
    } catch {
      toast.error('Hiba a beállítások mentésekor');
    }
  };

  const toggleProvider = () => {
    const newProvider = activeConversation?.ai_provider === 'ollama' ? 'openrouter' : 'ollama';
    updateConversationSettings({ ai_provider: newProvider, model_name: null });

    // Load models if switching to openrouter
    if (newProvider === 'openrouter' && openrouterModels.length === 0) {
      loadOpenrouterModels();
    }
  };

  const selectModel = (modelId) => {
    updateConversationSettings({ model_name: modelId });
    setShowModelDropdown(false);
  };

  const sendMessageWithStreaming = useCallback(async (content) => {
    if (!content.trim() || !activeConversation || sending) return;

    setInputValue('');
    setSending(true);
    setStreamingContent('');
    streamingContentRef.current = '';

    // Optimistically add user message
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // Get WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '').replace(/\/api$/, '') || 'localhost:8000';
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/chat/conversations/${activeConversation.id}/stream`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          content: content.trim(),
          use_rag: useRag,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            toast.error(data.error);
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
            setSending(false);
            setStreamingContent('');
            return;
          }

          if (data.done && data.assistant_message_id) {
            // Final message - replace temp message and add assistant message
            // Use ref value to avoid closure issues with stale streamingContent
            const finalContent = streamingContentRef.current;
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
              return [
                ...filtered,
                {
                  id: data.user_message_id,
                  role: 'user',
                  content: content.trim(),
                  created_at: new Date().toISOString(),
                  tokens_used: data.input_tokens,
                },
                {
                  id: data.assistant_message_id,
                  role: 'assistant',
                  content: finalContent,
                  created_at: new Date().toISOString(),
                  tokens_used: data.output_tokens,
                },
              ];
            });
            setStreamingContent('');
            streamingContentRef.current = '';
            setSending(false);
            ws.close();
          } else if (data.token) {
            streamingContentRef.current += data.token;
            setStreamingContent((prev) => prev + data.token);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = () => {
        // Fallback to non-streaming endpoint
        fallbackToNonStreaming(content.trim(), tempUserMessage);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {
      // Fallback to non-streaming endpoint
      fallbackToNonStreaming(content.trim(), tempUserMessage);
    }
  }, [activeConversation, sending, useRag]);

  const fallbackToNonStreaming = async (content, tempUserMessage) => {
    try {
      const res = await api.post(
        `/v1/chat/conversations/${activeConversation.id}/message-with-rag`,
        { content }
      );

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempUserMessage.id)
          .concat([res.data.user_message, res.data.assistant_message])
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      const errorMsg = err.response?.data?.detail || 'Hiba az üzenet küldésekor';
      toast.error(errorMsg);
    } finally {
      setSending(false);
      setStreamingContent('');
    }
  };

  const sendMessage = () => {
    sendMessageWithStreaming(inputValue);
  };

  const handleQuickPrompt = (prompt) => {
    if (!activeConversation) {
      toast.error('Először hozzon létre egy beszélgetést');
      return;
    }
    sendMessageWithStreaming(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getModelDisplayName = (modelId) => {
    if (!modelId) return 'Alapértelmezett';
    const model = openrouterModels.find((m) => m.id === modelId);
    if (model) return model.name || model.id;
    // Shorten long model IDs for display
    if (modelId.length > 30) {
      const parts = modelId.split('/');
      return parts[parts.length - 1];
    }
    return modelId;
  };

  // Render sidebar with conversations
  const renderSidebar = () => (
    <div
      className="w-64 flex-shrink-0 border-r overflow-hidden flex flex-col"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="p-3 border-b space-y-2" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={createConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <Plus size={18} />
          Új beszélgetés
        </button>

        {/* Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés..."
            className="w-full pl-9 pr-8 py-2 rounded border text-sm"
            style={inputStyle}
            data-testid="conversation-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-500/10"
              title="Keresés törlése"
            >
              <X size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <div className="p-4 text-center">
            <Loader2 className="animate-spin mx-auto" size={24} style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            {searchQuery ? 'Nincs találat' : 'Még nincsenek beszélgetések'}
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`p-3 cursor-pointer border-b transition-colors flex items-center justify-between group ${
                activeConversation?.id === conv.id ? 'bg-opacity-50' : ''
              }`}
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor:
                  activeConversation?.id === conv.id ? 'var(--bg-card)' : 'transparent',
              }}
              data-testid={`conversation-${conv.id}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {conv.title || 'Új beszélgetés'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {conv.ai_provider === 'openrouter' ? 'Online' : 'Lokális'}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => deleteConversation(conv.id, e)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                title="Törlés"
                data-testid={`delete-conversation-${conv.id}`}
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render provider toggle and model selector
  const renderProviderControls = () => {
    if (!activeConversation) return null;

    const isOnline = activeConversation.ai_provider === 'openrouter';

    return (
      <div className="flex items-center gap-3">
        {/* RAG toggle */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
            useRag ? 'bg-opacity-50' : ''
          }`}
          onClick={() => setUseRag(!useRag)}
          style={{
            ...cardStyle,
            backgroundColor: useRag ? 'var(--accent)' : 'var(--bg-secondary)',
            borderColor: useRag ? 'var(--accent)' : 'var(--border-color)',
          }}
          data-testid="rag-toggle"
          title="Tudásbázis használata"
        >
          <BookOpen size={14} style={{ color: useRag ? 'white' : 'var(--text-secondary)' }} />
          <span className="text-xs font-medium" style={{ color: useRag ? 'white' : 'var(--text-primary)' }}>
            RAG
          </span>
        </div>

        {/* Provider toggle */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors"
          onClick={toggleProvider}
          style={{
            ...cardStyle,
            backgroundColor: isOnline ? 'var(--bg-secondary)' : 'var(--bg-card)',
          }}
          data-testid="provider-toggle"
        >
          {isOnline ? (
            <>
              <Cloud size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Online
              </span>
            </>
          ) : (
            <>
              <Server size={16} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Lokális
              </span>
            </>
          )}
        </div>

        {/* Model selector (only for OpenRouter) */}
        {isOnline && (
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded border transition-colors"
              style={cardStyle}
              data-testid="model-selector"
            >
              {loadingModels ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {getModelDisplayName(activeConversation.model_name)}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                </>
              )}
            </button>

            {showModelDropdown && openrouterModels.length > 0 && (
              <div
                className="absolute top-full left-0 mt-1 w-80 max-h-64 overflow-y-auto rounded border shadow-lg z-50"
                style={cardStyle}
                data-testid="model-dropdown"
              >
                {openrouterModels.slice(0, 50).map((model) => (
                  <div
                    key={model.id}
                    onClick={() => selectModel(model.id)}
                    className="px-3 py-2 cursor-pointer hover:bg-opacity-50 transition-colors border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor:
                        activeConversation.model_name === model.id
                          ? 'var(--bg-secondary)'
                          : 'transparent',
                    }}
                    data-testid={`model-option-${model.id}`}
                  >
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {model.name || model.id}
                    </p>
                    {model.pricing && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        ${(parseFloat(model.pricing.prompt || 0) * 1000000).toFixed(2)}/1M tokens
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render quick prompt buttons
  const renderQuickPrompts = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {QUICK_PROMPTS.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(item.prompt)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-80"
            style={{
              ...cardStyle,
              opacity: sending ? 0.5 : 1,
            }}
            disabled={sending}
            data-testid={`quick-prompt-${idx}`}
          >
            <Icon size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  // Render chat messages with markdown
  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !streamingContent ? (
        <div className="h-full flex flex-col items-center justify-center">
          <Bot size={48} className="mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Kezdjen el egy beszélgetést az AI asszisztenssel
          </p>
          {activeConversation && renderQuickPrompts()}
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                }}
              >
                {msg.role === 'user' ? (
                  <User size={16} style={{ color: 'white' }} />
                ) : (
                  <Bot size={16} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
                }`}
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                }}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                <p
                  className="text-xs mt-1 opacity-70"
                  style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}
                >
                  {formatDate(msg.created_at)}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Zap size={16} className="animate-pulse" style={{ color: 'var(--accent)' }} />
              </div>
              <div
                className="max-w-[70%] rounded-lg rounded-tl-none px-4 py-2"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Thinking indicator (when sending but no streaming yet) */}
          {sending && !streamingContent && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Loader2 className="animate-spin" size={16} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div
                className="rounded-lg rounded-tl-none px-4 py-2"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <p style={{ color: 'var(--text-secondary)' }}>Gondolkodik...</p>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // Render main chat area
  const renderChatArea = () => {
    if (!activeConversation) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={64} className="mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              AI Chat Asszisztens
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Válasszon ki egy beszélgetést vagy hozzon létre újat
            </p>
            <button
              onClick={createConversation}
              className="flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors mx-auto"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Plus size={18} />
              Új beszélgetés
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with provider controls */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {activeConversation.title || 'Beszélgetés'}
          </h2>
          {renderProviderControls()}
        </div>

        {/* Messages */}
        {renderMessages()}

        {/* Quick prompts when there are messages */}
        {messages.length > 0 && (
          <div className="px-4 pb-2">
            {renderQuickPrompts()}
          </div>
        )}

        {/* Input */}
        <div
          className="p-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Írja be üzenetét..."
              rows={1}
              className="flex-1 px-4 py-2 rounded border resize-none"
              style={inputStyle}
              disabled={sending}
              data-testid="chat-input"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || sending}
              className="px-4 py-2 rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              data-testid="send-button"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .markdown-content p {
          margin-bottom: 0.5em;
        }
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 1.5em;
          margin-bottom: 0.5em;
        }
        .markdown-content li {
          margin-bottom: 0.25em;
        }
        .markdown-content code {
          background-color: var(--bg-secondary);
          padding: 0.1em 0.3em;
          border-radius: 0.25em;
          font-size: 0.9em;
        }
        .markdown-content pre {
          background-color: var(--bg-secondary);
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 0.5em 0;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          margin-top: 0.5em;
          margin-bottom: 0.25em;
          font-weight: 600;
        }
        .markdown-content blockquote {
          border-left: 3px solid var(--border-color);
          padding-left: 1em;
          margin: 0.5em 0;
          opacity: 0.8;
        }
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5em 0;
        }
        .markdown-content th, .markdown-content td {
          border: 1px solid var(--border-color);
          padding: 0.5em;
          text-align: left;
        }
        .markdown-content th {
          background-color: var(--bg-secondary);
        }
      `}</style>
      <div
        className="rounded-lg border overflow-hidden flex"
        style={{ ...cardStyle, height: 'calc(100vh - 140px)' }}
      >
        {renderSidebar()}
        {renderChatArea()}
      </div>
    </>
  );
};

export default Chat;
