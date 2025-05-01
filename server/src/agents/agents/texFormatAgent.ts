import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import * as fs from "fs";
import * as path from "path";
import { 
  TeXFormatInputSchema, 
  TeXFormatOutputSchema, 
  MathProblemState,
  Visualization,
  FunctionGraph,
  Geometric
} from "../types";
import { generateFunctionGraph, generateQuadraticFunctionGraph, generateFunctionIntersectionGraph } from "../../tex/tikz-helpers/functionGraphs";
import { generateGeometricShape, generateCircle, generateTriangle, generateRectangle, generateQuadrilateral } from "../../tex/tikz-helpers/geometricShapes";

// LaTeX templates
const PROBLEM_TEMPLATE_PATH = path.join(__dirname, "../../tex/templates/problem.tex");
const MULTIPLE_CHOICE_TEMPLATE_PATH = path.join(__dirname, "../../tex/templates/multiple_choice.tex");

/**
 * 図形中間表現からTikZコードを生成する関数
 * @param visualization 図形中間表現
 * @returns TikZコード
 */
export function generateTikZFromVisualization(visualization?: Visualization): string {
  if (!visualization) {
    return "";
  }

  try {
    if (visualization.type === "function_graph") {
      return generateTikZForFunctionGraph(visualization);
    } else if (visualization.type === "geometric") {
      return generateTikZForGeometric(visualization);
    }
  } catch (error) {
    console.error("TikZコード生成中にエラーが発生しました:", error);
    return "% Error: TikZコード生成に失敗しました";
  }

  return "";
}

/**
 * 関数グラフの中間表現からTikZコードを生成
 * @param visualization 関数グラフの中間表現
 * @returns TikZコード
 */
function generateTikZForFunctionGraph(visualization: FunctionGraph): string {
  try {
    const { functions, axes, highlight_points, fill_area } = visualization;

    // 関数が一つで二次関数の場合は専用関数を使用
    if (functions.length === 1 && functions[0].expression.match(/x\^2/)) {
      // 二次関数の式から係数を抽出する（例: x^2-4x+3 => a=1, b=-4, c=3）
      const expr = functions[0].expression;
      const aMatch = expr.match(/(-?\d*)x\^2/);
      const bMatch = expr.match(/([+-]\d*)x(?!\^)/);
      const cMatch = expr.match(/([+-]\d+)$/);
      
      const a = aMatch ? (aMatch[1] === "-" ? -1 : aMatch[1] === "" ? 1 : Number(aMatch[1])) : 0;
      const b = bMatch ? Number(bMatch[1]) : 0;
      const c = cMatch ? Number(cMatch[1]) : 0;
      
      // 二次関数グラフ生成関数を呼び出す
      return generateQuadraticFunctionGraph(a, b, c, {
        xmin: axes?.xrange[0] || -5,
        xmax: axes?.xrange[1] || 5,
        ymin: axes?.yrange[0] || -5,
        ymax: axes?.yrange[1] || 5
      });
    }

    // 関数が二つで交点や領域が強調されている場合は交点グラフ生成
    if (functions.length === 2 && (highlight_points?.length || fill_area)) {
      // 交点の計算（highlight_pointsを使用）
      const intersections = highlight_points?.map(point => [point[0], point[1]] as [number, number]) || [];
      
      return generateFunctionIntersectionGraph(
        functions[0].expression,
        functions[1].expression,
        intersections,
        {
          xmin: axes?.xrange[0] || -5,
          xmax: axes?.xrange[1] || 5,
          ymin: axes?.yrange[0] || -5,
          ymax: axes?.yrange[1] || 5
        }
      );
    }

    // 一般的な関数グラフの生成
    const functionConfigs = functions.map(f => ({
      expression: f.expression,
      domain: f.domain as [number, number] || [-5, 5],
      style: f.style || "blue",
      label: f.label || ""
    }));
    
    // ハイライトポイントの変換
    const highlightPoints = highlight_points?.map(point => ({
      coordinates: [point[0], point[1]] as [number, number],
      style: "mark=*, mark size=2pt, color=red",
      label: undefined
    }));
    
    // 塗りつぶし領域があれば設定
    let fillAreas;
    if (fill_area) {
      // style プロパティは FillAreaConfig インターフェースに含まれていることを確認
      const fillAreaStyle = 'opacity=0.3, fill=blue!20'; // デフォルトスタイル
      
      fillAreas = [{
        between: fill_area.between as [string, string],
        domain: fill_area.domain as [number, number],
        style: fillAreaStyle
      }];
    }
    
    // グラフオプションの設定
    const options = {
      xmin: axes?.xrange[0] || -5,
      xmax: axes?.xrange[1] || 5,
      ymin: axes?.yrange[0] || -5,
      ymax: axes?.yrange[1] || 5
    };
    
    return generateFunctionGraph(
      functionConfigs,
      highlightPoints,
      fillAreas,
      options
    );
  } catch (error) {
    console.error("関数グラフTikZコード生成中にエラーが発生しました:", error);
    return "% Error: 関数グラフTikZコード生成に失敗しました";
  }
}

