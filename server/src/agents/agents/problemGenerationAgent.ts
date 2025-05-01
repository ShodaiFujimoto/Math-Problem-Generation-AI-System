import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { MathProblemState, ProblemGenerationInputSchema, ProblemGenerationOutputSchema, VisualizationSchema } from '../types';
import { PROBLEM_GENERATION_PROMPT } from '../prompts';

// JSONの文字列内のJavaScript式を数値リテラルに置き換える
const replaceJavaScriptExpressionsWithLiterals = (jsonString: string): string => {
  // Math.PI/n の置き換え
  const piRegex = /Math\.PI\s*\/\s*(\d+)/g;
  jsonString = jsonString.replace(piRegex, (_match, denominator) => {
    const value = Math.PI / parseInt(denominator);
    return value.toString();
  });

  // Math.sqrt(n) の置き換え
  const sqrtRegex = /Math\.sqrt\s*\(\s*(\d+)\s*\)/g;
  jsonString = jsonString.replace(sqrtRegex, (_match, number) => {
    const value = Math.sqrt(parseInt(number));
    return value.toString();
  });

  // 他のMath関数の置き換え
  const mathFuncRegex = /Math\.\w+\s*\([^)]*\)/g;
  jsonString = jsonString.replace(mathFuncRegex, (match) => {
    try {
      // 安全のために限定的な評価を行う
      const value = eval(match);
      return typeof value === 'number' ? value.toString() : '"Invalid"';
    } catch (e) {
      console.error(`Math式の評価に失敗: ${match}`);
      return '"Invalid"';
    }
  });

  return jsonString;
};

// Markdownから抽出したJSON文字列をさらに処理
const extractJSONFromMarkdown = (text: string): string => {
  // コードブロックのパターン
  const regex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(regex);
  
  if (match && match[1]) {
    return replaceJavaScriptExpressionsWithLiterals(match[1].trim());
  }
  
  // コードブロックがない場合は、JSONパターンを探す
  const jsonRegex = /\{[\s\S]*\}/;
  const jsonMatch = text.match(jsonRegex);
  
  if (jsonMatch) {
    return replaceJavaScriptExpressionsWithLiterals(jsonMatch[0].trim());
  }
  
  return '';
};

// 構造を修正してスキーマに合わせる
const fixJsonStructure = (jsonData: any): any => {
  try {
    // JSONのディープコピーを作成
    const fixedJson = JSON.parse(JSON.stringify(jsonData));
    
    // 配列が返された場合（複数問題）は最初の問題を使用するか、結合する
    if (Array.isArray(fixedJson)) {
      console.log('配列形式の問題が検出されました。単一問題に変換します。');
      
      // 1問のみの場合は最初の問題を使用
      if (fixedJson.length === 1) {
        return fixedJson[0];
      }
      
      // 複数問の場合は問題を結合
      const mergedProblem: {
        id: string;
        question: string;
        answer: string;
        explanation: string;
        visualization?: any;
      } = {
        id: `prob-${Date.now()}`,
        question: '',
        answer: '',
        explanation: '',
      };
      
      // 各問題を処理し結合
      const questions: string[] = [];
      const answers: string[] = [];
      const explanations: string[] = [];
      
      fixedJson.forEach((problem: any, index: number) => {
        questions.push(`問${index + 1}. ${problem.question}`);
        answers.push(`問${index + 1}の解答: ${problem.answer}`);
        explanations.push(`問${index + 1}の解説:\n${problem.explanation}`);
      });
      
      mergedProblem.question = questions.join('\n\n');
      mergedProblem.answer = answers.join('\n');
      mergedProblem.explanation = explanations.join('\n\n');
      
      // 最初の問題にvisualizationがあれば使用
      const firstWithVisualization = fixedJson.find((p: any) => p.visualization);
      if (firstWithVisualization) {
        mergedProblem.visualization = firstWithVisualization.visualization;
      }
      
      return mergedProblem;
    }
    
    // visualization フィールドが省略されていても問題なし
    if (!fixedJson.visualization) {
      console.log('visualization フィールドがありません。このまま処理を続行します。');
    }
    
    return fixedJson;
  } catch (error) {
    console.error('JSON構造の修正中にエラーが発生しました:', error);
    return jsonData; // エラーが発生した場合は元のデータを返す
  }
};

