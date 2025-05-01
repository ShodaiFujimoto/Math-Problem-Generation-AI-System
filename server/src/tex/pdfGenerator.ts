import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';

// promisifyしたexec関数
const execPromise = util.promisify(exec);

/**
 * PDFの生成設定オプション
 */
export interface PDFGenerationOptions {
  outputDir?: string;
  filename?: string;
  keepTexFile?: boolean;
  timeout?: number;
}

/**
 * TeXコンテンツの置換用データ
 */
export interface TeXTemplateData {
  problemText: string;
  answerText: string;
  explanationText: string;
  figureCode?: string;
  choices?: string[];
}

/**
 * TeXファイルからPDFを生成するクラス
 */
export class PDFGenerator {
  private templateDir: string;
  private outputDir: string;

  /**
   * PDFGeneratorのコンストラクタ
   * @param templateDir TeXテンプレートが格納されているディレクトリのパス
   * @param outputDir 出力ディレクトリのパス
   */
  constructor(templateDir?: string, outputDir?: string) {
    this.templateDir = templateDir || path.join(__dirname, 'templates');
    this.outputDir = outputDir || path.join(process.cwd(), 'output');
    
    // 出力ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 記述式問題のPDFを生成
   * @param data TeXテンプレートに挿入するデータ
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  async generateProblemPDF(data: TeXTemplateData, options: PDFGenerationOptions = {}): Promise<string> {
    // テンプレートを読み込む
    const templatePath = path.join(this.templateDir, 'problem.tex');
    let texContent = fs.readFileSync(templatePath, 'utf-8');
    
    // テンプレートの置換
    texContent = this.replaceTemplateVariables(texContent, data);
    
    // PDFを生成
    return this.compileTexToPDF(texContent, options);
  }
  
  /**
   * 選択式問題のPDFを生成
   * @param data TeXテンプレートに挿入するデータ（選択肢を含む）
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  async generateMultipleChoicePDF(data: TeXTemplateData, options: PDFGenerationOptions = {}): Promise<string> {
    // テンプレートを読み込む
    const templatePath = path.join(this.templateDir, 'multiple_choice.tex');
    let texContent = fs.readFileSync(templatePath, 'utf-8');
    
    // 選択肢のTeXコードを生成
    const choicesTeX = this.generateChoicesTeX(data.choices || []);
    
    // データに選択肢のTeXコードを追加
    const extendedData = {
      ...data,
      choicesTeX
    };
    
    // テンプレートの置換
    texContent = this.replaceTemplateVariables(texContent, extendedData);
    
    // PDFを生成
    return this.compileTexToPDF(texContent, options);
  }
  
  /**
   * 選択肢のTeXコードを生成
   * @param choices 選択肢の配列
   * @returns TeXコード文字列
   */
  private generateChoicesTeX(choices: string[]): string {
    return choices.map((choice, index) => {
      const label = String.fromCharCode(65 + index); // A, B, C, ...
      return `\\choice{${label}}{${choice}}`;
    }).join('\n');
  }
  
  /**
   * テンプレート内の変数を置換
   * @param template TeXテンプレート文字列
   * @param data 置換用データ
   * @returns 置換後のTeXコンテンツ
   */
  private replaceTemplateVariables(template: string, data: TeXTemplateData & { choicesTeX?: string }): string {
    let result = template;
    
    // 問題文の置換
    result = result.replace(/{{PROBLEM_TEXT}}/g, data.problemText || '');
    
    // 解答の置換
    result = result.replace(/{{ANSWER_TEXT}}/g, data.answerText || '');
    
    // 解説の置換
    result = result.replace(/{{EXPLANATION_TEXT}}/g, data.explanationText || '');
    
    // 図形コードの置換
    result = result.replace(/{{FIGURE_CODE}}/g, data.figureCode || '');
    
    // 選択肢の置換（選択式問題の場合）
    if (data.choicesTeX) {
      result = result.replace(/{{CHOICES}}/g, data.choicesTeX);
    }
    
    return result;
  }
  
  /**
   * TeXコンテンツからPDFを生成
   * @param texContent TeXコンテンツ
   * @param options PDF生成オプション
   * @returns 生成されたPDFファイルのパス
   */
  private async compileTexToPDF(texContent: string, options: PDFGenerationOptions): Promise<string> {
    const outputDir = options.outputDir || this.outputDir;
    const filename = options.filename || `math_problem_${Date.now()}`;
    const keepTexFile = options.keepTexFile || false;
    const timeout = options.timeout || 30000; // デフォルトタイムアウト: 30秒
    
    // 一時TeXファイルのパス
    const texFilePath = path.join(outputDir, `${filename}.tex`);
    
    // 出力PDFファイルのパス
    const pdfFilePath = path.join(outputDir, `${filename}.pdf`);
    
    try {
      // TeXファイルを作成
      fs.writeFileSync(texFilePath, texContent, 'utf-8');
      
      // TeXをPDFにコンパイル（xelatexを使用）
      const command = `xelatex -interaction=nonstopmode -output-directory="${outputDir}" "${texFilePath}"`;
      
      // コマンド実行（タイムアウト付き）
      await execPromise(command, { timeout });
      
      // 中間ファイルの削除
      const extensions = ['.aux', '.log', '.out'];
      for (const ext of extensions) {
        const filePath = path.join(outputDir, `${filename}${ext}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // TeXファイルを削除（オプションがfalseの場合）
      if (!keepTexFile && fs.existsSync(texFilePath)) {
        fs.unlinkSync(texFilePath);
      }
      
      // PDFファイルが正常に生成されたか確認
      if (!fs.existsSync(pdfFilePath)) {
        throw new Error('PDF生成に失敗しました。');
      }
      
      return pdfFilePath;
      
    } catch (error) {
      // エラーが発生した場合、一時ファイルを削除
      if (fs.existsSync(texFilePath) && !keepTexFile) {
        fs.unlinkSync(texFilePath);
      }
      
      // エラーを再スロー
      throw error;
    }
  }
}

/**
 * PDFGeneratorのインスタンスを作成する関数
 * @param templateDir TeXテンプレートが格納されているディレクトリのパス
 * @param outputDir 出力ディレクトリのパス
 * @returns PDFGeneratorのインスタンス
 */
export function createPDFGenerator(templateDir?: string, outputDir?: string): PDFGenerator {
  return new PDFGenerator(templateDir, outputDir);
} 