/**
 * 幾何図形の中間表現からTikZコードを生成
 * @param visualization 幾何図形の中間表現
 * @returns TikZコード
 */
function generateTikZForGeometric(visualization: Geometric): string {
  try {
    // 特殊な図形の判定と専用関数の使用
    const elements = visualization.elements || [];
    
    // 円のみの場合
    if (elements.length === 1 && elements[0].type === "circle") {
      const circle = elements[0];
      return generateCircle(
        circle.center as [number, number],
        circle.radius as number,
        { style: circle.style || "thick" }
      );
    }
    
    // 三角形のみの場合
    if (elements.length === 1 && 
        elements[0].type === "polygon" && 
        elements[0].points && elements[0].points.length === 3) {
      const triangle = elements[0];
      return generateTriangle(
        triangle.points as [[number, number], [number, number], [number, number]],
        { style: triangle.style || "thick" }
      );
    }
    
    // 四角形のみの場合
    if (elements.length === 1 && 
        elements[0].type === "polygon" && 
        elements[0].points && elements[0].points.length === 4) {
      const rectangle = elements[0];
      
      // 長方形の特殊なケース（辺が座標軸に平行）
      if (isRectangle(rectangle.points as [number, number][])) {
        const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = rectangle.points as [[number, number], [number, number], [number, number], [number, number]];
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y3 - y2);
        return generateRectangle(
          width,
          height,
          [Math.min(x1, x2), Math.min(y1, y3)],
          { style: rectangle.style || "thick" }
        );
      }
      
      // 一般的な四角形
      return generateQuadrilateral(
        rectangle.points as [[number, number], [number, number], [number, number], [number, number]],
        { style: rectangle.style || "thick" }
      );
    }
    
    // 図形要素、ラベル、寸法線を変換
    const shapeElements = elements.map(el => ({
      type: el.type,
      style: el.style,
      points: el.points?.map(p => p as [number, number]),
      center: el.center as [number, number] | undefined,
      radius: el.radius,
      startAngle: el.start ? 0 : undefined,  // 暫定対応
      endAngle: el.end ? 90 : undefined,     // 暫定対応
    }));
    
    const labels = visualization.labels?.map(label => ({
      position: label.position as [number, number],
      text: label.text,
      anchor: 'center'
    })) || [];
    
    const dimensions = visualization.dimensions?.map(dim => ({
      from: dim.from as [number, number],
      to: dim.to as [number, number],
      text: dim.text,
      offset: 0.2
    })) || [];
    
    // 表示範囲の計算（全ての点を考慮）
    const allPoints = [];
    
    // 要素から点を収集
    for (const el of elements) {
      if (el.points) allPoints.push(...el.points);
      if (el.center) allPoints.push(el.center);
      if (el.start) allPoints.push(el.start);
      if (el.end) allPoints.push(el.end);
    }
    
    // ラベルと寸法線から点を収集
    if (visualization.labels) {
      visualization.labels.forEach(label => label.position && allPoints.push(label.position));
    }
    
    if (visualization.dimensions) {
      visualization.dimensions.forEach(dim => {
        dim.from && allPoints.push(dim.from);
        dim.to && allPoints.push(dim.to);
      });
    }
    
    // 表示範囲の設定
    let options = {};
    if (allPoints.length > 0) {
      const xValues = allPoints.map(p => p[0]);
      const yValues = allPoints.map(p => p[1]);
      options = {
        xmin: Math.min(...xValues) - 1,
        xmax: Math.max(...xValues) + 1,
        ymin: Math.min(...yValues) - 1,
        ymax: Math.max(...yValues) + 1
      };
    }
    
    return generateGeometricShape(
      shapeElements,
      labels,
      dimensions,
      options
    );
  } catch (error) {
    console.error("幾何図形TikZコード生成中にエラーが発生しました:", error);
    return "% Error: 幾何図形TikZコード生成に失敗しました";
  }
}

