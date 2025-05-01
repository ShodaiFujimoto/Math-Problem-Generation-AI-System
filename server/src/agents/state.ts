import { z } from 'zod';
import {
  ProblemGenerationInputSchema,
  ProblemGenerationOutputSchema,
  VerificationInputSchema,
  VerificationOutputSchema,
  TeXFormatInputSchema,
  TeXFormatOutputSchema,
  PDFGenerationInputSchema,
  PDFGenerationOutputSchema
} from './types';

export class StateManager {
  private problemSpec: z.infer<typeof ProblemGenerationInputSchema> | null = null;
  private problem: z.infer<typeof ProblemGenerationOutputSchema> | null = null;
  private verificationResult: z.infer<typeof VerificationOutputSchema> | null = null;
  private texContent: z.infer<typeof TeXFormatOutputSchema> | null = null;
  private pdfPath: z.infer<typeof PDFGenerationOutputSchema> | null = null;

  // 問題仕様の取得・設定
  getProblemSpec() {
    return this.problemSpec;
  }

  setProblemSpec(spec: z.infer<typeof ProblemGenerationInputSchema>) {
    this.problemSpec = spec;
  }

  // 生成された問題の取得・設定
  getProblem() {
    return this.problem;
  }

  setProblem(problem: z.infer<typeof ProblemGenerationOutputSchema>) {
    this.problem = problem;
  }

  // 検証結果の取得・設定
  getVerificationResult() {
    return this.verificationResult;
  }

  setVerificationResult(result: z.infer<typeof VerificationOutputSchema>) {
    this.verificationResult = result;
  }

  // TeXコンテンツの取得・設定
  getTexContent() {
    return this.texContent;
  }

  setTexContent(content: z.infer<typeof TeXFormatOutputSchema>) {
    this.texContent = content;
  }

  // PDFパスの取得・設定
  getPdfPath() {
    return this.pdfPath;
  }

  setPdfPath(path: z.infer<typeof PDFGenerationOutputSchema>) {
    this.pdfPath = path;
  }

  // 状態のリセット
  reset() {
    this.problemSpec = null;
    this.problem = null;
    this.verificationResult = null;
    this.texContent = null;
    this.pdfPath = null;
  }
}

export const stateManager = new StateManager(); 