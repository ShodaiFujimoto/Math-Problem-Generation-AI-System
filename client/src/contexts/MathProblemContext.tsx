import React, { createContext, useContext, useState, ReactNode } from 'react';

// 数学問題の仕様（入力パラメータ）型定義
export interface ProblemSpec {
  topic: string;        // 数学分野（数と式、関数、図形、確率・統計など）
  difficulty: string;   // 難易度（小学生、中学生、高校生）
  format: string;       // 出題形式（記述式、選択式、計算問題など）
  count: number;        // 問題数（1〜10問）
  details: string;      // 詳細条件（特定トピックや要求）
  constraints?: string; // 制約条件（オプション）
  visualization?: any;  // 視覚化要素の指定（オプション）
}

// 生成された問題の型定義
export interface Problem {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  visualization?: any;
}

// 検証結果の型定義
export interface VerificationResult {
  is_valid: boolean;
  feedback: string;
  suggestions: string[];
}

// 状態管理のコンテキスト型定義
interface MathProblemContextProps {
  // 状態
  problemSpec: Partial<ProblemSpec>;
  currentProblem: Problem | null;
  isGenerating: boolean;
  pdfUrl: string | null;
  texContent: string | null;
  verificationResult: VerificationResult | null;
  chatHistory: Array<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
  }>;
  
  // アクション
  updateProblemSpec: (updates: Partial<ProblemSpec>) => void;
  resetProblemSpec: () => void;
  generateProblem: (directProblemSpec?: Partial<ProblemSpec>) => Promise<void>;
  clearCurrentProblem: () => void;
  addChatMessage: (message: string, sender: 'user' | 'ai') => void;
  updatePdfUrl: (url: string | null) => void;
  updateTexContent: (texContent: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

// デフォルト値の定義
const defaultContextValue: MathProblemContextProps = {
  problemSpec: {},
  currentProblem: null,
  isGenerating: false,
  pdfUrl: null,
  texContent: null,
  verificationResult: null,
  chatHistory: [
    {
      id: '1',
      sender: 'ai',
      text: 'どのような数学問題を生成しますか？',
      timestamp: new Date()
    }
  ],
  
  updateProblemSpec: () => {},
  resetProblemSpec: () => {},
  generateProblem: async () => {},
  clearCurrentProblem: () => {},
  addChatMessage: () => {},
  updatePdfUrl: () => {},
  updateTexContent: () => {},
  setIsGenerating: () => {}
};

// コンテキストの作成
const MathProblemContext = createContext<MathProblemContextProps>(defaultContextValue);

// コンテキストプロバイダコンポーネント
export const MathProblemProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // 状態の定義
  const [problemSpec, setProblemSpec] = useState<Partial<ProblemSpec>>({});
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // PDFのURLは常にnullで初期化
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [texContent, setTexContent] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [chatHistory, setChatHistory] = useState(defaultContextValue.chatHistory);

  // 問題仕様の更新
  const updateProblemSpec = (updates: Partial<ProblemSpec>) => {
    setProblemSpec(prev => ({ ...prev, ...updates }));
  };

  // 問題仕様のリセット
  const resetProblemSpec = () => {
    setProblemSpec({});
  };

  // PDF URLの直接更新
  const updatePdfUrl = (url: string | null) => {
    setPdfUrl(url);
  };

  // TeXコンテンツの直接更新
  const updateTexContent = (content: string | null) => {
    setTexContent(content);
  };

  // 問題生成APIの呼び出し
  const generateProblem = async (directProblemSpec?: Partial<ProblemSpec>) => {
    // 問題生成中のフラグをセット
    setIsGenerating(true);
    
    try {
      // 引数で直接渡された問題仕様があればそれを使用し、なければステートの値を使用
      const specToUse = directProblemSpec || problemSpec;
      
      // 問題生成前の問題仕様の詳細をログ出力
      console.log('問題生成直前の問題仕様状態:', {
        difficulty: specToUse.difficulty,
        topic: specToUse.topic,
        format: specToUse.format,
        formatType: typeof specToUse.format,
        formatLength: specToUse.format ? specToUse.format.length : 0,
        count: specToUse.count,
        countType: typeof specToUse.count,
        details: specToUse.details
      });

      // リクエストの詳細をログ出力
      console.log('問題生成API リクエスト内容:', { 
        problemSpec: specToUse, 
        problemSpecJSON: JSON.stringify({ problemSpec: specToUse }),
        countType: typeof specToUse.count
      });

      // APIエンドポイントを修正
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ problemSpec: specToUse }),
      });
      
      if (!response.ok) {
        // エラーレスポンスの詳細も取得
        const errorText = await response.text();
        console.error('問題生成API エラーレスポンス:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error('Problem generation failed: ' + errorText);
      }
      
      const data = await response.json();
      
      // 生成された問題をセット
      setCurrentProblem(data.current_problem);
      
      // 検証結果をセット（検証エージェントによる結果があれば）
      if (data.verification_result) {
        setVerificationResult(data.verification_result);
        
        // 検証結果に基づいてメッセージを追加
        if (data.verification_result.is_valid) {
          addChatMessage('問題が生成され、検証されました。問題は適切です。', 'ai');
        } else {
          const feedback = data.verification_result.feedback || '検証結果に問題があります。';
          addChatMessage(`問題が生成されましたが、検証で問題が見つかりました: ${feedback}`, 'ai');
        }
      } else {
        // 検証結果がない場合
        addChatMessage('問題が生成されました。PDFで確認できます。', 'ai');
      }
      
      // TeXコンテンツをセット（あれば）
      if (data.tex_content) {
        setTexContent(data.tex_content);
        addChatMessage('TeXコンテンツが生成されました。', 'ai');
      }
      
      // PDFのURLをセット（あれば）
      if (data.pdf_path) {
        // PDFパスをURLに変換
        try {
          // 絶対パスから相対パスへの変換
          const pdfFilename = data.pdf_path.split(/[\/\\]/).pop(); // Windows/Unix両方のパス区切り文字に対応
          
          if (pdfFilename) {
            const pdfUrl = `/api/pdf/${pdfFilename}`; // サーバーのPDFエンドポイントへのURLを作成
            setPdfUrl(pdfUrl);
            console.log('PDF URLが設定されました:', pdfUrl);
            addChatMessage('PDFが生成されました。右側パネルで確認できます。', 'ai');
          } else {
            console.error('PDFパスからファイル名を抽出できませんでした:', data.pdf_path);
          }
        } catch (error) {
          console.error('PDFパスの処理中にエラーが発生しました:', error, data.pdf_path);
        }
      } else {
        console.log('PDFパスがレスポンスに含まれていません。PDFは生成されていません。');
      }
      
    } catch (error) {
      console.error('Error generating problem:', error);
      addChatMessage('問題の生成中にエラーが発生しました。', 'ai');
    } finally {
      // 問題生成中のフラグを解除
      setIsGenerating(false);
    }
  };

  // 現在の問題をクリア
  const clearCurrentProblem = () => {
    setCurrentProblem(null);
    setPdfUrl(null);
    setTexContent(null);
    setVerificationResult(null);
  };

  // チャットメッセージの追加
  const addChatMessage = (message: string, sender: 'user' | 'ai') => {
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      text: message,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, newMessage]);
  };

  // コンテキスト値の定義
  const contextValue: MathProblemContextProps = {
    problemSpec,
    currentProblem,
    isGenerating,
    pdfUrl,
    texContent,
    verificationResult,
    chatHistory,
    
    updateProblemSpec,
    resetProblemSpec,
    generateProblem,
    clearCurrentProblem,
    addChatMessage,
    updatePdfUrl,
    updateTexContent,
    setIsGenerating
  };

  // プロバイダで子コンポーネントをラップ
  return (
    <MathProblemContext.Provider value={contextValue}>
      {children}
    </MathProblemContext.Provider>
  );
};

// カスタムフック
export const useMathProblem = () => useContext(MathProblemContext); 