/**
 * 点列が長方形を形成しているかチェック
 */
function isRectangle(points: [number, number][]): boolean {
  if (points.length !== 4) return false;
  
  const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = points;
  
  // 座標軸に平行な長方形かどうかをチェック
  return (
    (Math.abs(x1 - x2) < 0.001 && Math.abs(x3 - x4) < 0.001 && Math.abs(y1 - y4) < 0.001 && Math.abs(y2 - y3) < 0.001) ||
    (Math.abs(y1 - y2) < 0.001 && Math.abs(y3 - y4) < 0.001 && Math.abs(x1 - x4) < 0.001 && Math.abs(x2 - x3) < 0.001)
  );
}

/**
 * Create a TeX formatting agent
 */
export function createTexFormatAgent() {
  // Initialize model
  const model = new ChatOpenAI({
    modelName: "gpt-4-0125-preview",
    temperature: 0.3, // Lower temperature for more consistent and accurate LaTeX formatting
  });

  // Create runnable sequence
  const texFormattingChain = RunnableSequence.from([
    {
      problem: (input) => input.problem
    },
    async (input) => {
      // 直接シーケンシャル処理で実装
      return await formatTexWithSequentialChain({ problem: input.problem });
    }
  ]);

  return texFormattingChain;
}

/**
 * LLMを使用して数式をTeX形式に変換する
 * @param model ChatOpenAI インスタンス
 * @param text 変換するテキスト
 * @param isExplanation 説明かどうか（詳細な変換が必要）
 * @returns TeX形式に変換されたテキスト
 */
