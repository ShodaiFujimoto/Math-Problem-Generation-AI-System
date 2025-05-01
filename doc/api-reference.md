# 数学問題生成AIシステム API仕様書

## 概要

このドキュメントでは、数学問題生成AIシステムが提供するAPIエンドポイントと、それらの使用方法について詳細に説明します。このAPIは、Windows PC上で動作し、ユーザーとの対話を通じて問題仕様を決定し、AIによる高品質な数学問題と解答の生成、グラフや図形を含むTeXフォーマットでのPDF出力を行います。

## ベースURL

すべてのAPIリクエストには、以下のベースURLを使用します：

```
http://localhost:3000/api
```

## エンドポイント一覧

APIは以下のエンドポイントを提供します：

1. [スロットフィリング](#スロットフィリング) - 問題仕様の対話的な決定
2. [問題生成](#問題生成) - 指定された仕様に基づく問題の生成
3. [解答検証](#解答検証) - 生成された解答の検証
4. [TeX整形](#tex整形) - 問題と解答のTeX形式への変換
5. [PDF生成](#pdf生成) - TeXからのPDF生成
6. [PDFダウンロード](#pdfダウンロード) - 生成されたPDFのダウンロード

---

## スロットフィリング

ユーザーとの対話を通じて問題仕様を段階的に決定するエンドポイントです。

### リクエスト

```
POST /slot-filling
```

#### リクエスト本文

```json
{
  "chat_history": [
    {
      "role": "user",
      "content": "高校生向けの二次関数の問題を作ってください"
    }
  ],
  "problem_spec": {
    "difficulty": "高校生",
    "topic": "",
    "format": "",
    "count": null,
    "details": ""
  }
}
```

| パラメータ | 型 | 説明 |
|---|---|---|
| chat_history | 配列 | 会話履歴。各要素はrole（"user"または"assistant"）とcontent（メッセージ内容）を含むオブジェクト |
| problem_spec | オブジェクト | 現在の問題仕様の状態 |
| problem_spec.difficulty | 文字列 | 難易度（"小学生"、"中学生"、"高校生"） |
| problem_spec.topic | 文字列 | 数学分野（"数と式"、"関数"、"図形"、"確率・統計"など） |
| problem_spec.format | 文字列 | 出題形式（"記述式"、"選択式"、"計算問題"など） |
| problem_spec.count | 数値 | 問題数（1〜10） |
| problem_spec.details | 文字列 | 詳細条件 |

### レスポンス

```json
{
  "problem_spec": {
    "difficulty": "高校生",
    "topic": "関数",
    "format": "計算問題",
    "count": 2,
    "details": "二次関数の最大値・最小値に関する問題"
  },
  "chat_history": [
    {
      "role": "user",
      "content": "高校生向けの二次関数の問題を作ってください"
    },
    {
      "role": "assistant",
      "content": "了解しました。高校生向けの二次関数の問題を作成します。何問作成しますか？"
    }
  ],
  "current_problem": {
    "id": "",
    "question": "",
    "answer": "",
    "explanation": ""
  },
  "verification_result": {
    "is_valid": false,
    "feedback": "",
    "suggestions": []
  },
  "tex_content": "",
  "pdf_path": "",
  "status": "in_progress"
}
```

#### ステータスコード

- 200 OK - リクエストが成功し、問題仕様が更新された
- 400 Bad Request - リクエスト形式が無効
- 500 Internal Server Error - サーバーエラー

---

## 問題生成

問題仕様に基づいて問題と解答を生成するエンドポイントです。

### リクエスト

```
POST /generate
```

#### リクエスト本文

```json
{
  "problemSpec": {
    "difficulty": "高校生",
    "topic": "関数",
    "format": "計算問題",
    "count": 2,
    "details": "二次関数の最大値・最小値に関する問題"
  }
}
```

| パラメータ | 型 | 説明 |
|---|---|---|
| problemSpec | オブジェクト | 問題仕様 |
| problemSpec.difficulty | 文字列 | 必須。難易度（"小学生"、"中学生"、"高校生"） |
| problemSpec.topic | 文字列 | 必須。数学分野 |
| problemSpec.format | 文字列 | 必須。出題形式 |
| problemSpec.count | 数値 | 必須。問題数（1〜10） |
| problemSpec.details | 文字列 | オプション。詳細条件 |

### レスポンス

```json
{
  "problem_spec": {
    "difficulty": "高校生",
    "topic": "関数",
    "format": "計算問題",
    "count": 2,
    "details": "二次関数の最大値・最小値に関する問題"
  },
  "chat_history": [],
  "current_problem": {
    "id": "prob-123",
    "question": "以下の2問の問題に答えなさい。\n\n問題1: 二次関数 f(x) = 2x^2 - 4x + 1 の最小値を求めよ。\n\n問題2: 二次関数 g(x) = -3x^2 + 6x - 2 の最大値を求めよ。",
    "answer": "問題1: 最小値は -1 である。\n\n問題2: 最大値は 1 である。",
    "explanation": "問題1: f(x) = 2x^2 - 4x + 1 = 2(x^2 - 2x) + 1 = 2(x - 1)^2 - 1 より、x = 1 のとき最小値 -1 をとる。\n\n問題2: g(x) = -3x^2 + 6x - 2 = -3(x^2 - 2x) - 2 = -3(x - 1)^2 + 1 より、x = 1 のとき最大値 1 をとる。"
  },
  "verification_result": {
    "is_valid": true,
    "feedback": "問題と解答は適切です。",
    "suggestions": []
  },
  "tex_content": "\\documentclass{article}...",
  "pdf_path": "output/pdfs/math_problem_1746119876543.pdf",
  "status": "pdf_generated"
}
```

#### ステータスコード

- 200 OK - 問題生成が成功
- 400 Bad Request - 問題仕様が無効または不足
- 500 Internal Server Error - 問題生成中にエラーが発生

---

## 解答検証

生成された解答の数学的正確性を検証するエンドポイントです。

### リクエスト

```
POST /verify-solution
```

#### リクエスト本文

```json
{
  "subject": "数学",
  "difficulty": "高校生",
  "problem_text": "二次関数 f(x) = 2x^2 - 4x + 1 の最小値を求めよ。",
  "solution": {
    "answer": "最小値は -1 である。",
    "text": "f(x) = 2x^2 - 4x + 1 = 2(x^2 - 2x) + 1 = 2(x - 1)^2 - 1 より、x = 1 のとき最小値 -1 をとる。"
  }
}
```

| パラメータ | 型 | 説明 |
|---|---|---|
| subject | 文字列 | 必須。科目 |
| difficulty | 文字列 | 必須。難易度 |
| problem_text | 文字列 | 必須。問題文 |
| solution | オブジェクト | 必須。解答情報 |
| solution.answer | 文字列 | 必須。解答の結論部分 |
| solution.text | 文字列 | 解答の詳細な説明 |

### レスポンス

```json
{
  "is_valid": true,
  "score": 90,
  "math_accuracy": {
    "is_correct": true,
    "error_details": "",
    "score": 100
  },
  "solution_completeness": {
    "has_all_steps": true,
    "missing_steps": [],
    "score": 90
  },
  "educational_value": {
    "is_instructive": true,
    "improvement_areas": [],
    "score": 85
  },
  "feedback": "解答は数学的に正確で、解法ステップも完全です。",
  "suggestions": []
}
```

#### ステータスコード

- 200 OK - 検証が成功
- 400 Bad Request - リクエスト形式が無効
- 500 Internal Server Error - 検証中にエラーが発生

---

## TeX整形

問題と解答をTeX形式に変換するエンドポイントです。

### リクエスト

```
POST /format-tex
```

#### リクエスト本文

```json
{
  "problem": {
    "id": "prob-123",
    "question": "二次関数 f(x) = 2x^2 - 4x + 1 の最小値を求めよ。",
    "answer": "最小値は -1 である。",
    "explanation": "f(x) = 2x^2 - 4x + 1 = 2(x^2 - 2x) + 1 = 2(x - 1)^2 - 1 より、x = 1 のとき最小値 -1 をとる。"
  }
}
```

| パラメータ | 型 | 説明 |
|---|---|---|
| problem | オブジェクト | 必須。問題データ |
| problem.id | 文字列 | 問題ID |
| problem.question | 文字列 | 必須。問題文 |
| problem.answer | 文字列 | 必須。解答 |
| problem.explanation | 文字列 | 解説 |

### レスポンス

```json
{
  "texContent": "\\documentclass{article}\n\\begin{document}\n\\section*{問題}\n二次関数 $f(x) = 2x^2 - 4x + 1$ の最小値を求めよ。\n\n\\section*{解答}\n最小値は $-1$ である。\n\n\\section*{解説}\n$f(x) = 2x^2 - 4x + 1 = 2(x^2 - 2x) + 1 = 2(x - 1)^2 - 1$ より、$x = 1$ のとき最小値 $-1$ をとる。\n\\end{document}"
}
```

#### ステータスコード

- 200 OK - TeX整形が成功
- 400 Bad Request - 問題データが無効
- 500 Internal Server Error - TeX整形中にエラーが発生

---

## PDF生成

TeX文字列からPDFを生成するエンドポイントです。

### リクエスト

```
POST /generate-pdf
```

#### リクエスト本文

```json
{
  "texContent": "\\documentclass{article}\n\\begin{document}\n\\section*{問題}\n二次関数 $f(x) = 2x^2 - 4x + 1$ の最小値を求めよ。\n\n\\section*{解答}\n最小値は $-1$ である。\n\n\\section*{解説}\n$f(x) = 2x^2 - 4x + 1 = 2(x^2 - 2x) + 1 = 2(x - 1)^2 - 1$ より、$x = 1$ のとき最小値 $-1$ をとる。\n\\end{document}"
}
```

| パラメータ | 型 | 説明 |
|---|---|---|
| texContent | 文字列 | 必須。TeX形式のコンテンツ |

### レスポンス

```json
{
  "pdfPath": "output/pdfs/math_problem_1746119876543.pdf"
}
```

#### ステータスコード

- 200 OK - PDF生成が成功
- 400 Bad Request - TeXコンテンツが無効
- 500 Internal Server Error - PDF生成中にエラーが発生

---

## PDFダウンロード

生成されたPDFファイルをダウンロードするエンドポイントです。

### リクエスト

```
GET /pdf/:filepath
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| filepath | 文字列 | 必須。PDFファイルの相対パスまたはファイル名 |

### レスポンス

PDFファイルのバイナリデータがストリームとして返されます。

#### ヘッダー

```
Content-Type: application/pdf
Content-Disposition: inline; filename="math_problem_1746119876543.pdf"
```

#### ステータスコード

- 200 OK - PDFファイルが正常に返された
- 400 Bad Request - ファイルパスが無効
- 404 Not Found - PDFファイルが見つからない
- 500 Internal Server Error - ダウンロード中にエラーが発生

---

## エラーレスポンス

すべてのAPIエラーは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ",
  "details": "詳細なエラー情報（オプション）",
  "status": "error"
}
```

---

## 認証

現時点では認証は実装されていません。APIはローカル環境でのみ使用することを前提としています。

---

## 使用例

### 例1: 問題仕様の対話的な決定

```javascript
// 初回リクエスト（ユーザーから「高校生向けの二次関数の問題」という入力）
fetch('http://localhost:3000/api/slot-filling', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_history: [
      { role: 'user', content: '高校生向けの二次関数の問題を作ってください' }
    ],
    problem_spec: {
      difficulty: '',
      topic: '',
      format: '',
      count: null,
      details: ''
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));

// 2回目のリクエスト（応答を受けて「2問」という入力）
fetch('http://localhost:3000/api/slot-filling', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_history: [
      { role: 'user', content: '高校生向けの二次関数の問題を作ってください' },
      { role: 'assistant', content: '了解しました。高校生向けの二次関数の問題を作成します。何問作成しますか？' },
      { role: 'user', content: '2問お願いします' }
    ],
    problem_spec: {
      difficulty: '高校生',
      topic: '関数',
      format: '',
      count: null,
      details: '二次関数'
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### 例2: 問題生成

```javascript
fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    problemSpec: {
      difficulty: '高校生',
      topic: '関数',
      format: '計算問題',
      count: 2,
      details: '二次関数の最大値・最小値に関する問題'
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log(data);
  // 生成されたPDFを表示
  const pdfViewer = document.getElementById('pdf-viewer');
  pdfViewer.src = `http://localhost:3000/api/${data.pdf_path}`;
});
``` 