// 問題生成エージェント
export const createProblemGenerationAgent = () => {
  const model = new ChatOpenAI({
    modelName: 'gpt-4-0125-preview',
    temperature: 0.7,
  });

  const outputParser = StructuredOutputParser.fromZodSchema(ProblemGenerationOutputSchema);

  return {
    invoke: async (input: z.infer<typeof ProblemGenerationInputSchema>) => {
      try {
        console.log('問題生成エージェントへの入力:', input);
        
        // detailsフィールドのログ出力
        if (input.details && input.details.trim() !== '') {
          console.log('詳細情報（details）を検出:', input.details);
        }
        
        // 正規表現置換を使い、プロンプト中の「x = 数字」のパターンを「x__eq__数字」に変換して
        // LangChainのテンプレート変数と誤認識されないようにする
        const safeDetails = (input.details || '').replace(/(x)\s*=\s*(\d+)/g, '$1__eq__$2');
        
        // 入力パラメータを明示的に設定
        const formattedPrompt = await PROBLEM_GENERATION_PROMPT.format({
          difficulty: input.difficulty,
          topic: input.topic,
          format: input.format || '記述式',
          count: input.count || 1,
          details: safeDetails || ''
        });
        
        // 長文ログを回避するため、コメントアウト
        // console.log('フォーマットされたプロンプト:', formattedPrompt);
        console.log('プロンプトを作成しました（長さ: ' + formattedPrompt.length + '文字）');
        
        // モデルを呼び出し
        const response = await model.invoke(formattedPrompt);
        
        // レスポンス内容の取得
        const responseContent = response.content.toString();
        console.log('モデルからの応答を受信しました（長さ: ' + responseContent.length + '文字）');
        
        // Markdownコードブロックからコンテンツを抽出
        const extractedJson = extractJSONFromMarkdown(responseContent);
        console.log('JSONデータを抽出しました（長さ: ' + extractedJson.length + '文字）');
        
        try {
          // JSON文字列をパース
          const parsedJSON = JSON.parse(extractedJson);
          
          // answer と explanation フィールドの型をチェックして必要に応じて変換
          if (parsedJSON.answer && typeof parsedJSON.answer === 'object') {
            parsedJSON.answer = JSON.stringify(parsedJSON.answer);
          }
          
          if (parsedJSON.explanation && typeof parsedJSON.explanation === 'object') {
            parsedJSON.explanation = JSON.stringify(parsedJSON.explanation);
          }
          
          // 構造化パーサーを使ってパース
          return await outputParser.parse(JSON.stringify(parsedJSON));
        } catch (error) {
          console.error('JSONの解析に失敗しました:', error);
          
          // JSONパターンを検出して処理するフォールバック
          console.log('JSONパターンを検出して処理:', extractedJson.substring(0, 100) + '...');
          
          try {
            // 正規表現でJSONパターンを検出して厳密なパースを試みる
            const jsonPattern = /{[\s\S]*}/;
            const match = extractedJson.match(jsonPattern);
            
            if (match) {
              const strictJson = match[0];
              const parsedJSON = JSON.parse(strictJson);
              
              // answer と explanation フィールドの型をチェックして変換
              if (parsedJSON.answer && typeof parsedJSON.answer === 'object') {
                parsedJSON.answer = JSON.stringify(parsedJSON.answer);
              }
              
              if (parsedJSON.explanation && typeof parsedJSON.explanation === 'object') {
                parsedJSON.explanation = JSON.stringify(parsedJSON.explanation);
              }
              
              return await outputParser.parse(JSON.stringify(parsedJSON));
            }
          } catch (fallbackError) {
            console.error('フォールバック解析に失敗しました:', fallbackError);
          }
          
          throw new Error(`問題生成シーケンスでエラーが発生しました: ${error}`);
        }
      } catch (error) {
        console.error('問題生成シーケンスでエラーが発生しました:', error);
        throw error;
      }
    }
  };
};

