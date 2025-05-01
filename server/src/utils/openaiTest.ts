import { OpenAIService } from '../services/openaiService';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数の読み込み（プロジェクトルートの.envファイル）
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// APIキーが設定されているか確認
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEYが設定されていません。.envファイルを確認してください。');
  process.exit(1);
}

// 基本的なOpenAI API呼び出しのテスト
async function testBasicChatCompletion() {
  console.log('=== 基本的なOpenAI API呼び出しテスト ===');
  
  try {
    const openaiService = OpenAIService.getInstance();
    
    // APIキーのテスト
    console.log('APIキーのテスト中...');
    const isValid = await openaiService.testAPIKey();
    if (!isValid) {
      throw new Error('APIキーテストに失敗しました。APIキーが有効か確認してください。');
    }
    console.log('APIキーは有効です。');
    
    // 簡単なチャット例
    console.log('\n簡単なテキスト生成テスト...');
    const messages = [
      { role: 'system' as const, content: '簡潔に答えてください。' },
      { role: 'user' as const, content: '数学で二次関数とは何ですか？' }
    ];
    
    const result = await openaiService.createChatCompletion(messages, { max_tokens: 100 });
    console.log('生成結果:', result);
    
    // JSON形式でのレスポーステスト
    console.log('\nJSON形式での出力テスト...');
    const jsonSchema = {
      type: 'object',
      properties: {
        definition: { type: 'string' },
        examples: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['definition', 'examples']
    };
    
    const jsonMessages = [
      { role: 'system' as const, content: 'あなたは数学の情報を提供するAIです。JSONフォーマットで回答してください。' },
      { role: 'user' as const, content: '二次関数の定義と例を教えてください。' }
    ];
    
    const jsonResult = await openaiService.createJSONCompletion(jsonMessages, { schema: jsonSchema });
    console.log('JSON生成結果:', JSON.stringify(jsonResult, null, 2));
    
    console.log('\nすべてのテストが成功しました！');
  } catch (error) {
    console.error('テスト失敗:', error instanceof Error ? error.message : String(error));
  }
}

// テスト実行
testBasicChatCompletion().catch(error => {
  console.error('テスト実行エラー:', error);
}); 