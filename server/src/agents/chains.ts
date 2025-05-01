import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

import {
  PROBLEM_GENERATION_PROMPT,
  VERIFICATION_PROMPT,
  TEX_FORMAT_PROMPT,
  PDF_GENERATION_PROMPT
} from './prompts';
import {
  ProblemGenerationInputSchema,
  ProblemGenerationOutputSchema,
  VerificationInputSchema,
  VerificationOutputSchema,
  TeXFormatInputSchema,
  TeXFormatOutputSchema,
  PDFGenerationInputSchema,
  PDFGenerationOutputSchema,
  Problem,
  VerificationOutput,
  TeXFormatOutput,
  PDFGenerationOutput
} from './types';

// OpenAIモデルの初期化
const model = new ChatOpenAI({
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7
});

// 問題生成チェーン
const problemGenerationParser = StructuredOutputParser.fromZodSchema(
  z.object({
    question: z.string().describe('問題文'),
    answer: z.string().describe('解答'),
    explanation: z.string().describe('解説')
  })
);

const problemGenerationPrompt = PromptTemplate.fromTemplate(`
あなたは数学の教師です。以下の条件に従って問題を生成してください：

難易度: {difficulty}
単元: {topic}

{format_instructions}

問題は以下の形式で出力してください：
- 問題文は明確で理解しやすい日本語で記述
- 解答は簡潔に記述
- 解説は理解を助ける詳細な説明を含める
`);

// 問題生成チェーンの出力をJSON形式に変換する関数
const formatProblemGenerationOutput = (output: z.infer<typeof problemGenerationParser.schema>): Problem => {
  return {
    id: generateUniqueId(),
    question: output.question,
    answer: output.answer,
    explanation: output.explanation,
    created_at: new Date().toISOString()
  };
};

// ユニークIDを生成する関数
const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

export const problemGenerationChain = RunnableSequence.from([
  {
    input: (input: { difficulty: string; topic: string }) => ({
      difficulty: input.difficulty,
      topic: input.topic,
      format_instructions: problemGenerationParser.getFormatInstructions()
    })
  },
  problemGenerationPrompt,
  new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7
  }),
  problemGenerationParser,
  formatProblemGenerationOutput
]);

// 検証チェーン
const verificationParser = StructuredOutputParser.fromZodSchema(
  z.object({
    is_valid: z.boolean().describe('問題が有効かどうか'),
    feedback: z.string().describe('フィードバック')
  })
);

const verificationPrompt = PromptTemplate.fromTemplate(`
以下の問題を検証してください：

問題文: {question}
解答: {answer}
解説: {explanation}

{format_instructions}

以下の点を確認してください：
1. 問題文は明確で理解しやすいか
2. 解答は正しいか
3. 解説は十分な説明を含んでいるか
`);

// 検証チェーンの出力をJSON形式に変換する関数
const formatVerificationOutput = (output: z.infer<typeof verificationParser.schema>): VerificationOutput => {
  return {
    is_valid: output.is_valid,
    feedback: output.feedback,
    improvements: [] // オプショナルだが空配列を設定
  };
};

export const verificationChain = RunnableSequence.from([
  {
    input: (input: { question: string; answer: string; explanation: string }) => ({
      question: input.question,
      answer: input.answer,
      explanation: input.explanation,
      format_instructions: verificationParser.getFormatInstructions()
    })
  },
  verificationPrompt,
  new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.3
  }),
  verificationParser,
  formatVerificationOutput
]);

// TeXフォーマットチェーン
const texFormatParser = StructuredOutputParser.fromZodSchema(
  z.object({
    tex_content: z.string().describe('TeX形式の問題文')
  })
);

const texFormatPrompt = PromptTemplate.fromTemplate(`
以下の問題をTeX形式に変換してください：

問題文: {question}
解答: {answer}
解説: {explanation}

{format_instructions}

TeXの記法に従って、数式を適切に変換してください。
`);

// TeXフォーマットチェーンの出力をJSON形式に変換する関数
const formatTexFormatOutput = (output: z.infer<typeof texFormatParser.schema>): TeXFormatOutput => {
  return {
    tex_content: output.tex_content
  };
};

export const texFormatChain = RunnableSequence.from([
  {
    input: (input: { question: string; answer: string; explanation: string }) => ({
      question: input.question,
      answer: input.answer,
      explanation: input.explanation,
      format_instructions: texFormatParser.getFormatInstructions()
    })
  },
  texFormatPrompt,
  new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.3
  }),
  texFormatParser,
  formatTexFormatOutput
]);

// PDF生成チェーン
const pdfGenerationParser = StructuredOutputParser.fromZodSchema(
  z.object({
    pdf_path: z.string().describe('生成されたPDFファイルのパス')
  })
);

const pdfGenerationPrompt = PromptTemplate.fromTemplate(`
以下のTeXコンテンツからPDFを生成してください：

{tex_content}

{format_instructions}

PDFは適切なフォーマットで生成され、数式が正しく表示されることを確認してください。
`);

// PDF生成チェーンの出力をJSON形式に変換する関数
const formatPdfGenerationOutput = (output: z.infer<typeof pdfGenerationParser.schema>): PDFGenerationOutput => {
  return {
    pdf_path: output.pdf_path
  };
};

export const pdfGenerationChain = RunnableSequence.from([
  {
    input: (input: { tex_content: string }) => ({
      tex_content: input.tex_content,
      format_instructions: pdfGenerationParser.getFormatInstructions()
    })
  },
  pdfGenerationPrompt,
  new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.3
  }),
  pdfGenerationParser,
  formatPdfGenerationOutput
]); 