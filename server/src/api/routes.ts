import express from 'express';
import agentRoutes from './agentRoutes';
import problemRoutes from './problemRoutes';

const router = express.Router();

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// エージェント関連のルート
router.use('/', agentRoutes);

// 問題関連のルート
router.use('/problems', problemRoutes);

export default router; 