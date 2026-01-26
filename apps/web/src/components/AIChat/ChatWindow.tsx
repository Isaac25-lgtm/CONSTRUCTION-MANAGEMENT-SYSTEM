import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Sparkles, Loader2, Download } from 'lucide-react';
import { useAIChatStore } from '../../stores/aiChatStore';
import { useDataStore } from '../../stores/dataStore';
import { askBuildProAI } from '../../services/geminiService';
import { formatProjectContext } from '../../utils/projectContext';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    selectedProjectId,
    setOpen,
    setLoading,
    addMessage,
    clearMessages
  } = useAIChatStore();

  const { projects, tasks, risks, expenses, milestones } = useDataStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    addMessage('user', text);
    setLoading(true);

    const context = formatProjectContext(
      projects,
      tasks,
      risks,
      expenses,
      milestones,
      selectedProjectId || undefined
    );

    const response = await askBuildProAI(text, context);

    if (response.success) {
      addMessage('assistant', response.message);
    } else {
      addMessage('assistant', `I apologize, but I encountered an error: ${response.error || 'Unable to process your request'}. Please try again.`);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    clearMessages();
    setOpen(false);
  };

  const handleDownload = () => {
    if (messages.length === 0) return;

    // Format messages for download
    const content = messages.map(msg => {
      const time = msg.timestamp.toLocaleString();
      const role = msg.role === 'user' ? 'You' : 'BuildPro AI';
      // Clean markdown for plain text
      const cleanContent = msg.content
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1');
      return `[${time}] ${role}:\n${cleanContent}\n`;
    }).join('\n---\n\n');

    const header = `BuildPro AI Insights\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const fullContent = header + content;

    // Create and download file
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildpro-ai-insights-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">BuildPro AI</h3>
            <p className="text-xs text-white/70">Construction Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleDownload}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Download insights"
            >
              <Download size={18} />
            </button>
          )}
          <button
            onClick={clearMessages}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Clear chat"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to BuildPro AI
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your intelligent construction project assistant. Ask me about project analysis, risk assessment, budget advice, or Uganda construction insights.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Try one of the quick actions below to get started
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
                <div className="bg-gray-100 dark:bg-dark-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <QuickActions onSelect={handleSend} disabled={isLoading} />

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BuildPro AI..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
