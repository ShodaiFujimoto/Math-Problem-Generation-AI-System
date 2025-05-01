import OpenAI from 'openai';
import {
  OPENAI_API_CONFIG,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  formatOpenAIError
} from '../utils/openaiConfig';

export class OpenAIService {
  private client: OpenAI;
  private static instance: OpenAIService;

  // シングルトンパターンでインスタンス管理
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  private constructor() {
    // OpenAI APIクライアントの初期化
    this.client = new OpenAI(OPENAI_API_CONFIG);
  }

  /**
   * ChatGPT APIを使用してテキスト生成
   * @param messages チャットメッセージの配列
   * @param options 追加オプション
   * @returns 生成されたテキスト
   */
  public async createChatCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      tools?: OpenAI.Chat.ChatCompletionTool[];
    } = {}
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : DEFAULT_TEMPERATURE,
        max_tokens: options.max_tokens,
        tools: options.tools
      });

      // 応答がない場合
      if (!response.choices || response.choices.length === 0) {
        throw new Error('OpenAI APIからの応答がありませんでした。');
      }

      // 生成されたテキストを返す
      return response.choices[0].message.content || '';
    } catch (error: any) {
      console.error('OpenAI API呼び出しエラー:', error);
      throw new Error(formatOpenAIError(error));
    }
  }

  /**
   * JSONデータを生成するためのAPI呼び出し
   * @param messages チャットメッセージの配列
   * @param schema 期待するJSONスキーマ
   * @returns パースされたJSON
   */
  public async createJSONCompletion<T>(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      schema?: Record<string, any>;
    } = {}
  ): Promise<T> {
    try {
      const tools = options.schema
        ? [
            {
              type: 'function' as const,
              function: {
                name: 'output_formatter',
                description: 'Formats the output according to schema',
                parameters: options.schema
              }
            }
          ]
        : undefined;

      const response = await this.client.chat.completions.create({
        model: options.model || DEFAULT_MODEL,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : DEFAULT_TEMPERATURE,
        tools,
        tool_choice: tools
          ? { type: 'function', function: { name: 'output_formatter' } }
          : undefined
      });

      // 応答がない場合
      if (!response.choices || response.choices.length === 0) {
        throw new Error('OpenAI APIからの応答がありませんでした。');
      }

      // ツール呼び出しの結果を取得
      const toolCall = response.choices[0].message.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'output_formatter') {
        try {
          // JSONパース
          return JSON.parse(toolCall.function.arguments) as T;
        } catch (parseError) {
          throw new Error(`JSONパースエラー: ${parseError}`);
        }
      } else {
        // フォールバック: 通常の応答をJSONとしてパース
        const content = response.choices[0].message.content || '{}';
        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          throw new Error(`JSONパースエラー: ${parseError}`);
        }
      }
    } catch (error: any) {
      console.error('OpenAI JSON生成エラー:', error);
      throw new Error(formatOpenAIError(error));
    }
  }

  /**
   * APIキーが有効か確認するテスト関数
   * @returns APIキーが有効な場合はtrue
   */
  public async testAPIKey(): Promise<boolean> {
    try {
      // 簡単なAPIリクエストでテスト
      const response = await this.client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return !!response;
    } catch (error) {
      console.error('APIキーテストエラー:', error);
      return false;
    }
  }
} 