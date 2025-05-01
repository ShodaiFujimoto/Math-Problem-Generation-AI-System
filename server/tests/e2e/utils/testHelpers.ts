import * as fs from 'fs';
import * as path from 'path';

/**
 * テスト用の問題仕様を生成する関数
 * @param overrides 上書きするパラメータ
 * @returns 問題仕様オブジェクト
 */
export function generateTestProblemSpec(overrides: Record<string, any> = {}) {
  return {
    subject: '関数',
    difficulty: '高校生',
    format: '記述式',
    count: 1,
    details: '二次関数のグラフと直線の交点を求める問題',
    constraints: '',
    visualization: {
      required: true,
      type: 'function_graph'
    },
    ...overrides
  };
}

/**
 * テスト結果をファイルに保存する関数
 * @param filename ファイル名
 * @param content 保存する内容
 */
export function saveTestResult(filename: string, content: string) {
  const outputDir = path.join(__dirname, '../../output');
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * エラーオブジェクトをテスト用に文字列化する関数
 * @param error エラーオブジェクト
 * @returns エラー情報の文字列
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`;
  }
  return String(error);
}

/**
 * APIレスポンスを模倣するモック関数
 * @param data 成功時のデータ
 * @returns モックされたAPIレスポンス関数
 */
export function mockApiResponse(data: any) {
  return () => Promise.resolve({ data });
}

/**
 * テスト用の状態オブジェクトを生成する関数
 * @param problemSpec 問題仕様
 * @returns テスト用の状態オブジェクト
 */
export function generateTestState(problemSpec: Record<string, any> = {}) {
  return {
    problem_spec: problemSpec || generateTestProblemSpec(),
    chat_history: [],
    current_problem: null,
    verification_result: null,
    tex_content: '',
    pdf_path: '',
    status: 'initial'
  };
} 