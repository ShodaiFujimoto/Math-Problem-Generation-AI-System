import { ClientOptions } from 'openai';
import path from 'path';
import dotenv from 'dotenv';

// 環境変数の読み込み（プロジェクトルートの.envファイル）
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// APIキーが設定されているか確認
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn('警告: OPENAI_API_KEYが設定されていません。.envファイルを確認してください。');
}

// OpenAI APIのデフォルト設定
export const OPENAI_API_CONFIG: ClientOptions = {
  apiKey: apiKey,
  // オプションでタイムアウト設定など追加可能
  timeout: 120000, // 2分
  maxRetries: 3
};

// デフォルトモデル設定
export const DEFAULT_MODEL = 'gpt-4-0125-preview'; // 要件定義書に従った最新のGPT-4モデル

// 温度設定（生成の多様性：0.0=決定的, 1.0=創造的）
export const DEFAULT_TEMPERATURE = 0.7;

// レスポンスのタイムアウト判定
export const isTimeout = (error: any): boolean => {
  return (
    error.message?.includes('timeout') ||
    error.message?.includes('ETIMEDOUT') ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ESOCKETTIMEDOUT'
  );
};

// APIキーエラーの判定
export const isAPIKeyError = (error: any): boolean => {
  return (
    error.message?.includes('API key') ||
    error.message?.includes('authentication')
  );
};

// OpenAI接続エラーを人間が読みやすいメッセージに変換
export const formatOpenAIError = (error: any): string => {
  if (isAPIKeyError(error)) {
    return 'OpenAI APIキーが無効または設定されていません。.envファイルを確認してください。';
  } else if (isTimeout(error)) {
    return 'OpenAI APIへの接続がタイムアウトしました。ネットワーク接続を確認するか、後でもう一度試してください。';
  } else {
    return `OpenAI APIエラー: ${error.message || '不明なエラー'}`;
  }
}; 