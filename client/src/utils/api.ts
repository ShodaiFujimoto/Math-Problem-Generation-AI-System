import { ProblemSpec, Problem } from '../contexts/MathProblemContext';

// API呼び出しのベースURL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3000/api';

// APIレスポンスの型定義
interface GenerateProblemResponse {
  problem: Problem;
  pdfUrl: string;
}

interface ApiError {
  message: string;
  status: number;
}

/**
 * サーバーの状態を確認するヘルスチェックAPI
 * @returns サーバーの状態情報
 */
export const checkHealth = async (): Promise<{ status: string, message: string, timestamp: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw {
        message: 'ヘルスチェックに失敗しました',
        status: response.status
      } as ApiError;
    }

    return await response.json();
  } catch (error) {
    console.error('Health check API error:', error);
    throw error;
  }
};

/**
 * 数学問題を生成するAPIを呼び出す
 * @param problemSpec 問題仕様
 * @returns 生成された問題と関連情報
 */
export const generateProblem = async (problemSpec: Partial<ProblemSpec>): Promise<GenerateProblemResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ problemSpec }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.message || '問題の生成に失敗しました',
        status: response.status
      } as ApiError;
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

/**
 * スロットフィリングAPIを呼び出す（次の質問を取得する）
 * @param userMessage ユーザーの入力メッセージ
 * @param currentSpec 現在の問題仕様
 * @returns 更新された問題仕様と次の質問
 */
export const getNextQuestion = async (
  userMessage: string, 
  currentSpec: Partial<ProblemSpec>
): Promise<{ 
  updatedSpec: Partial<ProblemSpec>, 
  nextQuestion: string,
  isComplete: boolean 
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/slot-filling`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_history: [{ role: 'user', content: userMessage }],
        problem_spec: currentSpec
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.message || 'スロットフィリングに失敗しました',
        status: response.status
      } as ApiError;
    }

    const data = await response.json();
    
    console.log('スロットフィリング応答:', data);
    
    // サーバーからのレスポンスを適切なフォーマットに変換
    return { 
      updatedSpec: {
        difficulty: data.problem_spec.difficulty,
        topic: data.problem_spec.topic,
        format: data.problem_spec.format,
        count: data.problem_spec.count !== undefined ? Number(data.problem_spec.count) : undefined,
        details: data.problem_spec.details
      }, 
      nextQuestion: data.chat_history[data.chat_history.length - 1].content,
      isComplete: data.status === 'slots_filled'
    };
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

/**
 * 生成されたPDFをダウンロードする
 * @param pdfId PDFのID
 * @returns ダウンロード可能なBlobオブジェクト
 */
export const downloadPdf = async (pdfId: string): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/download-pdf/${pdfId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.message || 'PDFのダウンロードに失敗しました',
        status: response.status
      } as ApiError;
    }

    return await response.blob();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}; 