// 数学的な妥当性チェック関数
const validateMathProblem = (problem: z.infer<typeof ProblemGenerationOutputSchema>): boolean => {
  try {
    // 基本的な検証
    if (!problem.id || !problem.question || !problem.answer || !problem.explanation) {
      console.error('問題の必須フィールドが欠けています');
      return false;
    }
    
    // visualization フィールドは省略可能
    
    // 問題文の長さをチェック
    if (problem.question.length < 10) {
      console.error('問題文が短すぎます');
      return false;
    }
    
    // 解答の長さをチェック
    if (problem.answer.length < 1) {
      console.error('解答が空です');
      return false;
    }
    
    // 解説の長さをチェック
    if (problem.explanation.length < 20) {
      console.error('解説が短すぎます');
      return false;
    }
    
    // すべての検証に合格
    return true;
  } catch (error) {
    console.error('問題の検証中にエラーが発生しました:', error);
    return false;
  }
};

// 問題生成エージェントの実行関数
export const runProblemGenerationAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  console.log('問題生成エージェントを実行中...');
  try {
    const agent = createProblemGenerationAgent();
    
    // 問題数を記録
    const requestedCount = state.problem_spec.count || 1;
    console.log(`要求された問題数: ${requestedCount}`);
    
    // 入力データの作成（問題数をそのまま設定）
    const input = {
      ...state.problem_spec,
      count: requestedCount
    };
    
    console.log('問題生成入力:', input);
    
    if (requestedCount > 1) {
      console.log('複数問題のリクエストが検出されました。問題を一つの問題セットに結合します。');
    }
    
    // APIを呼び出して問題を生成
    const output = await agent.invoke(input);
    console.log('生成された問題:', output);
    
    // 数学的な妥当性チェック
    const isValid = validateMathProblem(output);
    if (!isValid) {
      console.warn('生成された問題に問題があります。再生成を推奨します。');
      // エラーにはせず、警告だけ出して続行
    }
    
    // 問題IDが生成されていない場合はランダムなIDを設定
    if (!output.id) {
      output.id = `prob-${Math.floor(Math.random() * 900) + 100}`;
    }
    
    // 複数問題が要求され、かつ問題文に問題番号が含まれていない場合、問題文の先頭に問題数を明記
    if (requestedCount > 1 && !output.question.includes('問1') && !output.question.includes('問１')) {
      output.question = `以下の${requestedCount}問の問題に答えなさい。\n\n${output.question}`;
    }
    
    // answerとexplanationが文字列でない場合、文字列に変換
    const processedOutput = {
      ...output,
      answer: typeof output.answer === 'object' ? JSON.stringify(output.answer) : output.answer,
      explanation: typeof output.explanation === 'object' ? JSON.stringify(output.explanation) : output.explanation
    };
    
    // 状態を更新して返す
    return {
      ...state,
      current_problem: processedOutput,
      status: 'problem_generated'
    };
  } catch (error) {
    console.error('問題生成中にエラーが発生しました:', error);
    
    // エラーが発生した場合はダミーの問題を返す
    return {
      ...state,
      current_problem: {
        id: 'error-001',
        question: '問題の生成中にエラーが発生しました。再試行してください。',
        answer: 'エラーのため解答はありません。',
        explanation: 'エラーのため解説はありません。',
      },
      status: 'problem_generation_error'
    };
  }
};

