import * as path from 'path';
import { PDFGenerator, TeXTemplateData, PDFGenerationOptions } from './pdfGenerator';

/**
 * PDF生成処理を行うサービスクラス
 */
export class PDFService {
  private pdfGenerator: PDFGenerator;
  
  /**
   * PDFServiceのコンストラクタ
   * @param templateDir TeXテンプレートのディレクトリパス
   * @param outputDir PDF出力先ディレクトリパス
   */
  constructor(templateDir?: string, outputDir?: string) {
    this.pdfGenerator = new PDFGenerator(templateDir, outputDir);
  }
  
  /**
   * 問題と解答からPDFを生成
   * @param problemData 問題データ
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  async generateMathProblemPDF(
    problemData: {
      problemText: string;
      answerText: string;
      explanationText: string;
      figureCode?: string;
      isMultipleChoice?: boolean;
      choices?: string[];
    },
    options: PDFGenerationOptions = {}
  ): Promise<string> {
    // TeXテンプレートデータの準備
    const templateData: TeXTemplateData = {
      problemText: problemData.problemText,
      answerText: problemData.answerText,
      explanationText: problemData.explanationText,
      figureCode: problemData.figureCode,
      choices: problemData.choices
    };
    
    // 選択式問題か記述式問題かで処理を分岐
    if (problemData.isMultipleChoice && problemData.choices && problemData.choices.length > 0) {
      return this.pdfGenerator.generateMultipleChoicePDF(templateData, options);
    } else {
      return this.pdfGenerator.generateProblemPDF(templateData, options);
    }
  }
  
  /**
   * TeX文字列からPDFを直接生成
   * @param texContent TeXコンテンツ
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  async generatePDFFromTexString(texContent: string, options: PDFGenerationOptions = {}): Promise<string> {
    if (!texContent) {
      throw new Error('TeXコンテンツが空です');
    }
    
    try {
      const fs = require('fs');
      const util = require('util');
      const exec = util.promisify(require('child_process').exec);
      const os = require('os');
      
      // TeXLiveがインストールされているか確認
      const texCheck = await checkTexLiveInstallation();
      if (!texCheck.isInstalled) {
        throw new Error(`TeXLiveがインストールされていないか正しく設定されていません: ${texCheck.message}`);
      }
      console.log('✅ TeXLive確認完了:', texCheck.message);
      
      // 一時ディレクトリではなく、アプリケーション内の固定ディレクトリを使用
      const appWorkingDir = path.join(process.cwd(), 'output', 'tex');
      if (!fs.existsSync(appWorkingDir)) {
        fs.mkdirSync(appWorkingDir, { recursive: true });
      }
      console.log('🗂️ TeX作業ディレクトリ:', appWorkingDir);
      
      // 最終出力ディレクトリ（指定されたものまたはデフォルト）
      const finalOutputDir = options.outputDir || path.join(process.cwd(), 'output', 'pdfs');
      if (!fs.existsSync(finalOutputDir)) {
        fs.mkdirSync(finalOutputDir, { recursive: true });
        console.log('🗂️ 出力ディレクトリを作成しました:', finalOutputDir);
      }
      
      const filename = options.filename || `math_problem_${Date.now()}`;
      const keepTexFile = true; // 常にTeXファイルを保持（オプションは無視）
      // タイムアウト時間を増加（デフォルト3分）
      const timeout = options.timeout || 180000;
      
      // TeXファイルのパス
      const texFilePath = path.join(appWorkingDir, `${filename}.tex`);
      
      // TeXファイルを作成
      fs.writeFileSync(texFilePath, texContent, 'utf-8');
      console.log('📄 TeXファイルを作成しました:', texFilePath);
      
      // 作業ディレクトリでxelatexを実行
      // コンパイルプロセスの最適化:
      // 1. -no-pdf: 最初のパスでPDFを生成せず、速度向上
      // 2. -interaction=batchmode: ユーザー入力を求めないバッチモード
      // 3. -shell-escape: 外部コマンド実行を許可（図形生成に必要）
      // 4. -file-line-error: エラーメッセージにファイル名と行番号を含める
      const command = `cd "${appWorkingDir}" && xelatex -no-pdf -interaction=batchmode -shell-escape -file-line-error "${filename}.tex" && xelatex -interaction=batchmode -shell-escape -file-line-error "${filename}.tex"`;
      console.log('🔄 実行コマンド:', command);
      
      // コマンド実行（タイムアウト付き）
      console.log(`⏱️ TeXコンパイル開始... (タイムアウト: ${timeout}ms)`);
      const { stdout, stderr } = await exec(command, { timeout });
      console.log('✅ xelatex実行結果:', { 
        stdout: (stdout?.substring(0, 200) || '') + (stdout && stdout.length > 200 ? '...' : ''), 
        stderr: stderr || 'エラーなし'
      });
      
      // 生成されたPDFのパス
      const pdfPath = path.join(appWorkingDir, `${filename}.pdf`);
      
      // PDFファイルが正常に生成されたか確認
      if (!fs.existsSync(pdfPath)) {
        // PDFが生成されなかった場合、ログファイルを確認
        const logPath = path.join(appWorkingDir, `${filename}.log`);
        let logContent = '';
        if (fs.existsSync(logPath)) {
          logContent = fs.readFileSync(logPath, 'utf-8');
          // エラーに関連する行だけを抽出
          const errorLines = logContent.split('\n')
            .filter(line => line.includes('Error') || line.includes('Warning'))
            .join('\n');
          console.error('❌ TeXコンパイルエラー:', errorLines || logContent.slice(-500));
        }
        
        // AUXファイルも確認（エラー情報が含まれている場合がある）
        const auxPath = path.join(appWorkingDir, `${filename}.aux`);
        if (fs.existsSync(auxPath)) {
          const auxContent = fs.readFileSync(auxPath, 'utf-8');
          console.error('AUXファイル内容:', auxContent.slice(0, 500));
        }
        
        throw new Error(`PDF生成に失敗しました。TeXログ: ${logContent.slice(-500)}`);
      }
      
      // 最終的なPDFファイルのパス
      const finalPdfPath = path.join(finalOutputDir, `${filename}.pdf`);
      
      // PDFファイルを最終出力ディレクトリにコピー
      fs.copyFileSync(pdfPath, finalPdfPath);
      console.log('✅ PDFファイルをコピーしました:', finalPdfPath);
      
      // 中間ファイルの削除（AUX、LOG、OUTなど）
      // TeXファイルとPDFは保持
      try {
        const extensions = ['.aux', '.log', '.out'];
        for (const ext of extensions) {
          const filePath = path.join(appWorkingDir, `${filename}${ext}`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        console.log('🧹 中間ファイルを削除しました');
      } catch (cleanupError) {
        console.warn('⚠️ 中間ファイルの削除中にエラーが発生しました:', cleanupError);
        // クリーンアップエラーは無視して処理を続行
      }
      
      // 特定のURLパターンでアクセスできるようにするための相対パス
      const relativeOutputDir = path.relative(process.cwd(), finalOutputDir);
      const relativeFilePath = path.join(relativeOutputDir, `${filename}.pdf`).replace(/\\/g, '/');
      
      return relativeFilePath;
    } catch (error: any) {
      console.error('❌ PDF生成中にエラーが発生しました:', error);
      
      // タイムアウトエラーの特別処理
      if (error.killed && error.signal === 'SIGTERM') {
        throw new Error(`TeXコンパイルがタイムアウトしました。処理時間が長すぎるか、無限ループが発生している可能性があります。タイムアウト設定: ${options.timeout || 180000}ms`);
      }
      
      // 実行コマンドを抽出
      const cmdMatch = error.message?.match(/Command failed: (.+)/);
      const cmdDetails = cmdMatch ? cmdMatch[1] : '不明なコマンド';
      
      // エラーメッセージを詳細化
      let errorMessage = `TeXからPDFを生成できませんでした: ${error.message}`;
      if (cmdDetails !== '不明なコマンド') {
        errorMessage += `\n実行コマンド: ${cmdDetails}`;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * TeXテンプレートとデータからPDFを生成
   * @param templateName テンプレート名（拡張子なし）
   * @param data テンプレートに挿入するデータ
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  async generatePDFFromTemplate(
    templateName: string,
    data: Record<string, string>,
    options: PDFGenerationOptions = {}
  ): Promise<string> {
    // この機能も将来的に実装予定
    throw new Error('この機能は現在実装されていません。');
  }
  
  /**
   * PDFファイルを読み込んでBase64エンコードされた文字列として返す
   * @param pdfPath PDFファイルのパス
   * @returns Base64エンコードされたPDFデータ
   */
  getPDFAsBase64(pdfPath: string): string {
    const fs = require('fs');
    
    // ファイルが存在するか確認
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDFファイルが見つかりません: ${pdfPath}`);
    }
    
    // ファイルを読み込みBase64エンコード
    const pdfData = fs.readFileSync(pdfPath);
    return pdfData.toString('base64');
  }
}

/**
 * PDFServiceのインスタンスを作成する関数
 * @param templateDir TeXテンプレートのディレクトリパス
 * @param outputDir PDF出力先ディレクトリパス
 * @returns PDFServiceのインスタンス
 */
export function createPDFService(templateDir?: string, outputDir?: string): PDFService {
  return new PDFService(templateDir, outputDir);
}

/**
 * xelatexコマンドが利用可能かチェックする関数
 * @returns Promise<{isInstalled: boolean, message: string}> xelatexが利用可能ならtrue
 */
export async function checkTexLiveInstallation(): Promise<{isInstalled: boolean, message: string}> {
  const util = require('util');
  const exec = util.promisify(require('child_process').exec);
  
  try {
    const { stdout } = await exec('xelatex --version');
    if (stdout.includes('XeTeX')) {
      return { 
        isInstalled: true, 
        message: 'TeXLiveが正常にインストールされています。' 
      };
    } else {
      return { 
        isInstalled: false, 
        message: 'xelatexコマンドはありますが、期待された出力を返しませんでした。' 
      };
    }
  } catch (error) {
    return { 
      isInstalled: false, 
      message: 'TeXLiveがインストールされていないか、xelatexコマンドがPATHに含まれていません。TeXLiveをインストールしてください。' 
    };
  }
} 