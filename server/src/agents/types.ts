import { z } from 'zod';

// 図形中間表現の型定義
export const FunctionGraphSchema = z.object({
  type: z.literal('function_graph'),
  functions: z.array(z.object({
    expression: z.string(),
    domain: z.array(z.number()).length(2),
    style: z.string().optional(),
    label: z.string().optional()
  })),
  highlight_points: z.array(z.array(z.number()).length(2)).optional(),
  fill_area: z.object({
    between: z.array(z.string()).length(2).optional(),
    domain: z.array(z.number()).length(2).optional()
  }).optional(),
  axes: z.object({
    xrange: z.array(z.number()).length(2),
    yrange: z.array(z.number()).length(2)
  }).optional()
});

export const GeometricElementSchema = z.object({
  type: z.enum(['polygon', 'circle', 'line', 'point', 'angle', 'arc']),
  points: z.array(z.array(z.number()).length(2)).optional(),
  center: z.array(z.number()).length(2).optional(),
  radius: z.number().optional(),
  start: z.array(z.number()).length(2).optional(),
  end: z.array(z.number()).length(2).optional(),
  style: z.string().optional()
});

export const GeometricSchema = z.object({
  type: z.literal('geometric'),
  elements: z.array(GeometricElementSchema),
  labels: z.array(z.object({
    position: z.array(z.number()).length(2),
    text: z.string()
  })).optional(),
  dimensions: z.array(z.object({
    from: z.array(z.number()).length(2),
    to: z.array(z.number()).length(2),
    text: z.string()
  })).optional()
});

export const VisualizationSchema = z.union([FunctionGraphSchema, GeometricSchema]);

export type Visualization = z.infer<typeof VisualizationSchema>;
export type FunctionGraph = z.infer<typeof FunctionGraphSchema>;
export type Geometric = z.infer<typeof GeometricSchema>;

// 問題生成の入力スキーマ
export const ProblemGenerationInputSchema = z.object({
  difficulty: z.string(),
  topic: z.string(),
  format: z.string().optional(),
  count: z.number().optional(),
  details: z.string().optional()
});

export type ProblemGenerationInput = z.infer<typeof ProblemGenerationInputSchema>;

// 問題の型定義
export interface Problem {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  visualization?: Visualization;
  created_at?: string;
}

// 問題生成の出力スキーマ
export const ProblemGenerationOutputSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.union([z.string(), z.record(z.any())]),
  explanation: z.union([z.string(), z.record(z.any())]),
  visualization: z.any().optional()
});

export type ProblemGenerationOutput = z.infer<typeof ProblemGenerationOutputSchema>;

// 検証の入力スキーマ
export const VerificationInputSchema = z.object({
  problem: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    explanation: z.string(),
    visualization: VisualizationSchema.optional()
  })
});

export type VerificationInput = z.infer<typeof VerificationInputSchema>;

// 検証の出力スキーマ
export const VerificationOutputSchema = z.object({
  is_valid: z.boolean(),
  feedback: z.string(),
  improvements: z.array(z.string()).optional()
});

export type VerificationOutput = z.infer<typeof VerificationOutputSchema>;

// 解答検証の出力スキーマ
export const SolutionVerificationOutputSchema = z.object({
  is_valid: z.boolean().describe('解答が数学的に正確かどうか'),
  score: z.number().min(0).max(100).describe('解答の品質スコア (0-100)'),
  math_accuracy: z.object({
    is_correct: z.boolean().describe('最終的な計算結果が正確かどうか'),
    error_details: z.string().optional().describe('計算エラーの詳細（ある場合）'),
    score: z.number().min(0).max(100).describe('数学的正確性のスコア (0-100)')
  }),
  solution_completeness: z.object({
    has_all_steps: z.boolean().describe('すべての必要な解法ステップが含まれているか'),
    missing_steps: z.array(z.string()).optional().describe('不足しているステップ（ある場合）'),
    score: z.number().min(0).max(100).describe('解法の完全性スコア (0-100)')
  }),
  educational_value: z.object({
    is_instructive: z.boolean().describe('解答が教育的価値を持つか'),
    improvement_areas: z.array(z.string()).optional().describe('改善すべき領域（ある場合）'),
    score: z.number().min(0).max(100).describe('教育的価値のスコア (0-100)')
  }),
  feedback: z.string().describe('全体的なフィードバック'),
  suggestions: z.array(z.string()).describe('改善のための具体的な提案')
});

export type SolutionVerificationOutput = z.infer<typeof SolutionVerificationOutputSchema>;

// TeXフォーマットの入力スキーマ
export const TeXFormatInputSchema = z.object({
  problem: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    explanation: z.string()
  })
});

export type TeXFormatInput = z.infer<typeof TeXFormatInputSchema>;

// TeXフォーマットの出力スキーマ
export const TeXFormatOutputSchema = z.object({
  tex_content: z.string()
});

export type TeXFormatOutput = z.infer<typeof TeXFormatOutputSchema>;

// PDF生成の入力スキーマ
export const PDFGenerationInputSchema = z.object({
  tex_content: z.string()
});

export type PDFGenerationInput = z.infer<typeof PDFGenerationInputSchema>;

// PDF生成の出力スキーマ
export const PDFGenerationOutputSchema = z.object({
  pdf_path: z.string()
});

export type PDFGenerationOutput = z.infer<typeof PDFGenerationOutputSchema>;

// 状態管理の型定義
export interface MathProblemState {
  problem_spec: {
    difficulty: string;
    topic: string;
    format?: string;
    count?: number;
    details?: string;
  };
  chat_history: Array<{
    role: string;
    content: string;
  }>;
  current_problem: {
    id: string;
    question: string;
    answer: string;
    explanation: string;
    visualization?: Visualization;
  };
  verification_result: {
    is_valid: boolean;
    feedback: string;
    suggestions: string[];
  };
  solution_verification_result?: SolutionVerificationOutput;
  tex_content: string;
  pdf_path: string;
  status: string;
  revision_history?: Array<{
    iteration: number;
    status: string;
    changes?: {
      from: any;
      to: any;
    };
    feedback?: string;
  }>;
}

// 状態管理クラス
export class StateManager {
  private problemSpec: z.infer<typeof ProblemGenerationInputSchema> | null = null;
  private currentProblem: z.infer<typeof ProblemGenerationOutputSchema> | null = null;
  private texContent: string | null = null;
  private pdfPath: string | null = null;

  updateProblemSpec(spec: z.infer<typeof ProblemGenerationInputSchema>) {
    this.problemSpec = spec;
  }

  updateCurrentProblem(problem: z.infer<typeof ProblemGenerationOutputSchema>) {
    this.currentProblem = problem;
  }

  updateTexContent(content: string) {
    this.texContent = content;
  }

  updatePdfPath(path: string) {
    this.pdfPath = path;
  }

  getProblemSpec() {
    return this.problemSpec;
  }

  getCurrentProblem() {
    return this.currentProblem;
  }

  getTexContent() {
    return this.texContent;
  }

  getPdfPath() {
    return this.pdfPath;
  }

  reset() {
    this.problemSpec = null;
    this.currentProblem = null;
    this.texContent = null;
    this.pdfPath = null;
  }
} 