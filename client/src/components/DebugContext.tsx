import React, { useState } from 'react';
import { useMathProblem } from '../contexts/MathProblemContext';
import { mockGenerateProblem, mockGetNextQuestion, mockDownloadPdf, mockHealthCheck } from '../mocks/mockApi';
import { generateProblem, getNextQuestion, downloadPdf, checkHealth } from '../utils/api';
import './DebugContext.css';

/**
 * コンテキストのデバッグ表示用コンポーネント
 * 開発時にMathProblemContextの状態を確認するためのコンポーネント
 */
const DebugContext: React.FC = () => {
  const {
    problemSpec,
    currentProblem,
    isGenerating,
    pdfUrl,
    chatHistory,
    updateProblemSpec,
    resetProblemSpec,
    addChatMessage,
    updatePdfUrl,
    setIsGenerating
  } = useMathProblem();

  // API通信テスト用の状態
  const [apiTestStatus, setApiTestStatus] = useState<{
    loading: boolean;
    success: boolean | null;
    message: string;
  }>({
    loading: false,
    success: null,
    message: ''
  });

  // API通信モードの切り替え（モック/実際）
  const [useMockApi, setUseMockApi] = useState(true);

  // オブジェクトを見やすい形式で表示するヘルパー関数
  const formatObject = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  // テスト用の問題仕様更新
  const handleTestUpdate = () => {
    updateProblemSpec({
      topic: '関数',
      difficulty: '高校生',
      format: '記述式',
      count: 1,
      details: '二次関数のグラフと直線の共有点を求める問題'
    });
  };

  // テスト用のチャットメッセージ追加
  const handleTestAddMessage = () => {
    addChatMessage('これはテストメッセージです', 'user');
  };

  // テスト用のリセット
  const handleTestReset = () => {
    resetProblemSpec();
  };

  // サンプルPDFのロード
  const handleLoadSamplePdf = async () => {
    setApiTestStatus({
      loading: true,
      success: null,
      message: 'サンプルPDF取得中...'
    });
    setIsGenerating(true);

    try {
      // 相対パスを使用
      const pdfUrl = '/public/sample.pdf';
      
      // PDFのURLをコンテキストに設定
      updatePdfUrl(pdfUrl);
      
      setApiTestStatus({
        loading: false,
        success: true,
        message: `サンプルPDF読み込み成功: ${pdfUrl}`
      });
    } catch (error) {
      setApiTestStatus({
        loading: false,
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`
      });
      updatePdfUrl(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // ヘルスチェックAPIテスト
  const testHealthCheck = async () => {
    setApiTestStatus({
      loading: true,
      success: null,
      message: 'ヘルスチェックAPI通信中...'
    });

    try {
      let result;
      if (useMockApi) {
        result = await mockHealthCheck();
      } else {
        result = await checkHealth();
      }
      
      setApiTestStatus({
        loading: false,
        success: true,
        message: `ヘルスチェックAPI成功: ${JSON.stringify(result)}`
      });
    } catch (error) {
      setApiTestStatus({
        loading: false,
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // 問題生成APIテスト
  const testGenerateProblem = async () => {
    setApiTestStatus({
      loading: true,
      success: null,
      message: '問題生成API通信中...'
    });

    try {
      let result;
      if (useMockApi) {
        result = await mockGenerateProblem(problemSpec);
      } else {
        result = await generateProblem(problemSpec);
      }
      
      setApiTestStatus({
        loading: false,
        success: true,
        message: `問題生成API成功: ${JSON.stringify(result).substring(0, 100)}...`
      });
    } catch (error) {
      setApiTestStatus({
        loading: false,
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // 次の質問APIテスト
  const testGetNextQuestion = async () => {
    setApiTestStatus({
      loading: true,
      success: null,
      message: '次の質問API通信中...'
    });

    try {
      // テスト用メッセージと現在の仕様を使用
      let result;
      if (useMockApi) {
        result = await mockGetNextQuestion('テストメッセージ', problemSpec);
      } else {
        result = await getNextQuestion('テストメッセージ', problemSpec);
      }
      
      setApiTestStatus({
        loading: false,
        success: true,
        message: `次の質問API成功: ${JSON.stringify(result).substring(0, 100)}...`
      });
    } catch (error) {
      setApiTestStatus({
        loading: false,
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // PDFダウンロードテスト
  const testDownloadPdf = async () => {
    setApiTestStatus({
      loading: true,
      success: null,
      message: 'PDF生成API通信中...'
    });

    try {
      let result;
      if (useMockApi) {
        result = await mockDownloadPdf();
      } else {
        // 実際のAPIではPDF IDが必要
        const pdfId = pdfUrl ? pdfUrl.split('/').pop() || 'test-pdf' : 'test-pdf';
        result = await downloadPdf(pdfId);
      }
      
      setApiTestStatus({
        loading: false,
        success: true,
        message: `PDF生成API成功: Blobサイズ ${result.size} bytes`
      });
    } catch (error) {
      setApiTestStatus({
        loading: false,
        success: false,
        message: `エラー: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  return (
    <div className="debug-container">
      <h2>デバッグパネル</h2>
      
      {/* API通信モード切り替え */}
      <div className="api-mode-toggle">
        <label>
          <input
            type="checkbox"
            checked={useMockApi}
            onChange={() => setUseMockApi(!useMockApi)}
          />
          モックAPIを使用する（チェックを外すと実際のAPIを呼び出します）
        </label>
      </div>
      
      {/* API通信テスト結果表示 */}
      {apiTestStatus.success !== null && (
        <div className={`api-test-result ${
          apiTestStatus.loading ? 'loading' : apiTestStatus.success ? 'success' : 'error'
        }`}>
          {apiTestStatus.loading && <span className="api-spinner"></span>}
          {apiTestStatus.message}
        </div>
      )}

      <div className="debug-section">
        <h3>問題仕様 (problemSpec)</h3>
        <pre>{formatObject(problemSpec)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>現在の問題 (currentProblem)</h3>
        <pre>{currentProblem ? formatObject(currentProblem) : 'null'}</pre>
      </div>
      
      <div className="debug-section">
        <h3>生成中フラグ (isGenerating)</h3>
        <pre>{String(isGenerating)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>PDF URL (pdfUrl)</h3>
        <pre>{pdfUrl || 'null'}</pre>
      </div>
      
      <div className="debug-section">
        <h3>チャット履歴 (chatHistory)</h3>
        <pre>{formatObject(chatHistory)}</pre>
      </div>

      <div className="debug-section">
        <h3>状態更新テスト</h3>
        <div className="debug-actions">
          <button onClick={handleTestUpdate} className="debug-button">
            テスト: 問題仕様更新
          </button>
          <button onClick={handleTestAddMessage} className="debug-button">
            テスト: メッセージ追加
          </button>
          <button onClick={handleTestReset} className="debug-button">
            テスト: リセット
          </button>
          <button onClick={handleLoadSamplePdf} className="debug-button">
            テスト: サンプルPDF読み込み
          </button>
        </div>
      </div>
      
      <div className="debug-section">
        <h3>API通信テスト ({useMockApi ? 'モックAPI' : '実API'})</h3>
        <div className="button-group">
          <button 
            onClick={testHealthCheck}
            disabled={apiTestStatus.loading}
            className="debug-button"
          >
            ヘルスチェックテスト
          </button>
          <button 
            onClick={testGenerateProblem}
            disabled={apiTestStatus.loading}
            className="debug-button"
          >
            問題生成テスト
          </button>
          <button 
            onClick={testGetNextQuestion}
            disabled={apiTestStatus.loading}
            className="debug-button"
          >
            次の質問テスト
          </button>
          <button 
            onClick={testDownloadPdf}
            disabled={apiTestStatus.loading}
            className="debug-button"
          >
            PDF生成テスト
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugContext; 