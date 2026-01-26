import { Sparkles, X } from 'lucide-react';
import { useAIChatStore } from '../../stores/aiChatStore';
import ChatWindow from './ChatWindow';

export default function AIChatWidget() {
  const { isOpen, setOpen, clearMessages } = useAIChatStore();

  const handleToggle = () => {
    if (isOpen) {
      // Clear messages when closing
      clearMessages();
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && <ChatWindow />}

      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-br from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 hover:scale-110'
        }`}
        title={isOpen ? 'Close AI Assistant' : 'Ask BuildPro AI'}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Sparkles size={24} className="text-white" />
        )}
      </button>

      {/* Pulse animation when closed */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 animate-ping opacity-20 z-40 pointer-events-none" />
      )}
    </>
  );
}
