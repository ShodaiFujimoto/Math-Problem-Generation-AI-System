import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { MathProblemState, VerificationInputSchema, SolutionVerificationOutputSchema } from '../types';
import { SOLUTION_VERIFICATION_PROMPT } from '../prompts';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * 解答検証エージェントを作成する関数
 * 解答の数学的正確性、解法ステップの完全性、教育的価値を検証する
 */
export const createSolutionVerificationAgent = () => {
  const model = new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.2 // 検証は客観的に行うため、温度を低めに設定
  });

  // 単純なチェーン実装
  return async (input: z.infer<typeof VerificationInputSchema>) => {
    try {
      // 入力を整形
      const formattedInput = {
        problem: {
          id: input.problem.id,
          question: input.problem.question,
          answer: input.problem.answer,
          explanation: input.problem.explanation,
          visualization: input.problem.visualization
        }
      };

      // プロンプトを適用
      const promptText = await SOLUTION_VERIFICATION_PROMPT.format({
        "problem.id": input.problem.id || "unknown-id",
        "problem.question": input.problem.question || "",
        "problem.answer": input.problem.answer || "",
        "problem.explanation": input.problem.explanation || ""
      });
      
      // モデルの呼び出し
      const response = await model.invoke(promptText);
      
      // 結果の解析
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*?}/);
      
      let parsedOutput;
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsedOutput = JSON.parse(jsonStr);
      } else {
        throw new Error('JSONレスポンスのパースに失敗しました');
      }
      
      // Zodスキーマを使った型検証
      const validatedOutput = SolutionVerificationOutputSchema.parse(parsedOutput);
      
      return validatedOutput;
    } catch (error) {
      console.error('検証エージェント実行中にエラーが発生:', error);
      
      // エラー時はデフォルトのレスポンスを返す
      return {
        is_valid: false,
        score: 0,
        math_accuracy: {
          is_correct: false,
          error_details: `エラー: ${error}`,
          score: 0
        },
        solution_completeness: {
          has_all_steps: false,
          missing_steps: ['エラーにより検証不能'],
          score: 0
        },
        educational_value: {
          is_instructive: false,
          improvement_areas: ['エラーにより検証不能'],
          score: 0
        },
        feedback: `検証処理中にエラーが発生しました: ${error}`,
        suggestions: ['システム管理者に連絡してください']
      };
    }
  };
};

/**
 * 解答検証エージェントを実行する関数
 * @param state 現在の問題の状態
 * @returns 更新された状態（検証結果を含む）
 */
export const runSolutionVerificationAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  try {
    console.log('解答検証エージェントを実行中...');
    
    const agent = createSolutionVerificationAgent();
    
    const input: z.infer<typeof VerificationInputSchema> = {
      problem: state.current_problem
    };
    
    console.log('解答検証入力:', input);
    
    // エージェント実行
    const output = await agent(input);
    
    console.log('解答検証結果:', output);
    
    // 状態を更新して返す
    return {
      ...state,
      solution_verification_result: output,
      // 既存の verification_result も互換性のために更新
      verification_result: {
        is_valid: output.is_valid,
        feedback: output.feedback,
        suggestions: output.suggestions
      },
      status: output.is_valid ? 'verified' : 'verification_failed'
    };
  } catch (error) {
    console.error('解答検証エージェントの実行中にエラーが発生しました:', error);
    
    // エラー時はエラー情報を含む状態を返す
    return {
      ...state,
      verification_result: {
        is_valid: false,
        feedback: 'エラー: 解答の検証中に問題が発生しました。',
        suggestions: ['システム管理者に連絡してください。']
      },
      status: 'verification_error'
    };
  }
}; 