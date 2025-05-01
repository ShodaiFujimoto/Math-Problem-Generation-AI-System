import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { checkTexLiveInstallation } from './tex/pdfService';

// 環境変数の読み込み（親ディレクトリの.envファイルを読み込む）
const envPath = path.resolve(__dirname, '../../.env');
console.log('環境変数ファイルのパス:', envPath);
console.log('環境変数ファイルの存在:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  // dotenvの設定を変更して、より詳細なオプションを追加
  const result = dotenv.config({ 
    path: envPath,
    debug: true, // デバッグ情報を表示
    override: true // 既存の環境変数を上書き
  });
  
  if (result.error) {
    console.error('環境変数の読み込み中にエラーが発生しました:', result.error);
  } else {
    console.log('環境変数を読み込みました');
    console.log('読み込まれた環境変数:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '設定されています' : '設定されていません',
      OPENAI_MODEL: process.env.OPENAI_MODEL || '未設定',
      PORT: process.env.PORT || '未設定',
      NODE_ENV: process.env.NODE_ENV || '未設定'
    });
  }
} else {
  console.error('環境変数ファイルが見つかりません:', envPath);
}

// 環境変数を読み込んだ後にルートをインポート
import problemRoutes from './api/problemRoutes';
import agentRoutes from './api/agentRoutes';

const app = express();
const port = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// 静的ファイルの配信設定
const publicDir = path.resolve(__dirname, '../public');
const outputDir = path.resolve(__dirname, '../output');

// publicディレクトリがなければ作成
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`ディレクトリを作成しました: ${publicDir}`);
}

// outputディレクトリがなければ作成
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`ディレクトリを作成しました: ${outputDir}`);
}

// 静的ファイルの配信
app.use('/public', express.static(publicDir));
app.use('/output', express.static(outputDir));

// APIルートの設定
app.use('/api/problems', problemRoutes);
app.use('/api', agentRoutes);

// TeX環境のチェック
checkTexLiveInstallation().then(result => {
  if (result.isInstalled) {
    console.log('✅ ' + result.message);
  } else {
    console.error('❌ ' + result.message);
    console.error('🔴 警告: PDFの生成機能が動作しない可能性があります。TeXLiveをインストールして再起動してください。');
  }
}).catch(error => {
  console.error('❌ TeXLiveチェック中にエラーが発生しました:', error);
});

// 基本的なルート
app.get('/', (req: Request, res: Response) => {
  res.json({ message: '数学問題生成AIシステムのAPIサーバー' });
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'サーバーは正常に動作しています',
    timestamp: new Date().toISOString()
  });
});

// サンプルPDF用のエンドポイント
app.get('/api/sample-pdf', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'サンプルPDFのURLです',
    pdfUrl: '/public/sample.pdf'
  });
});

// エラーハンドリング
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// サーバーの起動
app.listen(port, () => {
  console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
  console.log('📂 作業ディレクトリ:', process.cwd());
}); 