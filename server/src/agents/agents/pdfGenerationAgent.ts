import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { MathProblemState, PDFGenerationInputSchema, PDFGenerationOutputSchema } from '../types';
import { PDF_GENERATION_PROMPT } from '../prompts';
import { createPDFService } from '../../tex/pdfService';
import * as path from 'path';

const TEMPLATE_DIR = path.resolve(__dirname, '../../tex/templates');
const OUTPUT_DIR = path.resolve(__dirname, '../../../output/pdfs');

// PDF生成エージェント
export function createPDFGenerationAgent() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.7
  });

  // 実行シーケンスの定義
  const agent = RunnableSequence.from([
    {
      input: (input: z.infer<typeof PDFGenerationInputSchema>) => {
        return {
          tex_content: input.tex_content,
          options: {
            filename: `problem-${Date.now()}`,
          },
        };
      },
    },
    model,
    StructuredOutputParser.fromZodSchema(PDFGenerationOutputSchema),
  ]);

  return agent;
}

// PDF生成エージェントの実行関数
export async function runPDFGenerationAgent(state: MathProblemState): Promise<MathProblemState> {
  console.log("🚀 PDF生成エージェントを実行します");
  
  try {
    // PDFサービスの作成
    const pdfService = createPDFService(TEMPLATE_DIR, OUTPUT_DIR);
    
    // TeXコンテンツからPDF生成に必要な情報を抽出
    // 実際にはここでTeXコンテンツを解析して問題と解答を取り出す処理が必要
    // この実装では簡易的に直接問題と解答を設定
    
    // 問題データの準備
    const problemData = {
      problemText: state.current_problem?.question || "問題が見つかりません",
      answerText: state.current_problem?.answer || "解答が見つかりません", 
      explanationText: state.current_problem?.explanation || "解説が見つかりません",
      figureCode: extractFigureCode(state.tex_content || ""),
      isMultipleChoice: state.problem_spec && 'format' in state.problem_spec ? 
                        state.problem_spec.format === "選択式" : false,
      choices: extractChoices(state.current_problem)
    };
    
    // PDFの生成
    const pdfPath = await pdfService.generateMathProblemPDF(problemData, {
      filename: `problem-${Date.now()}`
    });
    
    console.log(`✅ PDFが生成されました: ${pdfPath}`);

    // 生成されたPDFのパスを状態に設定
    return {
      ...state,
      pdf_path: pdfPath,
      status: 'completed',
    };
  } catch (error) {
    console.error("❌ PDF生成中にエラーが発生しました:", error);
    
    // エラー発生時も状態を返す（エラー情報を追加）
    return {
      ...state,
      status: 'error',
      error: `PDF生成エラー: ${(error as Error).message}`
    } as MathProblemState;
  }
}

/**
 * TeXコンテンツから図形コードを抽出
 * @param texContent TeXコンテンツ
 * @returns 図形コード
 */
function extractFigureCode(texContent: string): string {
  // TikZコードの抽出（簡易実装）
  const tikzMatch = texContent.match(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/);
  if (tikzMatch && tikzMatch[0]) {
    return tikzMatch[0];
  }
  return "";
}

/**
 * 選択肢を抽出する
 * @param problem 問題データ
 * @returns 選択肢の配列
 */
function extractChoices(problem: any): string[] {
  if (problem && 'choices' in problem && Array.isArray(problem.choices)) {
    return problem.choices;
  }
  return [];
} 