@echo off
echo 数学問題生成AIシステムを起動しています...
echo.

echo 環境変数をチェックしています...
if not exist ..\.env (
    echo 警告: .env ファイルが見つかりません。
    echo OpenAI API キーを設定してください。
    echo OPENAI_API_KEY=your_api_key_here > ..\.env
    echo .env ファイルを作成しました。OPENAI_API_KEYを実際のAPIキーに変更してください。
    pause
)

echo 出力ディレクトリの作成...
if not exist ..\output\tex mkdir ..\output\tex
if not exist ..\output\pdfs mkdir ..\output\pdfs

echo バックエンドサーバーを起動しています...
start cmd /k "cd ..\server && npm run dev"

echo フロントエンドサーバーを起動しています...
start cmd /k "cd ..\client && npm run dev"

echo.
echo バックエンドサーバーとフロントエンドサーバーが別々のウィンドウで起動しました。
echo ブラウザで http://localhost:5173 にアクセスしてください。
echo.
echo 終了するには、両方のコマンドウィンドウを閉じてください。
echo. 