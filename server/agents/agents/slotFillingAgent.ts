import { ChatOpenAI } from '@langchain/openai';
import { MathProblemState } from '../types';
import { 
  SlotFillingInputSchema, 
  SlotFillingOutputSchema, 
  SlotFillingInput,
  SlotFillingOutput,
  SlotFillingInputSchemaWithValidation,
  SlotFillingOutputSchemaWithValidation,
  SlotFillingOutputWithValidation,
  ValidationError
} from '../models/slotFillingModel';
import { 
  SLOT_FILLING_PROMPT_TEMPLATE,
  SLOT_FILLING_PROMPT_TEMPLATE_WITH_VALIDATION 
} from '../prompts/slotFillingPrompt';

// スロットフィリングエージェント
export const createSlotFillingAgent = () => {
  return new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.7
  });
};

// スロットフィリングエージェントの実行関数（入力検証機能付き）
export const runSlotFillingAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  try {
    console.log('スロットフィリングエージェントを実行中...');
    
    const model = createSlotFillingAgent();
    
    // 入力の準備
    const input: SlotFillingInput = {
      chat_history: state.chat_history,
      problem_spec: {
        subject: state.problem_spec.topic || '',
        difficulty: state.problem_spec.difficulty || '',
        format: state.problem_spec.format,
        count: state.problem_spec.count ? Number(state.problem_spec.count) : undefined,
        details: state.problem_spec.details,
        constraints: '',
        visualization: {}
      }
    };
    
    console.log('スロットフィリング入力:', input);
    
    // プロンプトの準備（入力検証機能付き）
    const prompt = SLOT_FILLING_PROMPT_TEMPLATE_WITH_VALIDATION
      .replace('{chat_history}', JSON.stringify(input.chat_history, null, 2))
      .replace('{problem_spec}', JSON.stringify(input.problem_spec, null, 2));
    
    // API呼び出し
    const response = await model.invoke(prompt);
    
    // レスポンスをパース
    let output: SlotFillingOutputWithValidation;
    try {
      const content = response.content.toString();
      // JSONの部分を抽出
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) || 
                       content.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      output = JSON.parse(jsonString) as SlotFillingOutputWithValidation;
      
      // スキーマ検証
      if (!output.problem_spec || !output.chat_history) {
        throw new Error('出力が必要なフィールドを含んでいません');
      }
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      throw new Error('AI応答の解析に失敗しました');
    }
    
    console.log('スロットフィリング出力:', output);
    
    // 入力検証エラーをログに出力
    if (output.validation_errors && output.validation_errors.length > 0) {
      console.log('入力検証エラー:', output.validation_errors);
    }
    
    // アシスタントの応答がない場合は追加
    const lastMessage = output.chat_history[output.chat_history.length - 1];
    if (lastMessage.role === 'user') {
      // 検証エラーがある場合はフィードバックを含める
      let responseContent = output.next_question || '問題仕様の入力が完了しました。問題を生成します。';
      
      if (output.validation_errors && output.validation_errors.length > 0) {
        const errorMessages = output.validation_errors.map(err => {
          switch(err.field) {
            case 'count':
              return '問題数は1〜10問の範囲内で指定してください。';
            case 'difficulty':
              return '難易度は「小学生」「中学生」「高校生」のいずれかで指定してください。';
            default:
              return err.message;
          }
        });
        
        responseContent = `${errorMessages.join(' ')} ${responseContent}`;
      }
      
      output.chat_history.push({
        role: 'assistant',
        content: responseContent
      });
    }
    
    // 数値型の変換（count）
    let count: number | undefined = undefined;
    if (output.problem_spec.count !== undefined) {
      count = output.problem_spec.count;
    }
    
    // 状態の更新
    return {
      ...state,
      problem_spec: {
        difficulty: output.problem_spec.difficulty,
        topic: output.problem_spec.subject,
        format: output.problem_spec.format,
        count: count,
        details: output.problem_spec.details
      },
      chat_history: output.chat_history,
      status: output.is_complete ? 'slots_filled' : 'in_progress'
    };
  } catch (error) {
    console.error('スロットフィリングエージェントの実行中にエラーが発生しました:', error);
    
    // エラーがあっても状態は維持して返す
    return {
      ...state,
      chat_history: [
        ...state.chat_history,
        {
          role: 'assistant',
          content: 'すみません、エラーが発生しました。もう一度お試しください。'
        }
      ]
    };
  }
}; 