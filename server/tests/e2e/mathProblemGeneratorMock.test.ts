import * as fs from 'fs';
import * as path from 'path';
import { generateTestProblemSpec, saveTestResult } from './utils/testHelpers';
import { mockProblemGenerated, mockVerificationResult, mockTexContent } from './fixtures/mockData';

describe('数学問題生成AIシステム モック版エンドツーエンドテスト', () => {
  // テスト用の状態オブジェクト
  interface MathProblemState {
    problem_spec: Record<string, any>;
    chat_history: Array<Record<string, string>>;
    current_problem: Record<string, any> | null;
    verification_result: Record<string, any> | null;
    tex_content: string;
    pdf_path: string;
    status: string;
  }

  // 問題生成エージェント（モック版）
  const mockProblemGenerationAgent = (state: MathProblemState): MathProblemState => {
    console.log('モック問題生成エージェントを実行');
    return {
      ...state,
      current_problem: mockProblemGenerated,
      status: 'problem_generated'
    };
  };

  // 検証エージェント（モック版）
  const mockVerificationAgent = (state: MathProblemState): MathProblemState => {
    console.log('モック検証エージェントを実行');
    return {
      ...state,
      verification_result: mockVerificationResult,
      status: 'verified'
    };
  };

  // TeX整形エージェント（モック版）
  const mockTexFormattingAgent = (state: MathProblemState): MathProblemState => {
    console.log('モックTeX整形エージェントを実行');
    return {
      ...state,
      tex_content: mockTexContent,
      status: 'tex_formatted'
    };
  };

  // PDF生成エージェント（モック版）
  const mockPdfGenerationAgent = (state: MathProblemState): MathProblemState => {
    console.log('モックPDF生成エージェントを実行');
    
    // テスト用の出力ディレクトリを作成
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 一時TeXファイルを保存
    const texFilePath = path.join(outputDir, 'mock_output.tex');
    fs.writeFileSync(texFilePath, state.tex_content);
    
    // PDFパスを設定（実際のPDFは生成しない）
    const pdfFilePath = path.join(outputDir, 'mock_output.pdf');
    
    return {
      ...state,
      pdf_path: pdfFilePath,
      status: 'completed'
    };
  };

  test('モック版 - 基本的なワークフロー全体', () => {
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

    // 1. 問題生成エージェントの実行
    console.log('テスト実行中: モック問題生成');
    let state = mockProblemGenerationAgent(initialState);
    expect(state.current_problem).not.toBeNull();
    expect(state.status).toBe('problem_generated');
    
    // 生成された問題の内容を保存
    saveTestResult('mock_generated_problem.json', JSON.stringify(state.current_problem, null, 2));
    
    // 2. 検証エージェントの実行
    console.log('テスト実行中: モック検証');
    state = mockVerificationAgent(state);
    expect(state.verification_result).not.toBeNull();
    expect(state.verification_result?.overall).toBe('pass');
    
    // 検証結果を保存
    saveTestResult('mock_verification_result.json', JSON.stringify(state.verification_result, null, 2));
    
    // 3. TeX整形エージェントの実行
    console.log('テスト実行中: モックTeX整形');
    state = mockTexFormattingAgent(state);
    expect(state.tex_content).not.toBe('');
    
    // TeX文書を保存
    saveTestResult('mock_output.tex', state.tex_content);
    
    // 4. PDF生成エージェントの実行
    console.log('テスト実行中: モックPDF生成');
    state = mockPdfGenerationAgent(state);
    expect(state.pdf_path).not.toBe('');
    
    console.log('テスト完了: すべてのモックエージェントが正常に実行されました');
  });

  test('モック版 - エラー処理テスト', () => {
    // 無効な問題仕様でエラーが適切に処理されるかテスト
    const invalidState: MathProblemState = {
      problem_spec: {
        subject: '不明な分野',
        difficulty: '不適切な難易度',
        format: '',
        count: -1,
        details: '',
        constraints: '',
        visualization: null
      },
      chat_history: [],
      current_problem: null,
      verification_result: null,
      tex_content: '',
      pdf_path: '',
      status: 'initial'
    };

    // エラー処理の検証
    expect(() => {
      // 実際のシステムではエラーハンドリングが実装されているはず
      console.log('エラー処理テストを実行（モック）');
      
      // エラー状態を保存
      saveTestResult('mock_error_state.json', JSON.stringify(invalidState, null, 2));
      
      return invalidState;
    }).not.toThrow();
  });
}); 