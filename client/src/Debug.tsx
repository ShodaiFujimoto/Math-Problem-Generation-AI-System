import React from 'react';
import { MathProblemProvider } from './contexts/MathProblemContext';
import DebugContext from './components/DebugContext';
import './Debug.css';

/**
 * デバッグ用のページコンポーネント
 * コンテキストの動作確認用
 */
const Debug: React.FC = () => {
  return (
    <div className="debug-page">
      <header className="debug-header">
        <h1>状態管理デバッグページ</h1>
        <p>MathProblemContextの初期化と状態更新の動作確認</p>
      </header>
      
      <main className="debug-main">
        <MathProblemProvider>
          <DebugContext />
        </MathProblemProvider>
      </main>
    </div>
  );
};

export default Debug; 