import * as path from 'path';
import * as fs from 'fs';
import { generateTestProblemSpec, saveTestResult } from './utils/testHelpers';

// エージェントのインポート
import { slotFillingAgent } from '../../src/agents/agents/slotFillingAgent';
import { problemGenerationAgent } from '../../src/agents/agents/problemGenerationAgent';
import { verificationAgent } from '../../src/agents/agents/verificationAgent';
import { problemRevisionAgent } from '../../src/agents/agents/problemRevisionAgent';
import { texifyMathExpressions, generateTikZFromVisualization } from '../../src/agents/agents/texFormatAgent';
import { generatePdf } from '../../src/agents/agents/pdfGenerationAgent';

// テスト用の型定義
interface MathProblemState {
  problem_spec: Record<string, any>;
  chat_history: Array<Record<string, string>>;
  current_problem: Record<string, any> | null;
  verification_result: Record<string, any> | null;
  tex_content: string;
  pdf_path: string;
  status: string;
}

describe('数学問題生成AIシステム エンドツーエンドテスト', () => {
  jest.setTimeout(60000); // テストタイムアウトを60秒に設定

  // 基本的なワークフロー全体のテスト
  test('基本的なワークフロー - 問題仕様から問題生成、検証、TeX変換、PDF生成まで', async () => {
    // 初期状態の設定
    const initialState: MathProblemState = {
      problem_spec: generateTestProblemSpec(),
      chat_history: [],
      current_problem: null,
      verification_result: null,
      tex_content: '',
      pdf_path: '',
      status: 'initial'
    };

    // 1. スロットフィリングエージェントのスキップ（テストでは問題仕様は直接指定）
    console.log('テスト実行中: 問題仕様', JSON.stringify(initialState.problem_spec, null, 2));
    
    // 2. 問題生成エージェントの実行
    let state = initialState;
    try {
      console.log('テスト実行中: 問題生成エージェント');
      state = await problemGenerationAgent(state) as MathProblemState;
      expect(state.current_problem).not.toBeNull();
      expect(state.status).toBe('problem_generated');
      
      // 生成された問題の内容を保存
      saveTestResult('generated_problem.json', JSON.stringify(state.current_problem, null, 2));
      
      // 3. 検証エージェントの実行
      console.log('テスト実行中: 検証エージェント');
      state = await verificationAgent(state) as MathProblemState;
      expect(state.verification_result).not.toBeNull();
      
      // 検証結果を保存
      saveTestResult('verification_result.json', JSON.stringify(state.verification_result, null, 2));
      
      // 検証に失敗した場合は問題修正エージェントを実行
      if (state.verification_result?.overall === 'fail') {
        console.log('テスト実行中: 問題修正エージェント');
        state = await problemRevisionAgent(state) as MathProblemState;
        expect(state.current_problem).not.toBeNull();
        
        // 修正後の問題を保存
        saveTestResult('revised_problem.json', JSON.stringify(state.current_problem, null, 2));
        
        // 再検証
        console.log('テスト実行中: 再検証');
        state = await verificationAgent(state) as MathProblemState;
        expect(state.verification_result?.overall).toBe('pass');
      }
      
      // 4. TeX整形エージェントのシミュレーション
      console.log('テスト実行中: TeX整形');
      
      // 問題テキストをTeX形式に変換
      const problemText = state.current_problem?.problem_text || '';
      const texProblem = texifyMathExpressions(problemText);
      
      // 解答テキストをTeX形式に変換
      const solutionText = state.current_problem?.solution || '';
      const texSolution = texifyMathExpressions(solutionText);
      
      // 図形の変換（存在する場合）
      let tikzCode = '';
      if (state.current_problem?.visualization) {
        tikzCode = generateTikZFromVisualization(state.current_problem.visualization);
      }
      
      // TeX文書の作成
      const texDocument = `
\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\usepackage[margin=1in]{geometry}
\\usepackage{CJKutf8}
\\begin{document}
\\begin{CJK}{UTF8}{min}

\\section*{問題}
${texProblem}

${tikzCode ? '\\begin{center}\n' + tikzCode + '\\end{center}\n' : ''}

\\section*{解答}
${texSolution}

\\end{CJK}
\\end{document}`;
      
      // TeX文書を保存
      state.tex_content = texDocument;
      const texPath = saveTestResult('test_output.tex', texDocument);
      expect(fs.existsSync(texPath)).toBe(true);
      
      // 5. PDF生成のシミュレーション (実際にTeXからPDFを生成する場合)
      console.log('テスト実行中: PDF生成');
      if (process.env.RUN_PDF_TEST === 'true') {
        state = await generatePdf(state) as MathProblemState;
        expect(state.pdf_path).not.toBe('');
        expect(fs.existsSync(state.pdf_path)).toBe(true);
      } else {
        console.log('PDF生成テストはスキップされました。RUN_PDF_TEST=true を設定してテストを有効にしてください。');
      }
      
      console.log('テスト完了: すべてのステップが正常に実行されました');
    } catch (error) {
      console.error('テスト失敗:', error);
      throw error;
    }
  });

  // エッジケースのテスト1: 図形なしの問題生成
  test('エッジケース - 図形なしの問題生成', async () => {
    const noVisualizationSpec = generateTestProblemSpec({
      subject: '数と式',
      details: '素因数分解に関する問題',
      visualization: {
        required: false
      }
    });
    
    const initialState: MathProblemState = {
      problem_spec: noVisualizationSpec,
      chat_history: [],
      current_problem: null,
      verification_result: null,
      tex_content: '',
      pdf_path: '',
      status: 'initial'
    };
    
    try {
      console.log('テスト実行中: 図形なしの問題生成');
      const state = await problemGenerationAgent(initialState) as MathProblemState;
      expect(state.current_problem).not.toBeNull();
      expect(state.current_problem?.visualization).toBeUndefined();
      
      saveTestResult('no_visualization_problem.json', JSON.stringify(state.current_problem, null, 2));
    } catch (error) {
      console.error('テスト失敗:', error);
      throw error;
    }
  });

  // エッジケースのテスト2: 複雑な数式の処理
  test('エッジケース - 複雑な数式の処理', async () => {
    const complexMathExpression = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} であり、極限 \\lim_{x \\to \\infty} \\frac{1}{x} = 0 である。また、\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3} である。';
    
    const texResult = texifyMathExpressions(complexMathExpression);
    expect(texResult).not.toBe('');
    
    saveTestResult('complex_math_expression.tex', texResult);
  });
}); 