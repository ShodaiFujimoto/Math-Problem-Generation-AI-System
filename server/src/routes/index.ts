import express from 'express';

const router = express.Router();

// 基本的なルート
router.get('/', (req, res) => {
  res.json({ message: '数学問題生成AIシステムのAPIサーバー' });
});

// 問題生成エンドポイント
router.post('/generate', async (req, res) => {
  try {
    // TODO: 問題生成ロジックを実装
    res.json({ message: '問題生成エンドポイント' });
  } catch (error) {
    res.status(500).json({ error: '問題生成中にエラーが発生しました' });
  }
});

// 問題評価エンドポイント
router.post('/evaluate', (req, res) => {
  // TODO: 問題評価ロジックの実装
  res.json({ message: '問題評価エンドポイント' });
});

// 問題一覧取得エンドポイント
router.get('/problems', async (req, res) => {
  try {
    // TODO: 問題一覧取得ロジックを実装
    res.json({ message: '問題一覧取得エンドポイント' });
  } catch (error) {
    res.status(500).json({ error: '問題一覧取得中にエラーが発生しました' });
  }
});

export default router; 