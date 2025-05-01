import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import {
  ProblemGenerationInputSchema,
  ProblemGenerationOutputSchema,
  VerificationInputSchema,
  VerificationOutputSchema,
  TeXFormatInputSchema,
  TeXFormatOutputSchema,
  PDFGenerationInputSchema,
  PDFGenerationOutputSchema,
  StateManager
} from './types';
import {
  PROBLEM_GENERATION_PROMPT,
  VERIFICATION_PROMPT,
  TEX_FORMAT_PROMPT,
  PDF_GENERATION_PROMPT
} from './prompts';
import { agentGraph } from './graph';

// 状態管理のインスタンスを作成
export const stateManager = new StateManager();

// OpenAIモデルの初期化
const model = new ChatOpenAI({
  modelName: 'gpt-4-0125-preview',
  temperature: 0.7
});

// 問題生成エージェント
export const problemGenerationAgent = RunnableSequence.from([
  {
    input: (input: z.infer<typeof ProblemGenerationInputSchema>) => ({
      difficulty: input.difficulty,
      topic: input.topic,
      format: input.format || '記述式',
      count: input.count || 1,
      details: input.details || ''
    })
  },
  PROBLEM_GENERATION_PROMPT,
  model,
  StructuredOutputParser.fromZodSchema(ProblemGenerationOutputSchema)
]);

// 検証エージェント
export const verificationAgent = RunnableSequence.from([
  {
    input: (input: z.infer<typeof VerificationInputSchema>) => ({
      problem: {
        id: input.problem.id,
        question: input.problem.question,
        answer: input.problem.answer,
        explanation: input.problem.explanation
      }
    })
  },
  VERIFICATION_PROMPT,
  model,
  StructuredOutputParser.fromZodSchema(VerificationOutputSchema)
]);

// TeX整形エージェント
export const texFormatAgent = RunnableSequence.from([
  {
    input: (input: z.infer<typeof TeXFormatInputSchema>) => ({
      problem: {
        id: input.problem.id,
        question: input.problem.question,
        answer: input.problem.answer,
        explanation: input.problem.explanation
      }
    })
  },
  TEX_FORMAT_PROMPT,
  model,
  StructuredOutputParser.fromZodSchema(TeXFormatOutputSchema)
]);

// PDF生成エージェント
export const pdfGenerationAgent = RunnableSequence.from([
  {
    input: (input: z.infer<typeof PDFGenerationInputSchema>) => ({
      tex_content: input.tex_content
    })
  },
  PDF_GENERATION_PROMPT,
  model,
  StructuredOutputParser.fromZodSchema(PDFGenerationOutputSchema)
]);

// エージェントグラフをエクスポート
export { agentGraph }; 