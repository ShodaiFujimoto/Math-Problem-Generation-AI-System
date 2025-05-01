#!/usr/bin/env node

/**
 * 数学問題生成AIシステム - 統合起動スクリプト
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const open = require('open');

console.log('数学問題生成AIシステムを起動しています...');

// サーバーの起動
const serverProcess = spawn('node', ['server/src/index.js'], {
  stdio: 'inherit',
  shell: true
});

// 終了処理
process.on('SIGINT', () => {
  console.log('\n数学問題生成AIシステムを終了しています...');
  serverProcess.kill();
  process.exit();
});

// 5秒後にブラウザで開く
setTimeout(() => {
  console.log('ブラウザでアプリケーションを開いています...');
  open('http://localhost:3000');
}, 5000);

console.log('数学問題生成AIシステムが起動しました。');
console.log('ブラウザで http://localhost:3000 にアクセスしてください。');
console.log('終了するには Ctrl+C を押してください。');
