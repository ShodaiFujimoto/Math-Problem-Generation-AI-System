import React, { useState } from 'react';
import './MessageInput.css';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

/**
 * メッセージ入力コンポーネント
 * テキスト入力フィールドと送信ボタンを提供
 */
const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-form">
      <div className="message-input-container">
        <input
          className="message-input"
          placeholder="メッセージを入力してください..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
        />
        <button
          className="send-button"
          type="submit"
          disabled={!message.trim() || disabled}
        >
          送信
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 