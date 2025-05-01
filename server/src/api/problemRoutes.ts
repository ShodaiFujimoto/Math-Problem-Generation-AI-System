import express, { Request, Response } from 'express';
import { ProblemGenerator } from '../services/problemGenerator';
import { Problem } from '../types/problem';

const router = express.Router();

// OpenAI APIキーの取得
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEYが設定されていません');
}

// 問題生成エージェントの初期化
const problemGenerator = new ProblemGenerator(apiKey || '');

// APIキーのチェック（ログ出力のみ）
console.log('環境変数の状態 (problemRoutes):', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '設定されています' : '設定されていません',
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

// APIキーが設定されていない場合は警告を表示するだけで、エラーはスローしない
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEYが設定されていません。.envファイルを確認してください。');
}

// 問題生成エンドポイント
router.post('/generate', (async (req: Request, res: Response) => {
  try {
    // APIキーが設定されていない場合はエラーを返す
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OPENAI_API_KEYが設定されていません。.envファイルを確認してください。' 
      });
    }

    // APIキーが設定されている場合のみProblemGeneratorを初期化
    const problemGenerator = new ProblemGenerator(process.env.OPENAI_API_KEY);

    const { difficulty, topic } = req.body;
    
    if (!difficulty || !topic) {
      return res.status(400).json({ 
        error: '難易度とトピックは必須です' 
      });
    }
    
    const problem = await problemGenerator.generateProblem(difficulty, topic);
    res.status(200).json({ problem });
  } catch (error) {
    console.error('問題生成中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: '問題生成中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// 問題一覧取得エンドポイント
router.get('/', (async (req: Request, res: Response) => {
  try {
    // 将来的にデータベースから問題一覧を取得する実装を追加
    res.status(200).json({
      message: '問題一覧取得エンドポイント',
      problems: []
    });
  } catch (error) {
    console.error('問題一覧取得中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: '問題一覧取得中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// 問題詳細取得エンドポイント
router.get('/:id', (async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 将来的にデータベースから問題詳細を取得する実装を追加
    res.status(200).json({
      message: '問題詳細取得エンドポイント',
      problem: null
    });
  } catch (error) {
    console.error('問題詳細取得中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: '問題詳細取得中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

export default router; 