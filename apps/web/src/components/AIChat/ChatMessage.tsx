import React from 'react';
import { Bot, User } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../stores/aiChatStore';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Parse markdown-like text into formatted HTML
function formatMessage(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Skip empty lines but add spacing
    if (!line.trim()) {
      elements.push(<div key={`space-${lineIndex}`} className="h-2" />);
      return;
    }

    // Check for headers (## or ###)
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={lineIndex} className="font-semibold text-sm mt-2 mb-1">
          {formatInlineText(line.slice(4))}
        </h4>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={lineIndex} className="font-bold text-sm mt-2 mb-1">
          {formatInlineText(line.slice(3))}
        </h3>
      );
      return;
    }

    // Check for bullet points
    if (line.match(/^[\-\*•]\s/)) {
      elements.push(
        <div key={lineIndex} className="flex gap-2 ml-1">
          <span className="text-primary-500 font-bold">•</span>
          <span>{formatInlineText(line.slice(2))}</span>
        </div>
      );
      return;
    }

    // Check for numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={lineIndex} className="flex gap-2 ml-1">
          <span className="text-primary-500 font-semibold min-w-[1.2rem]">{numberedMatch[1]}.</span>
          <span>{formatInlineText(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={lineIndex} className="leading-relaxed">
        {formatInlineText(line)}
      </p>
    );
  });

  return <>{elements}</>;
}

// Format inline text (bold, italic, code)
function formatInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold (**text**)
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Check for italic (*text*)
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index)}</span>);
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Check for inline code (`code`)
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(
        <code key={key++} className="bg-gray-200 dark:bg-dark-600 px-1.5 py-0.5 rounded text-xs font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches, add remaining text
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-primary-600 text-white'
          : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className={`px-4 py-2.5 rounded-2xl ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
        }`}>
          <div className="text-sm space-y-1">
            {isUser ? message.content : formatMessage(message.content)}
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-2">
          {time}
        </span>
      </div>
    </div>
  );
}
