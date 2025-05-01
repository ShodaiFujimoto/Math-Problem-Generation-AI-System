import express, { Request, Response } from 'express';
import { runSlotFillingAgent } from '../agents/agents/slotFillingAgent';
import { MathProblemState } from '../agents/types';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// OpenAI APIキーの取得
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEYが設定されていません');
}

// APIキーのチェック（ログ出力のみ）
console.log('環境変数の状態 (agentRoutes):', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '設定されています' : '設定されていません',
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd()
});

// APIキーが設定されていない場合は警告を表示するだけで、エラーはスローしない
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEYが設定されていません。.envファイルを確認してください。');
}

// スロットフィリングエンドポイント
router.post('/slot-filling', (async (req: Request, res: Response) => {
  try {
    // APIキーが設定されていない場合はエラーを返す
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OPENAI_API_KEYが設定されていません。.envファイルを確認してください。' 
      });
    }

    // リクエストボディが無効な場合の処理
    if (!req.body) {
      return res.status(400).json({
        error: '無効なリクエスト形式です',
        status: 'error'
      });
    }

    const { chat_history, problem_spec } = req.body;
    console.log('スロットフィリングリクエスト:', {
      chat_history: chat_history?.length > 0 ? chat_history[chat_history.length - 1] : 'なし',
      problem_spec
    });
    
    // チャット履歴が必須
    if (!chat_history || !Array.isArray(chat_history)) {
      return res.status(400).json({ 
        error: 'chat_historyは必須で、配列である必要があります',
        status: 'error'
      });
    }
    
    // 現在の状態を取得または初期化
    let state: MathProblemState;
    
    try {
      // problem_specが提供されている場合は検証
      if (problem_spec) {
        state = {
          problem_spec: {
            difficulty: problem_spec.difficulty || '',
            topic: problem_spec.topic || '',
            format: problem_spec.format || '',
            count: typeof problem_spec.count === 'string' ? 
                parseInt(problem_spec.count as string) || undefined : 
                problem_spec.count || undefined,
            details: problem_spec.details || ''
          },
          chat_history: chat_history,
          current_problem: {
            id: '',
            question: '',
            answer: '',
            explanation: ''
          },
          verification_result: {
            is_valid: false,
            feedback: '',
            suggestions: []
          },
          tex_content: '',
          pdf_path: '',
          status: 'in_progress'
        };
      } else {
        // 初期状態を作成
        state = {
          problem_spec: {
            difficulty: '',
            topic: '',
            format: '',
            count: undefined,
            details: ''
          },
          chat_history: chat_history,
          current_problem: {
            id: '',
            question: '',
            answer: '',
            explanation: ''
          },
          verification_result: {
            is_valid: false,
            feedback: '',
            suggestions: []
          },
          tex_content: '',
          pdf_path: '',
          status: 'in_progress'
        };
      }
    } catch (stateError) {
      console.error('状態の検証中にエラーが発生しました:', stateError);
      // エラーが発生した場合は新しい初期状態を作成
      state = {
        problem_spec: {
          difficulty: '',
          topic: '',
          format: '',
          count: undefined,
          details: ''
        },
        chat_history: chat_history,
        current_problem: {
          id: '',
          question: '',
          answer: '',
          explanation: ''
        },
        verification_result: {
          is_valid: false,
          feedback: '',
          suggestions: []
        },
        tex_content: '',
        pdf_path: '',
        status: 'in_progress'
      };
    }
    
    // スロットフィリングエージェントを実行
    const updatedState = await runSlotFillingAgent(state);
    
    console.log('スロットフィリング結果:', {
      status: updatedState.status,
      problem_spec: updatedState.problem_spec,
      last_message: updatedState.chat_history.length > 0 ? 
        updatedState.chat_history[updatedState.chat_history.length - 1] : 'なし'
    });
    
    // 応答を返す
    res.status(200).json(updatedState);
  } catch (error) {
    console.error('スロットフィリング中にエラーが発生しました:', error);
    
    // エラー発生時でも最低限の状態を返す
    const errorState: MathProblemState = {
      problem_spec: {
        difficulty: '',
        topic: '',
        format: '',
        count: undefined,
        details: ''
      },
      chat_history: [
        {
          role: 'assistant',
          content: 'すみません、エラーが発生しました。もう一度お試しください。'
        }
      ],
      current_problem: {
        id: '',
        question: '',
        answer: '',
        explanation: ''
      },
      verification_result: {
        is_valid: false,
        feedback: '',
        suggestions: []
      },
      tex_content: '',
      pdf_path: '',
      status: 'error'
    };
    
    res.status(500).json({ 
      ...errorState,
      error: 'スロットフィリング中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// 問題生成エージェントエンドポイント
router.post('/generate', (async (req: Request, res: Response) => {
  try {
    // リクエストボディが無効な場合の処理
    if (!req.body) {
      return res.status(400).json({
        error: '無効なリクエスト形式です',
        status: 'error'
      });
    }

    const { problemSpec } = req.body;
    
    if (!problemSpec) {
      return res.status(400).json({ 
        error: '問題仕様は必須です',
        status: 'error'
      });
    }
    
    // 問題仕様の検証
    console.log('受信した問題仕様:', JSON.stringify(problemSpec, null, 2));
    
    // formatフィールドが空の場合、デフォルト値「計算問題」を設定
    if (!problemSpec.format || problemSpec.format.trim() === '') {
      console.log('formatフィールドが空のため、デフォルト値「計算問題」を設定します');
      problemSpec.format = '計算問題';
    }
    
    if (!problemSpec.difficulty || !problemSpec.topic || !problemSpec.format || problemSpec.count === undefined) {
      console.error('必須項目の欠落:', {
        difficulty: problemSpec.difficulty,
        topic: problemSpec.topic,
        format: problemSpec.format,
        count: problemSpec.count,
        countType: typeof problemSpec.count
      });
      return res.status(400).json({
        error: '難易度、数学分野、出題形式、問題数は必須です',
        status: 'error'
      });
    }

    // 難易度の検証
    if (!['小学生', '中学生', '高校生'].includes(problemSpec.difficulty)) {
      console.error('難易度の不一致:', problemSpec.difficulty);
      return res.status(400).json({
        error: '難易度は「小学生」「中学生」「高校生」のいずれかである必要があります',
        status: 'error'
      });
    }

    // 問題数の検証
    console.log('問題数検証前:', {
      count: problemSpec.count, 
      type: typeof problemSpec.count,
      asNumber: Number(problemSpec.count)
    });

    // 数値として変換（文字列や0の場合にも対応）
    let count: number;
    if (typeof problemSpec.count === 'string') {
      count = parseInt(problemSpec.count, 10);
    } else {
      count = Number(problemSpec.count);
    }
    
    // 値が0または不正な場合は1をデフォルト値とする
    if (isNaN(count) || count <= 0) {
      console.log('問題数が0または不正なため、デフォルト値1を設定します');
      count = 1;
      problemSpec.count = 1;
    } else if (count > 10) {
      console.error('問題数の範囲超過:', count);
        return res.status(400).json({
          error: '問題数は1～10の整数である必要があります',
          status: 'error'
        });
    } else if (!Number.isInteger(count)) {
      console.error('問題数が整数でない:', count);
      // 小数点以下を切り捨てて整数化
      count = Math.floor(count);
      problemSpec.count = count;
      console.log('問題数を整数に変換しました:', count);
    }

    // 出題形式の検証
    if (!problemSpec.format.trim()) {
      return res.status(400).json({
        error: '出題形式が指定されていません',
        status: 'error'
      });
    }

    // 初期状態を作成
    const initialState: MathProblemState = {
      problem_spec: {
        difficulty: problemSpec.difficulty,
        topic: problemSpec.topic,
        format: problemSpec.format,
        count: count,
        details: problemSpec.details || ''
      },
      chat_history: [],
      current_problem: {
        id: '',
        question: '',
        answer: '',
        explanation: ''
      },
      verification_result: {
        is_valid: false,
        feedback: '',
        suggestions: []
      },
      tex_content: '',
      pdf_path: '',
      status: 'generating'
    };

    // 問題生成エージェントを実行
    try {
      const { runProblemGenerationAgent } = require('../agents/agents/problemGenerationAgent');
      let updatedState = await runProblemGenerationAgent(initialState);
      
      // 問題生成が成功した場合、検証エージェントを実行
      if (updatedState.status === 'problem_generated') {
        console.log('問題生成が完了しました。検証エージェントを実行します...');
        
        try {
          // 検証エージェントのインポート
          const { runSolutionVerificationAgent } = require('../agents/agents/solutionVerificationAgent');
          
          // 検証エージェントの実行
          updatedState = await runSolutionVerificationAgent(updatedState);
          console.log('検証結果:', updatedState.verification_result);
          
          // 検証結果に基づいて処理を分岐
          if (updatedState.verification_result && updatedState.verification_result.is_valid) {
            // 検証が成功した場合、TeX整形エージェントを実行
            console.log('検証が合格しました。TeX整形エージェントを実行します...');
            
            try {
              // TeX整形エージェントのインポート
              const { runTexFormatAgent } = require('../agents/agents/texFormatAgent');
              
              // TeX整形エージェントの実行
              updatedState = await runTexFormatAgent(updatedState);
              console.log('TeX整形完了:', { 
                tex_content_length: updatedState.tex_content ? updatedState.tex_content.length : 0,
                status: updatedState.status
              });
              
              // TeXコンテンツが生成された場合、PDFを生成
              if (updatedState.tex_content) {
                try {
                  console.log('TeXからPDFを生成します...');
                  
                  // PDFServiceをインポート
                  const { createPDFService, checkTexLiveInstallation } = require('../tex/pdfService');
                  
                  // TeXLiveの確認
                  const texCheck = await checkTexLiveInstallation();
                  if (!texCheck.isInstalled) {
                    console.warn(`PDF生成を試みますが、TeXLiveのインストールに問題があります: ${texCheck.message}`);
                  }
                  
                  const pdfService = createPDFService();
                  
                  // TeXからPDFを生成
                  const pdfPath = await pdfService.generatePDFFromTexString(
                    updatedState.tex_content,
                    {
                      filename: `math_problem_${Date.now()}`,
                      keepTexFile: true // デバッグ用にTeXファイルを保持
                    }
                  );
                  
                  // 生成されたPDFのパスを状態に保存
                  updatedState = {
                    ...updatedState,
                    pdf_path: pdfPath, // 相対パスをそのまま保存
                    status: 'pdf_generated'
                  };
                  
                  console.log('PDF生成完了:', pdfPath);
                } catch (pdfError: any) {
                  console.error('PDF生成中にエラーが発生しました:', pdfError);
                  
                  // エラーメッセージを設定するが、TeXコンテンツは保持
                  updatedState = {
                    ...updatedState,
                    status: 'tex_formatted_pdf_failed',
                    pdf_error: pdfError.message || 'PDF生成中に不明なエラーが発生しました'
                  };
                  
                  // エラー情報をログに出力
                  console.error('PDF生成失敗の詳細情報:', {
                    message: pdfError.message,
                    status: updatedState.status,
                    tex_length: updatedState.tex_content?.length || 0,
                    path: process.cwd()
                  });
                }
              }
            } catch (texError) {
              console.error('TeX整形エージェントの実行中にエラーが発生しました:', texError);
              // TeXエラーがあっても検証結果は返す
            }
          } else {
            // 検証が不合格の場合、問題修正エージェントを実行
            console.log('===== 検証が不合格 =====');
            console.log('検証結果:', {
              is_valid: updatedState.verification_result.is_valid,
              feedback: updatedState.verification_result.feedback.substring(0, 100) + '...',
              suggestions: updatedState.verification_result.suggestions
            });
            console.log('問題修正プロセスを開始します...');
            
            try {
              // 問題修正エージェントのインポート
              const { runProblemRevisionAgent } = require('../agents/agents/problemRevisionAgent');
              
              // 問題修正回数を追跡する変数
              let revisionAttempts = 0;
              const maxRevisions = 2; // 最大修正回数
              
              // 修正と再検証のループ
              while (revisionAttempts < maxRevisions) {
                revisionAttempts++;
                console.log(`\n===== 問題修正の試行: ${revisionAttempts}/${maxRevisions} =====`);
                
                // 問題修正エージェントの実行
                console.log('問題修正エージェントを実行中...');
                updatedState = await runProblemRevisionAgent(updatedState);
                console.log('問題修正が完了しました:', { 
                  revised_problem_id: updatedState.current_problem.id,
                  status: updatedState.status
                });
                
                // 修正された問題を再検証
                console.log('\n===== 修正された問題を再検証します =====');
                const previousState = { ...updatedState };
                updatedState = await runSolutionVerificationAgent(updatedState);
                console.log('再検証結果:', {
                  is_valid: updatedState.verification_result.is_valid,
                  feedback: updatedState.verification_result.feedback.substring(0, 100) + '...'
                });
                
                // 検証に合格した場合、TeX整形エージェントを実行してループを抜ける
                if (updatedState.verification_result && updatedState.verification_result.is_valid) {
                  console.log('\n===== 再検証が合格しました =====');
                  console.log('TeX整形エージェントを実行します...');
                  
                  try {
                    // TeX整形エージェントのインポート
                    const { runTexFormatAgent } = require('../agents/agents/texFormatAgent');
                    
                    // TeX整形エージェントの実行
                    updatedState = await runTexFormatAgent(updatedState);
                    console.log('TeX整形完了:', { 
                      tex_content_length: updatedState.tex_content ? updatedState.tex_content.length : 0,
                      status: updatedState.status
                    });
                    
                    // TeXコンテンツが生成された場合、PDFを生成
                    if (updatedState.tex_content) {
                      try {
                        console.log('TeXからPDFを生成します...');
                        
                        // PDFServiceをインポート
                        const { createPDFService, checkTexLiveInstallation } = require('../tex/pdfService');
                        
                        // TeXLiveの確認
                        const texCheck = await checkTexLiveInstallation();
                        if (!texCheck.isInstalled) {
                          console.warn(`PDF生成を試みますが、TeXLiveのインストールに問題があります: ${texCheck.message}`);
                        }
                        
                        const pdfService = createPDFService();
                        
                        // TeXからPDFを生成
                        const pdfPath = await pdfService.generatePDFFromTexString(
                          updatedState.tex_content,
                          {
                            filename: `math_problem_${Date.now()}`,
                            keepTexFile: true // デバッグ用にTeXファイルを保持
                          }
                        );
                        
                        // 生成されたPDFのパスを状態に保存
                        updatedState = {
                          ...updatedState,
                          pdf_path: pdfPath, // 相対パスをそのまま保存
                          status: 'pdf_generated'
                        };
                        
                        console.log('PDF生成完了:', pdfPath);
                      } catch (pdfError: any) {
                        console.error('PDF生成中にエラーが発生しました:', pdfError);
                        
                        // エラーメッセージを設定するが、TeXコンテンツは保持
                        updatedState = {
                          ...updatedState,
                          status: 'tex_formatted_pdf_failed',
                          pdf_error: pdfError.message || 'PDF生成中に不明なエラーが発生しました'
                        };
                      }
                    }
                  } catch (texError) {
                    console.error('TeX整形エージェントの実行中にエラーが発生しました:', texError);
                  }
                  
                  // 検証に合格したのでループを抜ける
                  break;
                }
                
                // 最大試行回数に達した場合
                if (revisionAttempts >= maxRevisions) {
                  console.log(`\n===== 最大修正回数(${maxRevisions}回)に達しました =====`);
                  console.log('修正を終了し、最終版の問題を返します（検証には合格していません）');
                  
                  // 最後に修正した問題を返す（検証には合格していない）
                  updatedState = {
                    ...updatedState,
                    status: 'max_revisions_reached'
                  };
                }
              }
            } catch (revisionError) {
              console.error('\n===== 問題修正プロセス中にエラーが発生しました =====');
              console.error(revisionError);
              // 修正エラーがあっても問題生成結果は返す
            }
          }
        } catch (verificationError) {
          console.error('検証エージェントの実行中にエラーが発生しました:', verificationError);
          // 検証エラーがあっても問題生成結果は返す
        }
      }
      
      // 成功レスポンスを返す
      return res.status(200).json(updatedState);
    } catch (agentError: any) {
      console.error('問題生成エージェントの実行中にエラーが発生しました:', agentError);
      return res.status(500).json({
        error: '問題生成エージェントの実行中にエラーが発生しました',
        details: agentError.message,
        status: 'error'
      });
    }
  } catch (error) {
    console.error('問題生成中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: '問題生成中にエラーが発生しました',
      status: 'error'
    });
  }
}) as express.RequestHandler);

// 検証エージェントエンドポイント
router.post('/verify', (async (req: Request, res: Response) => {
  try {
    const { problem, problemSpec } = req.body;
    
    if (!problem || !problemSpec) {
      return res.status(400).json({ 
        error: '問題と問題仕様は必須です' 
      });
    }
    
    // 将来的にLangGraphの検証エージェントを呼び出す実装を追加
    res.status(200).json({
      message: '検証エージェントエンドポイント',
      verificationResult: {
        overall: 'pass',
        aspects: {
          difficulty: { status: 'pass', message: '難易度は適切です' },
          subject: { status: 'pass', message: '分野は適切です' },
          language: { status: 'pass', message: '言語表現は適切です' },
          solution: { status: 'pass', message: '解答は適切です' },
          visualization: { status: 'pass', message: '視覚化は適切です' }
        }
      }
    });
  } catch (error) {
    console.error('検証中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: '検証中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// 解答検証エンドポイント
router.post('/verify-solution', (async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ 
        error: '無効なリクエスト形式です' 
      });
    }

    const { subject, difficulty, problem_text, solution } = req.body;
    
    if (!subject || !difficulty || !problem_text || !solution) {
      return res.status(400).json({ 
        error: '問題の科目、難易度、問題文、解答は必須です' 
      });
    }
    
    console.log('解答検証リクエスト:', {
      subject,
      difficulty,
      problem_text: problem_text.substring(0, 30) + '...',
      solution: {
        answer: solution.answer,
        text: solution.text?.substring(0, 30) + '...'
      }
    });
    
    // 簡易版の解答検証ロジック
    // 正解の例: x = 2, x = 3
    // 不正解の例: x = 2, x = 4
    const isCalculationCorrect = solution.answer.includes('x = 2') && 
                                solution.answer.includes('x = 3') &&
                                !solution.answer.includes('x = 4');
    
    // 解答ステップの完全性チェック
    const hasAllSteps = solution.text.includes('(x - 2)(x - 3) = 0');
    
    // 検証結果を生成
    const verificationResult = {
      is_valid: isCalculationCorrect && hasAllSteps,
      score: isCalculationCorrect ? (hasAllSteps ? 90 : 50) : 30,
      math_accuracy: {
        is_correct: isCalculationCorrect,
        error_details: isCalculationCorrect ? "" : "計算結果が正しくありません。x = 3が正解です。",
        score: isCalculationCorrect ? 100 : 30
      },
      solution_completeness: {
        has_all_steps: hasAllSteps,
        missing_steps: hasAllSteps ? [] : ["因数分解のステップが不足しています"],
        score: hasAllSteps ? 90 : 40
      },
      educational_value: {
        is_instructive: hasAllSteps,
        improvement_areas: hasAllSteps ? [] : ["各ステップの説明を追加するとより教育的になります"],
        score: hasAllSteps ? 85 : 60
      },
      feedback: isCalculationCorrect && hasAllSteps 
                ? "解答は数学的に正確で、解法ステップも完全です。" 
                : (isCalculationCorrect 
                    ? "計算結果は正確ですが、解法のステップが不足しています。" 
                    : "計算結果に誤りがあります。"),
      suggestions: [] as string[]
    };
    
    // 改善提案を追加
    if (!isCalculationCorrect) {
      verificationResult.suggestions.push("計算結果を確認してください。x^2 - 5x + 6 = 0の解はx = 2, x = 3です。");
    }
    
    if (!hasAllSteps) {
      verificationResult.suggestions.push("解法には因数分解のステップを含めてください: (x - 2)(x - 3) = 0");
    }
    
    // 検証結果を返す
    return res.status(200).json(verificationResult);
  } catch (error) {
    console.error('解答検証中にエラーが発生しました:', error);
    res.status(500).json({ 
      is_valid: false,
      feedback: '解答検証処理中にエラーが発生しました',
      suggestions: ['システム管理者に連絡してください']
    });
  }
}) as express.RequestHandler);

// TeX整形エージェントエンドポイント
router.post('/format-tex', (async (req: Request, res: Response) => {
  try {
    const { problem } = req.body;
    
    if (!problem) {
      return res.status(400).json({ 
        error: '問題は必須です' 
      });
    }
    
    // 将来的にLangGraphのTeX整形エージェントを呼び出す実装を追加
    res.status(200).json({
      message: 'TeX整形エージェントエンドポイント',
      texContent: '\\documentclass{article}\n\\begin{document}\nサンプルTeXコンテンツ\n\\end{document}'
    });
  } catch (error) {
    console.error('TeX整形中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: 'TeX整形中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// PDF生成エンドポイント
router.post('/generate-pdf', (async (req: Request, res: Response) => {
  try {
    const { texContent } = req.body;
    
    if (!texContent) {
      return res.status(400).json({ 
        error: 'TeXコンテンツは必須です' 
      });
    }
    
    // 将来的にPDF生成処理を実装
    res.status(200).json({
      message: 'PDF生成エンドポイント',
      pdfPath: '/output/sample.pdf'
    });
  } catch (error) {
    console.error('PDF生成中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: 'PDF生成中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

// PDFダウンロードエンドポイント
router.get('/pdf/:filepath(*)', ((req: Request, res: Response) => {
  try {
    const filepath = req.params.filepath;
    
    // パスの検証（セキュリティ対策）
    if (!filepath || filepath.includes('..')) {
      return res.status(400).json({ 
        error: '無効なファイルパスです' 
      });
    }
    
    // パスからディレクトリとファイル名を分離
    const rootDir = process.cwd();
    let filePath = '';
    
    // フルパスとして指定されている場合
    if (filepath.startsWith('output/')) {
      filePath = path.join(rootDir, filepath);
    } else {
      // ファイル名のみの場合は複数の可能性を検索
      const potentialDirs = [
        path.join(rootDir, 'output', 'pdfs'),
        path.join(rootDir, 'output')
      ];
      
      // 各ディレクトリで検索
      for (const dir of potentialDirs) {
        const potentialPath = path.join(dir, filepath);
        if (fs.existsSync(potentialPath)) {
          filePath = potentialPath;
          break;
        }
      }
      
      // 見つからなかった場合
      if (!filePath) {
        // すべての可能なディレクトリをチェック
        const allFiles = [];
        for (const dir of potentialDirs) {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            allFiles.push(...files.map(file => ({ dir, file })));
          }
        }
        
        return res.status(404).json({ 
          error: 'ファイルが見つかりません',
          requestedFile: filepath,
          availableFiles: allFiles.map(f => `${path.relative(rootDir, f.dir)}/${f.file}`)
        });
      }
    }
    
    console.log('PDFファイル要求:', { filepath, filePath, exists: fs.existsSync(filePath) });
    
    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'ファイルが見つかりません',
        requestedFile: filepath
      });
    }
    
    // PDFファイルを送信
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    
    // ファイルをストリームとして返す
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('PDFダウンロード中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: 'PDFダウンロード中にエラーが発生しました' 
    });
  }
}) as express.RequestHandler);

export default router; 