async function convertToTexWithLLM(
  text: string, 
  isExplanation: boolean = false,
  section: string = ""
): Promise<string> {
  if (!text) return "";
  
  // LLMインスタンス作成
  const model = new ChatOpenAI({
    modelName: "gpt-4-0125-preview",
    temperature: 0.2, // 低めの温度で一貫した出力を確保
  });
  
  try {
    // セクション名の設定
    const sectionText = section ? `現在処理しているのは「${section}」セクションです。他のセクション（特に解答や解説）の内容を問題文に含めないでください。` : "";
    
    // プロンプトの作成
    const promptText = isExplanation 
      ? `あなたは数学のLaTeXフォーマットの専門家です。以下の数学的な説明文を正確なLaTeX形式に変換してください。
数式は適切に$...$や$$...$$で囲み、フラクション、指数、ルート、ギリシャ文字などを正しいLaTeXコマンドに変換してください。
段落構造や箇条書きは保持し、説明の流れがわかりやすくなるようにしてください。

重要な制約:
- \\documentclass, \\usepackage, \\begin{document}, \\end{document}などのドキュメント宣言タグは含めないでください
- 完全なドキュメントではなく、文書の一部（セクション）のみを変換します
- 内部の\\section, \\subsectionなどの見出しコマンドも使用しないでください
- TeXファイルを作成するのではなく、既存のTeXファイルに挿入するためのコンテンツを生成してください
${sectionText}

入力文:
${text}

LaTeX形式:` 
      : `以下の数学の問題または解答を正確なLaTeX形式に変換してください。数式は$...$で囲み、必要に応じて\\frac{}{}, \\sqrt{}, ^{}, _{} などの適切なLaTeXコマンドを使用してください。

重要な制約:
- \\documentclass, \\usepackage, \\begin{document}, \\end{document}などのドキュメント宣言タグは含めないでください
- 完全なドキュメントではなく、文書の一部（セクション）のみを変換します
- 内部の\\section, \\subsectionなどの見出しコマンドも使用しないでください
- TeXファイルを作成するのではなく、既存のTeXファイルに挿入するためのコンテンツを生成してください
${sectionText}

入力文:
${text}

LaTeX形式:`;
    
    // LLMの呼び出し
    const response = await model.invoke(promptText);
    
    // 結果の取得とクリーンアップ
    let result = response.content.toString();
    
    // 余分なバッククォートやプロンプトのエコーを削除
    result = result.replace(/^```(la)?tex\s*/i, "").replace(/```$/i, "");
    result = result.replace(/^LaTeX形式[:：]\s*/i, "");
    
    // TeX文書宣言タグを削除
    result = result.replace(/\\documentclass(\[.*?\])?\{.*?\}/g, "");
    result = result.replace(/\\usepackage(\[.*?\])?\{.*?\}/g, "");
    result = result.replace(/\\begin\{document\}/g, "");
    result = result.replace(/\\end\{document\}/g, "");
    result = result.replace(/\\section\*?\{.*?\}/g, "");
    result = result.replace(/\\subsection\*?\{.*?\}/g, "");
    
    // 「解答」「答え」などのセクションが問題文に含まれている場合に削除
    if (section === "問題文") {
      const answerPatterns = [
        /解答[:：]?.*$/ms,
        /答え[:：]?.*$/ms,
        /解説[:：]?.*$/ms,
        /答[:：]?.*$/ms
      ];
      
      for (const pattern of answerPatterns) {
        const match = result.match(pattern);
        if (match && match.index !== undefined) {
          result = result.substring(0, match.index).trim();
        }
      }
    }
    
    return result.trim();
  } catch (error) {
    console.error("LLMによるTeX変換エラー:", error);
    // エラー時は元のテキストを返す
    return text;
  }
}

/**
 * LLMを使用して問題文から図形や関数を認識し、TikZコードを生成する
 * @param problem 問題データ（問題文、解答、解説）
 * @returns TikZコード
 */
