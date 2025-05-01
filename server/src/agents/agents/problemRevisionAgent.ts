import { ChatOpenAI } from '@langchain/openai';
import { MathProblemState } from '../types';

// 問題修正エージェントの実行関数
export const runProblemRevisionAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  try {
    console.log('問題修正エージェントが呼び出されました');
    
    // 初期の問題と検証結果を取得
    const problem = state.current_problem;
    const verification = state.verification_result;
    
    // 検証結果が有効な場合は何もしない
    if (verification.is_valid) {
      console.log('問題は既に有効です。修正の必要はありません。');
      return {
        ...state,
        status: 'problem_revised'
      };
    }
    
    // OpenAI APIを使用して問題を修正
    const model = new ChatOpenAI({
      modelName: 'gpt-4-0125-preview',
      temperature: 0.7
    });
    
    // プロンプトを構築
    const prompt = `
あなたは数学の問題を修正するAIアシスタントです。
検証結果に基づいて、問題と解答を修正してください。

## 現在の問題:
ID: ${problem.id}
問題文: ${problem.question}
解答: ${problem.answer}
解説: ${problem.explanation}

## 検証結果:
有効性: ${verification.is_valid}
フィードバック: ${verification.feedback}
改善点: ${verification.suggestions ? verification.suggestions.join(', ') : '特に指定なし'}

上記の検証結果に基づいて、問題を修正してください。
修正後の問題は、元の問題の意図を保ちながら、検証で指摘された問題点を解決するようにしてください。
必要に応じて、問題文、解答、解説のいずれも修正してください。

重要: 修正の際には以下の点に注意してください：
1. 数学的正確性を最優先してください
2. 問題の難易度を維持してください
3. 解説は十分に詳細で、教育的価値があるようにしてください
4. 元の問題の意図を尊重してください

出力は以下のJSON形式に厳密に従ってください：
{
  "id": "問題のID",
  "question": "修正後の問題文",
  "answer": "修正後の解答",
  "explanation": "修正後の解説"
}
`;
    
    // APIリクエスト
    const response = await model.invoke(prompt);
    console.log('APIからのレスポンス受信');
    
    // レスポンスをJSONとしてパース
    let revisedProblem;
    try {
      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      // JSONブロックを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      
      // Unicode エスケープシーケンスを置換
      jsonStr = jsonStr.replace(/\\u00b1/g, '±');
      
      // 問題となる可能性のあるエスケープシーケンスを処理
      jsonStr = jsonStr.replace(/\\\\/g, '\\');
      
      // JSONパースを試みる
      try {
        revisedProblem = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('標準JSONパースに失敗しました。汎用的なパース方法を試みます。');
        
        // 複雑なJSONの場合、Function コンストラクタを使用（最終手段）
        // セキュリティ上の懸念はありますが、OpenAIからの応答のみを扱うため、この場合は許容できます
        const safeEval = new Function('return ' + jsonStr);
        revisedProblem = safeEval();
      }
      
      // 修正前後の違いを明確にするためのログ出力
      console.log('問題修正の詳細:');
      console.log('---------- 修正前 ----------');
      console.log(`問題文: ${problem.question}`);
      console.log(`解答: ${problem.answer}`);
      console.log('---------- 修正後 ----------');
      console.log(`問題文: ${revisedProblem.question}`);
      console.log(`解答: ${revisedProblem.answer}`);
      console.log('----------------------------');
      
      // 必須フィールドが存在するか確認
      if (!revisedProblem.id || !revisedProblem.question || 
          !revisedProblem.answer || !revisedProblem.explanation) {
        throw new Error('必須フィールドが不足しています');
      }
    } catch (error) {
      console.error('JSONパースエラー:', error);
      throw new Error(`修正結果を解析できませんでした: ${error}`);
    }
    
    // 修正された問題を返す
    return {
      ...state,
      current_problem: {
        ...problem,
        ...revisedProblem
      },
      status: 'problem_revised'
    };
  } catch (error) {
    console.error('問題修正エージェントの実行中にエラーが発生しました:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      ...state,
      status: 'error',
      verification_result: {
        ...state.verification_result,
        feedback: `問題修正中にエラーが発生しました: ${errorMessage}`,
        suggestions: ['エラーが発生したため、修正を完了できませんでした。']
      }
    };
  }
};

// 検証-修正のフィードバックループを実行する関数
export const runRevisionFeedbackLoop = async (
  state: MathProblemState, 
  verificationFn: (state: MathProblemState) => Promise<MathProblemState>,
  maxIterations: number = 3
): Promise<MathProblemState> => {
  let currentState = { ...state };
  let iterations = 0;
  
  console.log(`フィードバックループを開始します（最大${maxIterations}回の反復）`);
  
  while (iterations < maxIterations) {
    iterations += 1;
    console.log(`\n=== 反復 ${iterations}/${maxIterations} ===`);
    
    // 現在の問題を検証
    console.log('問題を検証中...');
    const verifiedState = await verificationFn(currentState);
    
    // 検証に合格したら終了
    if (verifiedState.verification_result.is_valid) {
      console.log('検証に合格しました。ループを終了します。');
      return {
        ...verifiedState,
        status: 'verification_passed',
        revision_history: [
          ...(currentState.revision_history || []),
          {
            iteration: iterations,
            status: 'verification_passed',
            feedback: verifiedState.verification_result.feedback
          }
        ]
      };
    }
    
    console.log('検証に失敗しました。問題を修正します。');
    console.log('検証フィードバック:', verifiedState.verification_result.feedback);
    
    // 修正を実行
    const revisedState = await runProblemRevisionAgent(verifiedState);
    
    // 履歴を更新
    const revisionHistory = [
      ...(currentState.revision_history || []),
      {
        iteration: iterations,
        status: revisedState.status,
        changes: {
          from: currentState.current_problem,
          to: revisedState.current_problem
        },
        feedback: verifiedState.verification_result.feedback
      }
    ];
    
    // 状態を更新
    currentState = {
      ...revisedState,
      revision_history: revisionHistory
    };
    
    // エラー状態の場合はループを終了
    if (revisedState.status === 'error') {
      console.error('修正中にエラーが発生しました。ループを終了します。');
      return {
        ...currentState,
        status: 'revision_error'
      };
    }
    
    // 最後のイテレーションの場合
    if (iterations >= maxIterations) {
      console.log(`最大修正回数(${maxIterations}回)に達しました。最終版を出力します。`);
      return {
        ...currentState,
        status: 'max_revisions_reached',
        verification_result: {
          ...currentState.verification_result,
          feedback: `${currentState.verification_result.feedback}\n\n最大修正回数(${maxIterations}回)に達しました。最終版を出力します。`
        }
      };
    }
  }
  
  return currentState;
}; 