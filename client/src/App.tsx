import React from 'react';
import Layout from './components/Layout';
import ChatInterface from './components/ChatInterface';
import PDFPreview from './components/PDFPreview';
import { MathProblemProvider, useMathProblem } from './contexts/MathProblemContext';
import './App.css';

/**
 * PDFプレビューラッパーコンポーネント
 * コンテキストからPDF URLを取得して表示する
 */
const PDFPreviewWrapper: React.FC = () => {
  const { pdfUrl } = useMathProblem();
  
  return (
    <div className="pdf-preview-wrapper">
      <h3 className="pdf-preview-title">PDF表示</h3>
      <PDFPreview pdfPath={pdfUrl} />
    </div>
  );
};

/**
 * メインアプリケーションコンポーネント
 */
function App() {
  return (
    <MathProblemProvider>
      <div className="app-container">
        <Layout 
          chatArea={<ChatInterface />} 
          pdfArea={<PDFPreviewWrapper />} 
        />
      </div>
    </MathProblemProvider>
  );
}

export default App;
