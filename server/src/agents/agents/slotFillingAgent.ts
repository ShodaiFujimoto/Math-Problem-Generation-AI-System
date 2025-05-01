import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { MathProblemState } from '../types';

// スロットフィリングの入力スキーマ
export const SlotFillingInputSchema = z.object({
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  problem_spec: z.object({
    difficulty: z.string().optional(),
    topic: z.string().optional(),
    format: z.string().optional(),
    count: z.number().optional(),
    details: z.string().optional()
  })
});

export type SlotFillingInput = z.infer<typeof SlotFillingInputSchema>;

// スロットフィリングの入力スキーマ（検証付き）
export const SlotFillingInputSchemaWithValidation = z.object({
  chat_history: z.array(z.object({
    role: z.string(),
    content: z.string()
  })),
  problem_spec: z.object({
    difficulty: z.enum(['小学生', '中学生', '高校生']).optional(),
    topic: z.string().optional(),
    format: z.string().optional(),
    count: z.number().int().min(1).max(10).optional(),
    details: z.string().optional()
  })
});

// スロットフィリングの出力スキーマ
export const SlotFillingOutputSchema = z.object({
  problem_spec: z.object({
    difficulty: z.string(),
    topic: z.string(),
    format: z.string(),
    count: z.number(),
    details: z.string().optional()
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

// スロットフィリングの出力スキーマ（検証付き）
export const SlotFillingOutputSchemaWithValidation = z.object({
  problem_spec: z.object({
    difficulty: z.enum(['小学生', '中学生', '高校生']),
    topic: z.string(),
    format: z.string(),
    count: z.number().int().min(1).max(10),
    details: z.string().optional()
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

// スロットフィリングプロンプト（入力検証機能付き）
const SLOT_FILLING_PROMPT_WITH_VALIDATION = `あなたは数学の問題仕様を決定するためのスロットフィリングエージェントです。
ユーザーとの対話を通じて、問題生成に必要な情報を収集してください。

現在の会話履歴:
{chat_history}

現在の問題仕様:
{problem_spec}

以下の項目が必須です：
- difficulty: 難易度（小学生、中学生、高校生のみ有効）
- topic: 数学分野（数と式、関数、図形、確率・統計など）
- format: 出題形式（記述式、選択式、計算問題など）
- count: 問題数（1〜10問の整数のみ有効）

以下の項目はオプションです：
- details: 詳細条件（特定トピックや要求）
  ※detailsフィールドにはユーザーの入力履歴が蓄積されています。
  ※この情報は問題生成時の参考情報として使用されるため、
  ※ユーザーの要望や具体的な指示が含まれていることがあります。
  ※問題生成時にはこの情報を尊重し、できるだけ反映するようにしてください。

必須項目がすべて埋まっているか確認し、埋まっていない項目があれば、その項目について質問を生成してください。

ユーザーの入力に以下の問題がある場合は、入力値を検証し、適切なフィードバックを提供してください：
1. 難易度が「小学生」「中学生」「高校生」以外の場合
2. 問題数が1〜10の範囲外の場合（例：0問、15問、-2問）
3. 問題数が整数でない場合
4. 形式が指定されていないか不明確な場合

問題数の取り扱いについて重要な点：
- ユーザーが「1問」「2問」のように数字+「問」の形式で入力した場合は、数字部分だけを抽出して問題数として設定してください。
- 例えば、「1問」は count=1、「3問」は count=3 とします。
- 「一問」「二問」のような漢数字も対応し、適切なアラビア数字に変換してください。
- 「1」「5」のような単独の数字の入力も問題数として認識してください。
- 以下のような様々な表現も問題数として認識してください：
  * 「5問お願いします」→ count=5
  * 「問題を3つ生成」→ count=3
  * 「7個の問題」→ count=7
  * 「問題数は2」→ count=2

入力値に問題がある場合：
- 指定された値を受け入れず、フィールドを空のままにしてください
- 次の質問で入力値の制約について明示的に説明し、正しい入力を促してください
- validation_errorsフィールドに問題のある項目と理由を記録してください

例えば：
ユーザーが「15問出題してください」と言った場合：
- countフィールドは空のままにする
- 次の質問に「問題数は1〜10問の範囲内で指定してください」と含める
- validation_errorsに{field: "count", message: "問題数は1〜10問の範囲内である必要があります"}を含める

ユーザーが「1問」と言った場合：
- countフィールドに1を設定する
- 次の質問に進む
- 入力は有効なので validation_errors は空にする

すべての必須項目が埋まり、入力値が制約を満たしている場合のみ、is_completeをtrueに設定してください。

出力は以下のJSON形式で返してください：
{
  "problem_spec": {
    "difficulty": "難易度（小学生、中学生、高校生のみ）",
    "topic": "数学分野",
    "format": "出題形式（記述式、選択式、計算問題など）",
    "count": 問題数（1〜10の整数）,
    "details": "詳細条件（オプション）"
  },
  "chat_history": [
    {"role": "user", "content": "ユーザーの質問"},
    {"role": "assistant", "content": "アシスタントの回答"}
  ],
  "is_complete": true/false,
  "missing_slots": ["埋まっていない項目1", "埋まっていない項目2"],
  "next_question": "次の質問文（まだ必須項目が埋まっていない場合）",
  "validation_errors": [
    {"field": "問題のあるフィールド名", "message": "エラーメッセージ"}
  ]
}`;

// スロットフィリングエージェント
export const createSlotFillingAgent = () => {
  return new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.7
  });
};

/**
 * ユーザー入力から数値を抽出するヘルパー関数
 * 「1問」「３問」「一問」などの形式から数値を抽出する
 */
function extractNumberFromInput(input: string): number | null {
  // 日本語文章からの問題数を検出するための辞書
  const countPhrases = [
    {regex: /(\d+)\s*[問個題]/, group: 1},
    {regex: /(\d+)\s*問題/, group: 1},
    {regex: /(\d+)\s*つの問題/, group: 1},
    {regex: /(\d+)\s*個の問題/, group: 1},
    {regex: /問題を\s*(\d+)\s*[問個題]/, group: 1},
    {regex: /問題数は\s*(\d+)/, group: 1},
    {regex: /(\d+)\s*問で/, group: 1},
    {regex: /^(\d+)$/, group: 1}  // 単独の数字
  ];

  // 漢数字の変換マップ
  const kanjiNumbers: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '１': 1, '２': 2, '３': 3, '４': 4, '５': 5,
    '６': 6, '７': 7, '８': 8, '９': 9, '１０': 10
  };

  // アラビア数字パターンで検出
  for (const phrase of countPhrases) {
    const match = input.match(phrase.regex);
    if (match && match[phrase.group]) {
      const num = parseInt(match[phrase.group], 10);
      if (!isNaN(num) && num >= 1 && num <= 10) {
        return num;
      }
    }
  }
  
  // 漢数字パターンで検出
  for (const [kanji, value] of Object.entries(kanjiNumbers)) {
    const patterns = [
      new RegExp(`${kanji}\\s*[問個題]`),
      new RegExp(`${kanji}\\s*問題`),
      new RegExp(`${kanji}\\s*つの問題`),
      new RegExp(`${kanji}\\s*個の問題`),
      new RegExp(`問題を\\s*${kanji}\\s*[問個題]`),
      new RegExp(`問題数は\\s*${kanji}`)
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return value;
      }
    }
  }
  
  // 文字列全体が「一問」「五問」などの場合
  for (const [kanji, value] of Object.entries(kanjiNumbers)) {
    if (input.trim() === `${kanji}問` || input.trim() === kanji) {
      return value;
    }
  }
  
  return null;
}

// スロットフィリングエージェントの実行関数
export const runSlotFillingAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  try {
    console.log('スロットフィリングエージェントを実行中...');
    
    // ユーザー入力の前処理
    if (state.chat_history.length > 0) {
      const lastUserMessage = state.chat_history[state.chat_history.length - 1];
      if (lastUserMessage.role === 'user') {
        const userInput = lastUserMessage.content;
        
        // ユーザー入力をdetailsフィールドに追加
        let currentDetails = state.problem_spec.details || '';
        // 既存のdetailsが空でない場合は区切り文字を追加
        if (currentDetails && currentDetails.trim() !== '') {
          currentDetails += ' ';
        }
        // ユーザー入力を追加
        state = {
          ...state,
          problem_spec: {
            ...state.problem_spec,
            details: currentDetails + userInput.trim()
          }
        };
        console.log(`ユーザー入力「${userInput}」をdetailsに追加しました`);
        
        // 数値の抽出（問題数の判断）
        const extractedNumber = extractNumberFromInput(userInput);
        if (extractedNumber !== null && !state.problem_spec.count) {
          console.log(`ユーザー入力「${userInput}」から問題数「${extractedNumber}」を抽出しました`);
          state = {
            ...state,
            problem_spec: {
              ...state.problem_spec,
              count: extractedNumber
            }
          };
        }

        // 形式（format）の抽出
        if (!state.problem_spec.format) {
          // 形式の選択肢
          const formatOptions: Record<string, boolean> = {
            '計算問題': true,
            '記述式': true,
            '選択式': true
          };
          
          // 入力が選択肢のいずれかに一致するか確認
          const userInputTrimmed = userInput.trim();
          if (formatOptions[userInputTrimmed]) {
            console.log(`ユーザー入力「${userInput}」から形式「${userInputTrimmed}」を抽出しました`);
            state = {
              ...state,
              problem_spec: {
                ...state.problem_spec,
                format: userInputTrimmed
              }
            };
          }
          // 入力に「計算」「記述」「選択」の単語が含まれるか確認
          else if (userInput.includes('計算')) {
            state = {
              ...state,
              problem_spec: {
                ...state.problem_spec,
                format: '計算問題'
              }
            };
            console.log(`ユーザー入力「${userInput}」から形式「計算問題」を抽出しました`);
          }
          else if (userInput.includes('記述')) {
            state = {
              ...state,
              problem_spec: {
                ...state.problem_spec,
                format: '記述式'
              }
            };
            console.log(`ユーザー入力「${userInput}」から形式「記述式」を抽出しました`);
          }
          else if (userInput.includes('選択')) {
            state = {
              ...state,
              problem_spec: {
                ...state.problem_spec,
                format: '選択式'
              }
            };
            console.log(`ユーザー入力「${userInput}」から形式「選択式」を抽出しました`);
          }
        }
      }
    }
    
    const model = createSlotFillingAgent();
  
    // 入力の準備
    const input: SlotFillingInput = {
      chat_history: state.chat_history,
      problem_spec: state.problem_spec
    };
  
    console.log('スロットフィリング入力:', input);
    
    // プロンプトの準備（入力検証機能付き）
    const prompt = SLOT_FILLING_PROMPT_WITH_VALIDATION
      .replace('{chat_history}', JSON.stringify(input.chat_history, null, 2))
      .replace('{problem_spec}', JSON.stringify(input.problem_spec, null, 2));
    
    // API呼び出し
    const response = await model.invoke(prompt);
    
    // レスポンスをパース
    let output: SlotFillingOutputWithValidation;
    try {
      const content = response.content.toString();
      console.log('AI応答の生の内容:', content);
      
      // JSONの部分を抽出
      let jsonString = '';
      
      // コードブロック内のJSONを抽出する正規表現パターン - 改善版
      const jsonBlockMatch = content.match(/```(?:json)?[\s\n]*([\s\S]*?)[\s\n]*```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        // コードブロック内のコンテンツを取得（グループ1）
        jsonString = jsonBlockMatch[1].trim();
        console.log('コードブロックからJSONを抽出しました');
      } else {
        // 正しい形式のJSONオブジェクト全体を探す正規表現
        // 開始の { から 終了の } までを包括的に一致させる
        const fullJsonRegex = /(\{[\s\S]*\})/;
        const fullJsonMatch = content.match(fullJsonRegex);
        
        if (fullJsonMatch && fullJsonMatch[1]) {
          jsonString = fullJsonMatch[1].trim();
          console.log('完全なJSONオブジェクトを抽出しました');
        } else {
          // 不完全なJSONの場合はテキスト全体を使用
          jsonString = content.trim();
          console.log('完全なJSONオブジェクトが見つからないため、テキスト全体を使用します');
        }
      }
      
      console.log('パース前のJSONデータ:', jsonString);
      
      // JSON構文の整形 - 余分な文字を削除
      jsonString = jsonString.replace(/[\u200B-\u200D\uFEFF]/g, ''); // ゼロ幅文字の削除
      
      // JSONの検証と修復（不完全な場合）
      try {
        // まず直接パースを試みる
        output = JSON.parse(jsonString) as SlotFillingOutputWithValidation;
        console.log('JSONのパースに成功しました');
      } catch (parseJsonError) {
        console.error('JSON解析の最初の試みに失敗:', parseJsonError);
        
        // 不完全なJSONの可能性があるので修復を試みる
        try {
          // 基本構造が壊れている可能性がある場合、正規表現でプロパティを抽出
          const repairRegex = /\{\s*"problem_spec"\s*:\s*(\{[^}]*\}).*"chat_history"\s*:\s*(\[[^\]]*\])/s;
          const repairMatch = jsonString.match(repairRegex);
          
          if (repairMatch) {
            // 基本的な構造を再構築
            const repairedJson = `{
              "problem_spec": ${repairMatch[1]},
              "chat_history": ${repairMatch[2]},
              "is_complete": false,
              "missing_slots": ["difficulty", "topic"],
              "next_question": "もう少し詳しく教えてください。"
            }`;
            
            console.log('JSONを修復して再構築しました');
            output = JSON.parse(repairedJson) as SlotFillingOutputWithValidation;
          } else {
            // それでも失敗する場合は、最低限必要な情報で新しいJSONを作成
            console.log('最低限の情報で新しいJSONを作成します');
            
            // 会話履歴は保持
            const defaultOutput = {
              problem_spec: {
                difficulty: "",
                topic: state.chat_history.length > 0 ? "関数" : "", // 2次関数の場合は関数カテゴリとして認識
                format: "",
                count: state.problem_spec.count || "",
                details: ""
              },
              chat_history: state.chat_history,
              is_complete: false,
              missing_slots: ["difficulty", "topic"],
              next_question: "難易度（小学生、中学生、高校生）を教えてください。"
            };
            
            // 会話履歴の最後がユーザーの場合、アシスタントのメッセージを追加
            if (defaultOutput.chat_history.length > 0 && 
                defaultOutput.chat_history[defaultOutput.chat_history.length - 1].role === 'user') {
              defaultOutput.chat_history.push({
                role: 'assistant',
                content: '難易度（小学生、中学生、高校生）を教えてください。'
              });
            }
            
            output = defaultOutput as SlotFillingOutputWithValidation;
          }
        } catch (repairError) {
          console.error('JSON修復にも失敗しました:', repairError);
          throw new Error('JSONの修復に失敗しました');
        }
      }
      
      // スキーマ検証
      if (!output.problem_spec || !output.chat_history) {
        console.warn('出力に必要なフィールドがありません、デフォルト値を設定します');
        
        // 必須フィールドが欠けている場合は最低限の情報を設定
        output = {
          ...output,
          problem_spec: output.problem_spec || {
            difficulty: "",
            topic: "",
            format: "",
            count: state.problem_spec.count || "",
            details: ""
          },
          chat_history: output.chat_history || state.chat_history,
          is_complete: false,
          missing_slots: ["difficulty", "topic"],
          next_question: "数学問題の難易度と分野を教えてください。"
        };
      }
      
      console.log('JSON解析または修復成功:', output.problem_spec);
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
    
    // 状態の更新
  return {
    ...state,
      problem_spec: {
        difficulty: output.problem_spec.difficulty,
        topic: output.problem_spec.topic,
        format: output.problem_spec.format,
        count: output.problem_spec.count,
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