function transformVisualization(visualization: any): any {
  if (!visualization) return undefined;

  // 関数グラフの変換
  if (visualization.type === 'function_graph') {
    // 関数リストが存在し、配列であることを確認
    if (visualization.functions && Array.isArray(visualization.functions)) {
      // 各関数の形式を標準化
      visualization.functions = visualization.functions.map((func: any) => {
        // 文字列形式の場合はオブジェクトに変換
        if (typeof func === 'string') {
          return {
            expression: func,
            domain: [-10, 10],
            style: 'blue',
            label: func
          };
        }
        
        // 必須フィールドの確認と設定
        return {
          expression: func.expression || func.formula || func.function || 'x',
          domain: func.domain || func.range || [-10, 10],
          style: func.style || func.color || 'blue',
          label: func.label || func.name || func.expression || 'f(x)'
        };
      });
    }
    
    // 座標軸の設定
    if (!visualization.axes) {
      visualization.axes = {
        xrange: [-10, 10],
        yrange: [-10, 10]
      };
    } else {
      if (!visualization.axes.xrange) visualization.axes.xrange = [-10, 10];
      if (!visualization.axes.yrange) visualization.axes.yrange = [-10, 10];
    }
    
    // 塗りつぶし領域の修正
    if (visualization.fill_area && typeof visualization.fill_area === 'object') {
      if (typeof visualization.fill_area.between === 'string') {
        visualization.fill_area.between = [visualization.fill_area.between, 'x'];
      }
      
      if (!visualization.fill_area.domain) {
        // 関数の定義域から推測
        const firstFunc = visualization.functions[0];
        visualization.fill_area.domain = firstFunc ? firstFunc.domain : [-10, 10];
      }
    }
  }
  
  // 幾何図形の変換
  if (visualization.type === 'geometric') {
    const elements = visualization.elements.map((element: any) => {
      // ポリゴン（多角形）の変換
      if (element.type === 'triangle' || element.type === 'rectangle' || element.type === 'quadrilateral') {
        // 三角形、長方形などは全てpolygonに統一
        element.type = 'polygon';
      }
      
      // 座標点の変換 - オブジェクト形式から配列形式へ
      if (element.points && Array.isArray(element.points)) {
        element.points = element.points.map((point: any) => {
          if (typeof point === 'object' && 'x' in point && 'y' in point) {
            return [point.x, point.y]; // {x, y} → [x, y]
          }
          return point; // すでに配列形式の場合はそのまま
        });
      }
      
      // スタイルの変換 - オブジェクト形式から文字列形式へ
      if (element.style && typeof element.style === 'object') {
        const styleObj = element.style;
        let styleStr = '';
        
        if (styleObj.fill) {
          const color = styleObj.fill === '#f0f0f0' ? 'blue!20' : styleObj.fill;
          styleStr += `fill=${color}`;
        }
        
        if (styleObj.stroke) {
          if (styleStr) styleStr += ',';
          styleStr += `draw=${styleObj.stroke === '#000' ? 'black' : styleObj.stroke}`;
        }
        
        if (styleObj.thickness) {
          if (styleStr) styleStr += ',';
          styleStr += `line width=${styleObj.thickness}pt`;
        }
        
        element.style = styleStr || 'draw=black';
      } else if (element.style === 'solid') {
        // 'solid'を具体的なスタイルに変換
        element.style = 'draw=black';
      }
      
      return element;
    });
    
    // ラベルの変換
    if (visualization.labels && Array.isArray(visualization.labels)) {
      visualization.labels = visualization.labels.map((label: any) => {
        if (label.position && typeof label.position === 'object' && 'x' in label.position && 'y' in label.position) {
          return {
            ...label,
            position: [label.position.x, label.position.y]
          };
        }
        return label;
      });
    }
    
    // 寸法の変換
    if (visualization.dimensions && Array.isArray(visualization.dimensions)) {
      visualization.dimensions = visualization.dimensions.map((dim: any) => {
        const result: any = {};
        
        if (dim.from && typeof dim.from === 'object' && 'x' in dim.from && 'y' in dim.from) {
          result.from = [dim.from.x, dim.from.y];
        } else {
          result.from = dim.from;
        }
        
        if (dim.to && typeof dim.to === 'object' && 'x' in dim.to && 'y' in dim.to) {
          result.to = [dim.to.x, dim.to.y];
        } else {
          result.to = dim.to;
        }
        
        // 'dimension'属性を'text'属性に変換
        if (dim.dimension) {
          result.text = dim.dimension;
        } else if (dim.label) {
          result.text = dim.label;
        } else {
          // デフォルト値を設定
          const fromX = Array.isArray(result.from) ? result.from[0] : 0;
          const fromY = Array.isArray(result.from) ? result.from[1] : 0;
          const toX = Array.isArray(result.to) ? result.to[0] : 0;
          const toY = Array.isArray(result.to) ? result.to[1] : 0;
          
          // 距離を概算して寸法テキストを生成
          const dx = toX - fromX;
          const dy = toY - fromY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          result.text = `${Math.round(distance)}cm`;
        }
        
        return result;
      });
    }
    
    return {
      ...visualization,
      elements
    };
  }

  return visualization;
} 