export async function generateTikZFromProblemWithLLM(problem: {
  question: string;
  answer: string;
  explanation: string;
}): Promise<string> {
  // 図形や関数が含まれていない場合は空文字を返す
  if (!containsMathVisualElements(problem)) {
    return "";
  }

  try {
    // 問題文から解答や解説が混入しないようにクリーニング
    let cleanedQuestion = problem.question;
    // 「解答」「答え」「解説」などで始まる行とそれ以降を削除
    const answerPatterns = [
      /解答[:：]?.*/gs,
      /答え[:：]?.*/gs,
      /解説[:：]?.*/gs,
      /答[:：]?.*/gs,
      /問題\s*\d+.*?の(解答|答え|解|答)/gs
    ];
    
    for (const pattern of answerPatterns) {
      const match = cleanedQuestion.match(pattern);
      if (match && match.index !== undefined) {
        cleanedQuestion = cleanedQuestion.substring(0, match.index).trim();
      }
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4-0125-preview",
      temperature: 0.2,
    });

    const prompt = `あなたは数学問題から図形や関数を描画するためのTikZコードを生成するエキスパートです。
以下の問題文、解答、解説を元に、適切なTikZコードを生成してください。

問題文: ${cleanedQuestion}
解答: ${problem.answer}
解説: ${problem.explanation}

重要: 図形生成は主に問題文に基づいて行ってください。解答や解説の内容は補助情報として参照するだけにしてください。

次のいずれかの状況で、TikZコードを生成してください：
1. 関数のグラフが必要と思われる場合（例：二次関数、三角関数、対数関数など）
2. 幾何図形が必要と思われる場合（例：三角形、四角形、円など）
3. 座標平面上の点、線分、ベクトルなどが必要と思われる場合
4. 統計データのグラフが必要と思われる場合

重要な制約:
- \\documentclass, \\usepackage, \\begin{document}, \\end{document}などのドキュメント宣言タグは絶対に含めないでください
- TikZパッケージの読み込み(\\usepackage{tikz}など)も含めないでください
- \\begin{tikzpicture}から\\end{tikzpicture}までのコードのみを生成してください
- TikZコードはTeXファイルの一部として挿入されるため、独立したファイルにしないでください

TikZコードを生成する際の注意点：
- 問題の内容に忠実な図を生成すること
- 座標やサイズは適切で見やすいものにすること
- 必要に応じてラベルを追加すること
- 美しく効率的なコードを生成すること

出力形式（これ以外は出力しないでください）：
\\begin{tikzpicture}[scale=1]
  % TikZコードの内容
\\end{tikzpicture}

図形や関数が必要ない場合は、空文字を返してください。`;

    const response = await model.invoke(prompt);
    const content = response.content.toString();

    // TeX文書宣言タグを削除
    let cleanedContent = content
      .replace(/\\documentclass(\[.*?\])?\{.*?\}/g, "")
      .replace(/\\usepackage(\[.*?\])?\{.*?\}/g, "")
      .replace(/\\begin\{document\}/g, "")
      .replace(/\\end\{document\}/g, "")
      .replace(/\\section\*?\{.*?\}/g, "")
      .replace(/\\subsection\*?\{.*?\}/g, "");

    // TikZコードを抽出
    const tikzMatch = cleanedContent.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
    if (tikzMatch) {
      console.log("LLMによりTikZコードを生成しました");
      return tikzMatch[0];
    } else {
      console.log("LLMからTikZコードが生成されませんでした");
      return "";
    }
  } catch (error) {
    console.error("LLMによるTikZコード生成中にエラーが発生しました:", error);
    return "";
  }
}

/**
 * 問題が図形や関数などの視覚的要素を含んでいるかチェック
 */
function containsMathVisualElements(problem: {
  question: string;
  answer: string;
  explanation: string;
}): boolean {
  const fullText = `${problem.question} ${problem.answer} ${problem.explanation}`;
  
  // 図形や関数を示唆するキーワード
  const visualKeywords = [
    '関数', 'グラフ', '図形', '三角形', '四角形', '円', '直線',
    '放物線', '双曲線', '楕円', '座標', '点', '線分', 'ベクトル',
    '最大値', '最小値', '接線', '法線', '面積', '体積',
    'sin', 'cos', 'tan', 'log', '√', '二次関数', '一次関数'
  ];
  
  return visualKeywords.some(keyword => fullText.includes(keyword));
}

/**
 * TeX整形エージェント（シーケンシャルチェーン版）
 * @param input 問題データ
 * @returns TeXコード
 */
