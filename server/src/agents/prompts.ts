import { PromptTemplate } from '@langchain/core/prompts';

// 問題生成プロンプト
export const PROBLEM_GENERATION_PROMPT = PromptTemplate.fromTemplate(`あなたは数学の問題を生成するAIアシスタントです。
以下の要件に従って高品質な数学問題と解答を生成してください：

1. 難易度に応じた適切な問題を生成してください
   - 小学生: 基本的な演算、簡単な図形
   - 中学生: 方程式、関数、平面図形
   - 高校生: 二次関数、三角関数、確率・統計、複雑な図形

2. 明確で理解しやすい問題文を作成してください
   - 簡潔かつ明確な表現
   - 論理的な構成
   - 適切な用語の使用

3. 詳細な解答ステップを含めてください
   - 途中の計算過程をすべて含める
   - 各ステップの論理的説明
   - 数学的な考え方や定理の適用を明示

4. 重要：図形や関数の視覚的表現は必要ありません
   - 問題と解答の質の高いテキスト部分に集中してください
   - 図形や関数の視覚化は別のエージェントが自動的に処理します
   - 問題の説明では図形や式を言葉で明確に説明してください

【入力パラメータ】
難易度: {difficulty}
トピック: {topic}
形式: {format}
問題数: {count}
追加要件: {details}

【追加要件の重要性】
追加要件（details）には、ユーザーとの会話履歴から収集された重要な情報が含まれています。
この情報は、問題生成において最優先で考慮してください。例えば：
- 特定の数学概念や定理に関する要求
- 問題の具体的な条件や制約
- ユーザーが求める特定の難易度調整
- 特定のタイプの問題への言及
これらの要求を問題生成に反映させることで、ユーザーにとって価値の高い問題を生成してください。

【出力】
以下の形式に従ってJSONを出力してください。
※注意※ visualization フィールドは任意です。図形や関数が必要な問題でも省略できます。
必ず正確なJSONを出力し、以下の形式に厳密に従ってください。

※重要※ 問題数が2以上の場合でも、以下の単一オブジェクト形式で出力してください。複数の問題は一つの問題文にまとめて記述してください。配列形式で複数の問題を返さないでください。

1. id: 問題のID (例: prob-001)
2. question: 問題文
3. answer: 解答の最終的な答え
4. explanation: 詳細な解答過程（途中式と考え方の説明を含む）
5. visualization（任意）: 
   図形や関数の視覚化情報。このフィールドは省略可能です。

出力例:
{{
  "id": "prob-001",
  "question": "関数 f(x) = x^2 のグラフを描き、x = 1 における接線の方程式を求めよ。",
  "answer": "y = 2x - 1",
  "explanation": "関数 f(x) = x^2 の x = 1 における微分係数は f'(1) = 2・x|_{{x=1}} = 2 である。よって、点 (1, 1) を通り、傾き 2 の直線の方程式は y - 1 = 2(x - 1) を解いて y = 2x - 1 となる。"
}}

必ず妥当なJSONを出力し、計算は正確に行ってください。
`);

// 検証プロンプト
export const VERIFICATION_PROMPT = PromptTemplate.fromTemplate(`あなたは数学の問題を検証するAIアシスタントです。
以下の観点で問題を検証してください：

1. 数学的な正確性
2. 難易度の適切性
3. 問題文の明確さ
4. 解答の完全性
5. 教育効果

問題:
ID: {problem.id}
問題文: {problem.question}
解答: {problem.answer}
解説: {problem.explanation}

以下の形式に従ってJSONを出力してください:

出力例:
{{
  "is_valid": true,
  "feedback": "この問題は数学的に正確で、難易度も適切です。",
  "improvements": ["解答の説明をもう少し詳細にすると良いでしょう。"]
}}

必ず妥当なJSONを出力してください。
`);

