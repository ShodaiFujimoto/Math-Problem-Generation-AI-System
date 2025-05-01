import { OpenAIService } from '../services/openaiService';
import { z } from 'zod';

// 基本的なエージェントクラス - OpenAIServiceを使用
export class CustomOpenAIAgent<InputType, OutputType> {
  private openaiService: OpenAIService;
  private systemPrompt: string;
  private outputSchema: z.ZodType<OutputType>;
  
  constructor(
    systemPrompt: string,
    outputSchema: z.ZodType<OutputType>
  ) {
    this.openaiService = OpenAIService.getInstance();
    this.systemPrompt = systemPrompt;
    this.outputSchema = outputSchema;
  }
  
  /**
   * 入力からプロンプトを生成するメソッド（オーバーライド用）
   */
  protected createPrompt(input: InputType): string {
    return JSON.stringify(input, null, 2);
  }
  
  /**
   * エージェントを実行
   */
  public async run(input: InputType): Promise<OutputType> {
    try {
      // 入力からプロンプトを生成
      const userPrompt = this.createPrompt(input);
      
      // メッセージ配列の作成
      const messages = [
        { role: 'system' as const, content: this.systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];
      
      // スキーマからJSONスキーマを取得
      const jsonSchema = this.zodTypeToJSONSchema(this.outputSchema);
      
      // OpenAI APIを呼び出してJSON結果を取得
      const result = await this.openaiService.createJSONCompletion<OutputType>(messages, {
        schema: jsonSchema
      });
      
      // 出力をスキーマで検証
      try {
        return this.outputSchema.parse(result);
      } catch (validationError) {
        console.error('出力スキーマ検証エラー:', validationError);
        throw new Error('AIの出力が期待する形式と一致しませんでした。');
      }
    } catch (error) {
      console.error('エージェント実行エラー:', error);
      throw new Error(`エージェントの実行に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * ZodスキーマをJSON Schemaに変換（基本的な実装）
   */
  private zodTypeToJSONSchema(zodType: z.ZodType<any>): Record<string, any> {
    // Z.objectの場合
    if (zodType instanceof z.ZodObject) {
      const shape = zodType._def.shape();
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      for (const [key, schema] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJSONSchema(schema as z.ZodType<any>);
        
        // 必須フィールドの判定（簡易版）
        if (!(schema instanceof z.ZodOptional)) {
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    // Z.stringの場合
    if (zodType instanceof z.ZodString) {
      return { type: 'string' };
    }
    
    // Z.numberの場合
    if (zodType instanceof z.ZodNumber) {
      return { type: 'number' };
    }
    
    // Z.booleanの場合
    if (zodType instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }
    
    // Z.arrayの場合
    if (zodType instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodTypeToJSONSchema(zodType._def.type)
      };
    }
    
    // その他のタイプは簡易的に処理
    return { type: 'string' };
  }
}

// 問題生成エージェントの例
export class ProblemGenerationAgent extends CustomOpenAIAgent<
  {
    difficulty: string;
    topic: string;
    format?: string;
    count?: number;
    details?: string;
  },
  {
    id: string;
    question: string;
    answer: string;
    explanation: string;
  }
> {
  constructor() {
    // システムプロンプトとスキーマを指定
    super(
      `あなたは数学の問題を生成するAIアシスタントです。
以下の要件に従って問題を生成してください：

1. 難易度に応じた適切な問題を生成
2. 明確で理解しやすい問題文
3. 正確な解答と詳細な解説
4. 数学的な厳密性の確保
5. 教育効果を考慮した問題設計

指定された難易度、トピック、形式に従って数学問題を生成してください。`,
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
        explanation: z.string()
      })
    );
  }
  
  // 入力からプロンプトを生成するメソッドをオーバーライド
  protected override createPrompt(input: {
    difficulty: string;
    topic: string;
    format?: string;
    count?: number;
    details?: string;
  }): string {
    return `以下の条件に基づいた数学問題を生成してください：
      
難易度: ${input.difficulty}
トピック: ${input.topic}
形式: ${input.format || '記述式'}
問題数: ${input.count || 1}
追加要件: ${input.details || 'なし'}

一つの問題だけを生成し、以下の形式でJSON出力してください。`;
  }
} 