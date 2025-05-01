import React, { ReactNode } from 'react';
import './Layout.css';

interface LayoutProps {
  chatArea: ReactNode;
  pdfArea: ReactNode;
}

/**
 * アプリケーションの基本レイアウト
 * 左側にチャットインターフェース、右側にPDFプレビュー領域を配置する2カラムレイアウト
 */
const Layout: React.FC<LayoutProps> = ({ chatArea, pdfArea }) => {
  return (
    <div className="layout-container">
      <div className="layout-row">
        {/* チャットエリア - 画面左側 （モバイルでは上部） */}
        <div className="chat-area">
          {chatArea}
        </div>

        {/* PDFプレビューエリア - 画面右側 （モバイルでは下部） */}
        <div className="pdf-area">
          {pdfArea}
        </div>
      </div>
    </div>
  );
};

export default Layout; 