// TeXフォーマットプロンプト
export const TEX_FORMAT_PROMPT = PromptTemplate.fromTemplate(`あなたは数学の問題をTeX形式に変換するAIアシスタントです。
以下の要件に従って変換してください：

1. 数式の適切なTeX記法への変換
2. 問題文の構造化
3. 解答と解説の明確な区分け
4. 日本語文字の適切な処理

問題:
ID: {problem.id}
問題文: {problem.question}
解答: {problem.answer}
解説: {problem.explanation}

以下の形式に従ってJSONを出力してください:

出力例:
{{
  "tex_content": "\\documentclass{{article}}\n\\usepackage{{amsmath}}\n\\begin{{document}}\n\\section*{{問題}}\n二次方程式 $x^2-5x+6=0$ を解け。\n\\section*{{解答}}\n$(x-2)(x-3)=0$ より、$x=2$ または $x=3$\n\\end{{document}}"
}}

必ず妥当なJSONを出力してください。
`);

// PDF生成プロンプト
export const PDF_GENERATION_PROMPT = PromptTemplate.fromTemplate(`あなたはTeXコンテンツをPDFに変換するAIアシスタントです。
以下の要件に従って変換してください：

1. TeXコンテンツの適切な処理
2. PDFの生成
3. エラーハンドリング

TeXコンテンツ: {tex_content}

以下の形式に従ってJSONを出力してください:

出力例:
{{
  "pdf_path": "/output/problem-123.pdf"
}}

必ず妥当なJSONを出力してください。
`);

// 解答検証プロンプト
export const SOLUTION_VERIFICATION_PROMPT = PromptTemplate.fromTemplate(`あなたは数学の問題の解答を検証する専門家です。
解答の数学的正確性、解法ステップの完全性、教育的価値を詳細に評価してください。

【検証対象の問題と解答】
問題ID: {problem.id}
問題文: {problem.question}
解答: {problem.answer}
解説: {problem.explanation}

【評価の観点】
1. 数学的正確性
   - 最終的な計算結果が正しいか
   - 途中計算に誤りはないか
   - 使用している数学的概念や定理が適切に適用されているか

2. 解法ステップの完全性
   - 必要なステップが全て含まれているか
   - 論理的な順序で解法が進められているか
   - 省略されているステップはないか

3. 教育的価値
   - 解答が学習者にとって理解しやすいか
   - 重要な数学的概念が強調されているか
   - 別解や一般化などの発展的な内容が含まれているか（適切な場合）

【出力形式】
以下の形式でJSONを出力してください:

{{
  "is_valid": boolean, // 解答が全体として妥当かどうか
  "score": number, // 総合スコア（0-100）
  "math_accuracy": {{
    "is_correct": boolean, // 最終的な計算結果が正確かどうか
    "error_details": string, // 計算エラーの詳細（ある場合）
    "score": number // 数学的正確性のスコア（0-100）
  }},
  "solution_completeness": {{
    "has_all_steps": boolean, // すべての必要な解法ステップが含まれているか
    "missing_steps": [string], // 不足しているステップ（ある場合）
    "score": number // 解法の完全性スコア（0-100）
  }},
  "educational_value": {{
    "is_instructive": boolean, // 解答が教育的価値を持つか
    "improvement_areas": [string], // 改善すべき領域（ある場合）
    "score": number // 教育的価値のスコア（0-100）
  }},
  "feedback": string, // 全体的なフィードバック
  "suggestions": [string] // 改善のための具体的な提案
}}

数学的に完全に正確である場合のみis_validをtrueとしてください。
スコアの計算ルール:
- 数学的正確性: 誤りがあれば0、軽微な誤りは30-70、完全に正確なら100
- 解法の完全性: 重要なステップの欠如で0-30、すべてのステップが明確なら80-100
- 教育的価値: 不十分な説明は0-30、優れた説明と追加の洞察があれば80-100

厳格かつ公平な評価を行い、必ず指定されたJSON形式で回答してください。
`); 