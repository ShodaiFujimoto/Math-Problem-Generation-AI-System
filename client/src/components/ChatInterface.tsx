import { useState, useRef } from 'react';
import MessageInput from './MessageInput';
import ChatHistory from './ChatHistory';
import { useMathProblem } from '../contexts/MathProblemContext';
import { getNextQuestion } from '../utils/api';
import './ChatInterface.css';

/**
 * チャットインターフェースコンポーネント
 * チャット履歴の表示とメッセージ入力機能を提供
 */
const ChatInterface: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    chatHistory, 
    addChatMessage, 
    updateProblemSpec,
    problemSpec,
    generateProblem
  } = useMathProblem();

  // 新しいメッセージを追加する関数
  const handleSendMessage = async (text: string) => {
    // ユーザーのメッセージを追加
    addChatMessage(text, 'user');
    
    // 処理中フラグを設定
    setIsProcessing(true);
    
    try {
      // APIに問い合わせて次の質問と更新された仕様を取得
      const result = await getNextQuestion(text, problemSpec);
      
      // 問題仕様を更新
      updateProblemSpec(result.updatedSpec);
      
      // AIの応答を追加
      addChatMessage(result.nextQuestion, 'ai');
      
      // すべての必須項目が入力されたら問題を生成
      if (result.isComplete) {
        // スロットフィリング完了時の問題仕様をログに出力
        console.log('スロットフィリング完了時の問題仕様:', {
          ...result.updatedSpec,
          format: result.updatedSpec.format // 特にフォーマットに注目
        });
        
        // 完了メッセージを表示
        addChatMessage('入力された情報から問題を生成します...', 'ai');
        
        // 問題生成処理を開始（更新された問題仕様を直接渡す）
        await generateProblem(result.updatedSpec);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // エラーメッセージを表示
      addChatMessage('申し訳ありません。メッセージの処理中にエラーが発生しました。', 'ai');
    } finally {
      // 処理中フラグを解除
      setIsProcessing(false);
    }
  };

  // ユニークIDを生成する関数
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  return (
    <div className="chat-interface">
      <div className="chat-history-container">
        <ChatHistory messages={chatHistory} />
      </div>
      <div className="message-input-container">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          disabled={isProcessing}
        />
      </div>
    </div>
  );
};

export default ChatInterface; 