export async function formatTexWithSequentialChain(input: {
  problem: {
    id: string;
    question: string;
    answer: string;
    explanation: string;
    visualization?: Visualization;
  }
}) {
  try {
    console.log("TeX整形を開始します");
    
    // 問題データを取得
    const { id, question, answer, explanation, visualization } = input.problem;
    
    // JSON文字列として格納されている可能性があるanswerとexplanationを処理
    let processedAnswer = answer;
    let processedExplanation = explanation;
    
    // answerフィールドがJSON文字列の場合はパースして処理
    if (typeof answer === 'string' && answer.startsWith('{') && answer.endsWith('}')) {
      try {
        const parsedAnswer = JSON.parse(answer);
        if (typeof parsedAnswer === 'object') {
          // オブジェクトを読みやすい形式に変換
          processedAnswer = formatObjectToText(parsedAnswer);
        }
      } catch (e) {
        // パースに失敗した場合は元の文字列を使用
        console.warn('answerのJSONパースに失敗しました:', e);
      }
    }
    
    // explanationフィールドがJSON文字列の場合はパースして処理
    if (typeof explanation === 'string' && explanation.startsWith('{') && explanation.endsWith('}')) {
      try {
        const parsedExplanation = JSON.parse(explanation);
        if (typeof parsedExplanation === 'object') {
          // オブジェクトを読みやすい形式に変換
          processedExplanation = formatObjectToText(parsedExplanation);
        }
      } catch (e) {
        // パースに失敗した場合は元の文字列を使用
        console.warn('explanationのJSONパースに失敗しました:', e);
      }
    }
    
    // 問題文から解答や解説の部分を取り除く
    let cleanQuestion = question;
    // 「解答」「答え」「解説」などで始まる行とそれ以降を削除
    const answerPatterns = [
      /解答[:：]?.*/gs,
      /答え[:：]?.*/gs,
      /解説[:：]?.*/gs,
      /答[:：]?.*/gs
    ];
    
    for (const pattern of answerPatterns) {
      const match = cleanQuestion.match(pattern);
      if (match && match.index !== undefined) {
        cleanQuestion = cleanQuestion.substring(0, match.index).trim();
      }
    }
    
    // テンプレートの読み込み
    const templateContent = fs.readFileSync(PROBLEM_TEMPLATE_PATH, "utf-8");
    
    // 問題文、解答、解説をTeXに変換
    // 各セクションごとに専用プロンプトを使用
    const formattedQuestion = await convertToTexWithLLM(cleanQuestion, false, "問題文");
    const formattedAnswer = await convertToTexWithLLM(processedAnswer, false, "解答");
    const formattedExplanation = await convertToTexWithLLM(processedExplanation, true, "解説");
    
    // 図形コードの生成
    let figureCode = "";
    
    if (visualization) {
      // 既存の方法: visualization中間表現があれば使用
      figureCode = generateTikZFromVisualization(visualization);
    } else {
      // 新しい方法: LLMを使用して問題文から図形を生成
      figureCode = await generateTikZFromProblemWithLLM({
        question: cleanQuestion,
        answer: processedAnswer,
        explanation: processedExplanation
      });
    }
    
    // 最終的なTeXコンテンツの生成
    let texContent = templateContent
      .replace("{{PROBLEM_TEXT}}", formattedQuestion)
      .replace("{{ANSWER_TEXT}}", formattedAnswer)
      .replace("{{EXPLANATION_TEXT}}", formattedExplanation)
      .replace("{{FIGURE_CODE}}", figureCode);
    
    console.log("TeX整形が完了しました");
    return { tex_content: texContent };
  } catch (error) {
    console.error(`TeX整形エラー: ${error}`);
    return {
      tex_content: `% Error occurred during TeX formatting: ${error}\n\\documentclass{article}\n\\begin{document}\nTeX formatting error\n\\end{document}`
    };
  }
}

/**
 * Run the TeX formatting agent
 */
export async function runTexFormatAgent(state: MathProblemState): Promise<MathProblemState> {
  try {
    console.log("TeX整形エージェントを実行します");
    
    // 問題データを準備
    const input = {
      problem: {
        id: state.current_problem.id,
        question: state.current_problem.question,
        answer: state.current_problem.answer,
        explanation: state.current_problem.explanation,
        visualization: state.current_problem.visualization
      }
    };
    
    console.log("問題データ:", JSON.stringify(input.problem.id, null, 2));
    
    // シーケンシャルチェーンでTeX整形を実行
    const result = await formatTexWithSequentialChain(input);
    console.log("TeX整形結果を取得しました");
    
    // 状態を更新
    return {
      ...state,
      tex_content: result.tex_content,
      status: "tex_formatted"
    };
  } catch (error) {
    console.error(`TeX整形エージェント実行エラー: ${error}`);
    return {
      ...state,
      status: "error",
      tex_content: `% Error occurred in TeX formatting agent: ${error}`
    };
  }
}

