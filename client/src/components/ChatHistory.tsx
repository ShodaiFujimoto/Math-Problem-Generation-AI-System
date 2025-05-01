import React from 'react';
import './ChatHistory.css';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface ChatHistoryProps {
  messages: Message[];
}

/**
 * チャット履歴表示コンポーネント
 * AIとユーザーのメッセージを区別して表示する
 */
const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  return (
    <div className="chat-history">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-bubble ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
        >
          <div className="message-header">
            <div className={`avatar ${message.sender === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
              {message.sender === 'user' ? 'U' : 'AI'}
            </div>
            <div className="sender-name">
              {message.sender === 'user' ? 'ユーザー' : 'AI'}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
          <div className="message-text">{message.text}</div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory; 