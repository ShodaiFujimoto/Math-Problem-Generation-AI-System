import { z } from 'zod';

// スロットフィリングの入力スキーマ
export const SlotFillingInputSchema = z.object({
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  problem_spec: z.object({
    subject: z.string().optional(),
    difficulty: z.string().optional(),
    format: z.string().optional(),
    count: z.number().optional(),
    details: z.string().optional(),
    constraints: z.string().optional(),
    visualization: z.record(z.any()).optional()
  })
});

export type SlotFillingInput = z.infer<typeof SlotFillingInputSchema>;

// スロットフィリングの出力スキーマ
export const SlotFillingOutputSchema = z.object({
  problem_spec: z.object({
    subject: z.string(),
    difficulty: z.string(),
    format: z.string().optional(),
    count: z.number().optional(),
    details: z.string().optional(),
    constraints: z.string().optional(),
    visualization: z.record(z.any()).optional()
  }),
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  is_complete: z.boolean(),
  missing_slots: z.array(z.string()).optional(),
  next_question: z.string().optional()
});

export type SlotFillingOutput = z.infer<typeof SlotFillingOutputSchema>;

// 問題仕様の型定義
export interface ProblemSpec {
  subject: string;
  difficulty: string;
  format?: string;
  count?: number;
  details?: string;
  constraints?: string;
  visualization?: Record<string, any>;
}

// チャットメッセージの型定義
export interface ChatMessage {
  role: string;
  content: string;
}

// スロットフィリング状態の型定義
export interface SlotFillingState {
  problem_spec: ProblemSpec;
  chat_history: ChatMessage[];
  is_complete: boolean;
  missing_slots?: string[];
  next_question?: string;
}

// スロットフィリングの入力スキーマ（制約付き）
export const SlotFillingInputSchemaWithValidation = z.object({
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  problem_spec: z.object({
    subject: z.string().optional(),
    difficulty: z.enum(['小学生', '中学生', '高校生']).optional(),
    format: z.string().optional(),
    count: z.number().int().min(1).max(10).optional(),
    details: z.string().optional(),
    constraints: z.string().optional(),
    visualization: z.record(z.any()).optional()
  })
});

// スロットフィリングの出力スキーマ（制約付き）
export const SlotFillingOutputSchemaWithValidation = z.object({
  problem_spec: z.object({
    subject: z.string(),
    difficulty: z.enum(['小学生', '中学生', '高校生']),
    format: z.string().optional(),
    count: z.number().int().min(1).max(10).optional(),
    details: z.string().optional(),
    constraints: z.string().optional(),
    visualization: z.record(z.any()).optional()
  }),
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  is_complete: z.boolean(),
  missing_slots: z.array(z.string()).optional(),
  next_question: z.string().optional(),
  validation_errors: z.array(z.object({
    field: z.string(),
    message: z.string()
  })).optional()
});

export type ValidationError = {
  field: string;
  message: string;
};

export type SlotFillingOutputWithValidation = z.infer<typeof SlotFillingOutputSchemaWithValidation>; 