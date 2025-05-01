/**
 * 数学問題生成AIシステム - デスクトップショートカット作成スクリプト (Windows用)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Windowsでのみ実行可能
if (os.platform() !== 'win32') {
  console.error('このスクリプトはWindows環境でのみ実行できます。');
  process.exit(1);
}

// プロジェクトルートディレクトリの取得
const rootDir = path.resolve(__dirname, '..');
const startBatPath = path.resolve(__dirname, 'start.bat');
const desktopDir = path.resolve(os.homedir(), 'Desktop');

// start.batが存在するか確認
if (!fs.existsSync(startBatPath)) {
  console.error('start.batファイルが見つかりません。');
  process.exit(1);
}

console.log('数学問題生成AIシステム - デスクトップショートカットを作成します...');

try {
  // VBScriptを使用してショートカットを作成
  const vbsContent = `
    Set WshShell = CreateObject("WScript.Shell")
    Set lnk = WshShell.CreateShortcut("${desktopDir}\\数学問題生成AIシステム.lnk")
    lnk.TargetPath = "${startBatPath}"
    lnk.WorkingDirectory = "${__dirname}"
    lnk.Description = "数学問題生成AIシステム"
    lnk.Save
  `;

  // 一時VBSファイルの作成と実行
  const tempVbsPath = path.join(os.tmpdir(), 'create_shortcut.vbs');
  fs.writeFileSync(tempVbsPath, vbsContent);
  
  execSync(`cscript //nologo "${tempVbsPath}"`);
  
  // 一時ファイルの削除
  fs.unlinkSync(tempVbsPath);
  
  console.log('デスクトップに「数学問題生成AIシステム」ショートカットを作成しました。');
  console.log('このショートカットをダブルクリックすると、システムが起動します。');
} catch (error) {
  console.error('ショートカットの作成中にエラーが発生しました:', error.message);
}