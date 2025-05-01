import { z } from 'zod';

// 基本的なチャットメッセージの型定義
export interface ChatMessage {
  role: string;
  content: string;
}

// 問題仕様の型定義
export interface ProblemSpec {
  topic: string;
  difficulty: string;
  format?: string;
  count?: number;
  details?: string;
}

// 問題の型定義
export interface Problem {
  id: string;
  question: string;
  answer: string;
  explanation: string;
}

// 検証結果の型定義
export interface VerificationResult {
  is_valid: boolean;
  feedback: string;
  suggestions: string[];
}

// 状態管理の型定義
export interface MathProblemState {
  problem_spec: ProblemSpec;
  chat_history: ChatMessage[];
  current_problem: Problem;
  verification_result: VerificationResult;
  tex_content: string;
  pdf_path: string;
  status: string;
} 