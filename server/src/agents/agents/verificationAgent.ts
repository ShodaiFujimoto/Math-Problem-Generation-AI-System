import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { MathProblemState, VerificationInputSchema, VerificationOutputSchema } from '../types';
import { VERIFICATION_PROMPT } from '../prompts';

// 検証エージェントの実装
const verificationParser = StructuredOutputParser.fromZodSchema(
  z.object({
    is_valid: z.boolean().describe('問題が有効かどうか'),
    feedback: z.string().describe('フィードバック'),
    improvements: z.array(z.string()).optional().describe('改善点')
  })
);

// フォーマット関数
const formatVerificationOutput = (output: any) => {
  // improvementsをsuggestionsとして追加
  return {
    is_valid: output.is_valid,
    feedback: output.feedback,
    suggestions: output.improvements || [] // improvementsがない場合は空配列を設定
  };
};

// 検証エージェント
export const verificationChain = RunnableSequence.from([
  {
    input: (input: z.infer<typeof VerificationInputSchema>) => ({
      problem_id: input.problem.id,
      problem_question: input.problem.question,
      problem_answer: input.problem.answer,
      problem_explanation: input.problem.explanation,
      format_instructions: verificationParser.getFormatInstructions()
    })
  },
  PromptTemplate.fromTemplate(`
あなたは数学問題の検証を行うAIアシスタントです。
以下の数学問題を検証し、問題点や改善点を指摘してください。

問題ID: {problem_id}
問題文: {problem_question}
解答: {problem_answer}
解説: {problem_explanation}

以下の点を確認してください：
1. 問題文は明確で理解しやすいか
2. 解答は数学的に正確か
3. 解説は十分な説明を含んでいるか
4. 表現や記述に問題はないか

{format_instructions}
  `),
  new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.3
  }),
  verificationParser,
  formatVerificationOutput
]);

// 検証エージェントの実行関数
export const runVerificationAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  try {
    const input: z.infer<typeof VerificationInputSchema> = {
      problem: state.current_problem
    };
    
    const output = await verificationChain.invoke(input);
    
    return {
      ...state,
      verification_result: output,
      status: 'verified'
    };
  } catch (error) {
    console.error('検証エージェントの実行中にエラーが発生しました:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      ...state,
      status: 'error',
      verification_result: {
        is_valid: false,
        feedback: `検証中にエラーが発生しました: ${errorMessage}`,
        suggestions: ['エラーが発生したため、検証を完了できませんでした。再試行してください。']
      }
    };
  }
}; 