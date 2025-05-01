#!/usr/bin/env node

/**
 * 数学問題生成AIシステム - 初期セットアップスクリプト
 * 依存関係のインストールやディレクトリの作成を自動化します
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// プロジェクトルートディレクトリの取得
const rootDir = path.resolve(__dirname, '..');

/**
 * コマンドを安全に実行する
 * @param {string} command 実行するコマンド
 * @param {string} cwd 作業ディレクトリ
 */
function safeExec(command, cwd = rootDir) {
  try {
    console.log(`${colors.cyan}実行: ${command}${colors.reset}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}コマンド実行エラー: ${command}${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

/**
 * ディレクトリが存在しなければ作成
 * @param {string} dir 作成するディレクトリパス
 */
function ensureDir(dir) {
  const fullPath = path.resolve(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.cyan}ディレクトリ作成: ${dir}${colors.reset}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * バージョンチェック
 * @param {string} command バージョン確認コマンド
 * @param {string} name 確認対象の名前
 * @param {function} versionExtractor バージョン文字列を取り出す関数
 * @param {string} requiredVersion 必要なバージョン
 */
function checkVersion(command, name, versionExtractor, requiredVersion) {
  try {
    const output = execSync(command).toString();
    const version = versionExtractor(output);
    const isValid = compareVersions(version, requiredVersion) >= 0;
    
    if (isValid) {
      console.log(`${colors.green}✓ ${name} ${version} が利用可能です (必要: ${requiredVersion}以上)${colors.reset}`);
      return true;
    } else {
      console.warn(`${colors.yellow}⚠ ${name} ${version} が見つかりましたが、${requiredVersion}以上が必要です${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ ${name} が見つかりませんでした${colors.reset}`);
    return false;
  }
}

/**
 * セマンティックバージョンの比較（単純化版）
 * @param {string} v1 バージョン1
 * @param {string} v2 バージョン2
 * @returns {number} v1 > v2 なら正、v1 < v2 なら負、等しければ0
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  
  return 0;
}

/**
 * セットアップを開始
 */
async function setup() {
  console.log(`${colors.bright}数学問題生成AIシステム - 初期セットアップ${colors.reset}`);
  console.log('================================================');
  
  // 前提条件のチェック
  console.log(`\n${colors.bright}前提条件のチェック:${colors.reset}`);
  
  const nodeOk = checkVersion('node -v', 'Node.js', v => v.trim().replace('v', ''), '20.10.0');
  const npmOk = checkVersion('npm -v', 'npm', v => v.trim(), '10.2.0');
  const pythonOk = checkVersion('python --version', 'Python', v => v.trim().replace('Python ', ''), '3.11.0');
  const pipOk = checkVersion('pip --version', 'pip', v => v.trim().match(/pip ([\d.]+)/)[1], '23.3');
  
  // TeXLiveのチェック（xelatexの存在で判断）
  let texOk = false;
  try {
    execSync('xelatex --version');
    texOk = true;
    console.log(`${colors.green}✓ TeX Live (xelatex) が利用可能です${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ TeX Live (xelatex) が見つかりませんでした${colors.reset}`);
    console.error(`${colors.yellow}PDFの生成には TeX Live が必要です。${colors.reset}`);
    console.error(`${colors.yellow}https://tug.org/texlive/ からインストールしてください。${colors.reset}`);
  }
  
  // 重大な問題がある場合は中断
  if (!nodeOk || !npmOk) {
    console.error(`\n${colors.red}セットアップを続行できません。Node.jsとnpmの要件を満たしていることを確認してください。${colors.reset}`);
    process.exit(1);
  }
  
  if (!pythonOk || !pipOk) {
    console.warn(`\n${colors.yellow}警告: Pythonまたはpipの要件を満たしていません。${colors.reset}`);
    console.warn(`${colors.yellow}一部の機能が正常に動作しない可能性があります。${colors.reset}`);
  }
  
  // 出力ディレクトリの作成
  console.log(`\n${colors.bright}出力ディレクトリの作成:${colors.reset}`);
  ensureDir('output');
  ensureDir('output/tex');
  ensureDir('output/pdfs');
  
  // 環境変数ファイルの確認
  console.log(`\n${colors.bright}環境変数の確認:${colors.reset}`);
  const envPath = path.resolve(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.cyan}.env ファイルを作成します${colors.reset}`);
    fs.writeFileSync(envPath, 'OPENAI_API_KEY=your_api_key_here\n');
    console.warn(`${colors.yellow}⚠ .env ファイルが作成されました。OpenAI APIキーを設定してください。${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ .env ファイルが見つかりました${colors.reset}`);
  }
  
  // Node.js依存関係のインストール
  console.log(`\n${colors.bright}Node.js依存関係のインストール:${colors.reset}`);
  
  // ルートディレクトリの依存関係
  safeExec('npm install');
  
  // クライアント依存関係
  console.log(`\n${colors.bright}フロントエンド依存関係のインストール:${colors.reset}`);
  safeExec('npm install', path.resolve(rootDir, 'client'));
  
  // サーバー依存関係
  console.log(`\n${colors.bright}バックエンド依存関係のインストール:${colors.reset}`);
  safeExec('npm install', path.resolve(rootDir, 'server'));
  
  // Python依存関係のインストール（Pythonが利用可能な場合）
  if (pythonOk && pipOk) {
    console.log(`\n${colors.bright}Python依存関係のインストール:${colors.reset}`);
    const requirementsPath = path.resolve(rootDir, 'server', 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      safeExec('pip install -r requirements.txt', path.resolve(rootDir, 'server'));
    } else {
      console.warn(`${colors.yellow}⚠ requirements.txt が見つかりませんでした${colors.reset}`);
    }
  }
  
  // 起動スクリプトの権限設定（Unix系OSの場合）
  if (os.platform() !== 'win32') {
    console.log(`\n${colors.bright}起動スクリプトの権限設定:${colors.reset}`);
    safeExec('chmod +x scripts/start.sh', rootDir);
  }
  
  // セットアップ完了
  console.log(`\n${colors.green}${colors.bright}セットアップが完了しました！${colors.reset}`);
  console.log(`\n次のステップ:`);
  
  if (os.platform() === 'win32') {
    console.log(`1. scripts\\start.bat を実行してシステムを起動`);
  } else {
    console.log(`1. ./scripts/start.sh を実行してシステムを起動`);
  }
  
  console.log(`2. ブラウザで http://localhost:5173 にアクセス`);
  
  if (!texOk) {
    console.log(`\n${colors.yellow}注意: PDF生成機能を使用するには TeX Live のインストールが必要です${colors.reset}`);
  }
  
  if (fs.readFileSync(envPath, 'utf8').includes('your_api_key_here')) {
    console.log(`\n${colors.yellow}注意: .env ファイルにOpenAI APIキーを設定してください${colors.reset}`);
  }
}

// スクリプトを実行
setup().catch(err => {
  console.error(`${colors.red}セットアップエラー:${colors.reset}`, err);
  process.exit(1);
}); 