/**
 * 数式表現をTeXに変換する関数
 * （後方互換性のために残しておく - 今後は convertToTexWithLLM を使用）
 * @param text 変換する元のテキスト
 * @returns TeX形式のテキスト
 */
export function texifyMathExpressions(text: string): string {
  if (!text) return "";
  
  // 簡単な変換ルール
  let result = text
    // 分数表記 1/2 → \frac{1}{2}
    .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
    // 2乗、3乗 → ^2, ^3
    .replace(/(\d+)(\s*)²/g, '$1^2')
    .replace(/(\d+)(\s*)³/g, '$1^3')
    // xの2乗 → x^2
    .replace(/([a-z])(\s*)²/g, '$1^2')
    .replace(/([a-z])(\s*)³/g, '$1^3')
    // ルート表記
    .replace(/√(\d+)/g, '\\sqrt{$1}')
    // 円周率
    .replace(/π/g, '\\pi ');
  
  // インライン数式の検出と変換（例: 式 x^2 + 2x = 3 など）
  const mathPatterns = [
    /\b[a-z]\s*=\s*[-+]?\d+/g,  // x = 5
    /\b[a-z]\s*[<>]=?\s*[-+]?\d+/g,  // x <= 5
    /[-+]?\d+\s*[<>]=?\s*[a-z]/g,  // 5 <= x
    /\b[a-z]\^[0-9]/g,  // x^2
    /\b[a-z]\s*[+\-*/]\s*[a-z0-9]/g,  // x + y, x - 5
    /\\frac\{.*?\}\{.*?\}/g,  // \frac{...}{...}
    /\\sqrt\{.*?\}/g,  // \sqrt{...}
  ];
  
  // 明らかな数式の部分をインライン数式で囲む
  for (const pattern of mathPatterns) {
    result = result.replace(pattern, (match) => {
      // すでに$で囲われていなければ囲む
      if (!match.startsWith('$') && !match.endsWith('$')) {
        return `$${match}$`;
      }
      return match;
    });
  }
  
  return result;
}

// オブジェクトを読みやすいテキスト形式に変換するヘルパー関数
function formatObjectToText(obj: Record<string, any>): string {
  // 特殊なケース: stepsやprocessなどの配列を含むオブジェクトの処理
  if (obj.steps && Array.isArray(obj.steps)) {
    return obj.steps.map((step: any, index: number) => {
      if (typeof step === 'string') {
        return `ステップ${index + 1}: ${step}`;
      } else if (typeof step === 'object') {
        return `ステップ${index + 1}: ${formatObjectToText(step)}`;
      }
      return `ステップ${index + 1}: ${String(step)}`;
    }).join('\n\n');
  }
  
  if (obj.process && Array.isArray(obj.process)) {
    return obj.process.map((item: any, index: number) => {
      if (typeof item === 'string') {
        return `${index + 1}. ${item}`;
      } else if (typeof item === 'object') {
        return `${index + 1}. ${formatObjectToText(item)}`;
      }
      return `${index + 1}. ${String(item)}`;
    }).join('\n\n');
  }
  
  // 一般的なオブジェクトの処理
  return Object.entries(obj)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map((item, index) => {
            if (typeof item === 'object' && item !== null) {
              return `  ${index + 1}. ${formatObjectToText(item)}`;
            }
            return `  ${index + 1}. ${item}`;
          }).join('\n')}`;
        }
        return `${key}:\n${formatObjectToText(value)}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n\n');
} 