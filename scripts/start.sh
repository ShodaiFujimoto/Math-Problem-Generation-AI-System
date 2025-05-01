#!/bin/bash

# 数学問題生成AIシステム起動スクリプト

echo "数学問題生成AIシステムを起動しています..."
echo

# カレントディレクトリをスクリプトの場所に変更
cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"

# 環境変数をチェック
echo "環境変数をチェックしています..."
if [ ! -f .env ]; then
    echo "警告: .env ファイルが見つかりません。"
    echo "OpenAI API キーを設定してください。"
    echo "OPENAI_API_KEY=your_api_key_here" > .env
    echo ".env ファイルを作成しました。OPENAI_API_KEYを実際のAPIキーに変更してください。"
    read -p "続行するには Enter キーを押してください..."
fi

# 出力ディレクトリの作成
echo "出力ディレクトリの作成..."
mkdir -p output/tex
mkdir -p output/pdfs

# バックエンドサーバーの起動
echo "バックエンドサーバーを起動しています..."
cd "$ROOT_DIR/server"
gnome-terminal -- bash -c "npm run dev; read -p 'Press Enter to close...'" 2>/dev/null || \
xterm -e "npm run dev; read -p 'Press Enter to close...'" 2>/dev/null || \
open -a Terminal.app bash -c "cd '$ROOT_DIR/server' && npm run dev" 2>/dev/null || \
(osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/server' && npm run dev\"" 2>/dev/null) || \
(npm run dev &)

# フロントエンドサーバーの起動
echo "フロントエンドサーバーを起動しています..."
cd "$ROOT_DIR/client"
gnome-terminal -- bash -c "npm run dev; read -p 'Press Enter to close...'" 2>/dev/null || \
xterm -e "npm run dev; read -p 'Press Enter to close...'" 2>/dev/null || \
open -a Terminal.app bash -c "cd '$ROOT_DIR/client' && npm run dev" 2>/dev/null || \
(osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/client' && npm run dev\"" 2>/dev/null) || \
(npm run dev &)

echo
echo "バックエンドサーバーとフロントエンドサーバーが起動されました。"
echo "ブラウザで http://localhost:5173 にアクセスしてください。"
echo
echo "このターミナルを閉じてもサーバーは起動したままになります。"
echo "終了するには、各サーバープロセスを手動で終了してください（Ctrl+C）。"
echo