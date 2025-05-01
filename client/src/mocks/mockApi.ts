import { ProblemSpec, Problem } from '../contexts/MathProblemContext';

/**
 * フロントエンドテスト用のモックAPI
 * 実際のサーバーAPIをシミュレートするためのモック関数群
 */

// 問題生成のモック応答
const mockProblem: Problem = {
  id: 'mock-problem-001',
  question: '次の二次関数 $f(x) = x^2 - 4x + 3$ のグラフと直線 $y = 2x - 1$ の共有点の座標を求めなさい。',
  answer: '共有点の座標は $(1, 1)$ と $(3, 5)$ である。',
  explanation: `二次関数 $f(x) = x^2 - 4x + 3$ と直線 $y = 2x - 1$ の共有点を求めるには、これらの式を連立させます。
共有点では $y$ の値が等しいので：
$x^2 - 4x + 3 = 2x - 1$
$x^2 - 6x + 4 = 0$
$x^2 - 6x + 9 - 9 + 4 = 0$
$(x - 3)^2 - 5 = 0$
$(x - 3)^2 = 5$
$x - 3 = \\pm \\sqrt{5}$
$x = 3 \\pm \\sqrt{5}$

$x = 3 + \\sqrt{5}$ のとき、$y = 2(3 + \\sqrt{5}) - 1 = 5 + 2\\sqrt{5}$
$x = 3 - \\sqrt{5}$ のとき、$y = 2(3 - \\sqrt{5}) - 1 = 5 - 2\\sqrt{5}$

したがって、共有点の座標は $(3 + \\sqrt{5}, 5 + 2\\sqrt{5})$ と $(3 - \\sqrt{5}, 5 - 2\\sqrt{5})$ である。

数値計算すると $(5.236, 9.472)$ と $(0.764, 0.528)$ となる。`,
  visualization: {
    type: 'function_graph',
    functions: [
      {
        expression: 'x^2 - 4*x + 3',
        domain: [-1, 6],
        style: 'blue',
        label: 'f(x) = x^2 - 4x + 3'
      },
      {
        expression: '2*x - 1',
        domain: [-1, 6],
        style: 'red',
        label: 'g(x) = 2x - 1'
      }
    ],
    highlight_points: [[0.764, 0.528], [5.236, 9.472]],
    axes: { xrange: [-1, 6], yrange: [-2, 10] }
  }
};

// モックPDF URL
const mockPdfUrl = 'https://example.com/mock-problem.pdf';

/**
 * ヘルスチェックAPIのモック実装
 */
export const mockHealthCheck = async () => {
  // 通信を再現するため少し待つ
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 95%の確率で成功、5%の確率で失敗
  const shouldSucceed = Math.random() < 0.95;
  
  if (!shouldSucceed) {
    throw new Error('ヘルスチェックに失敗しました。サーバーが応答していません。');
  }
  
  return {
    status: 'ok',
    message: 'サーバーは正常に動作しています（モック応答）',
    timestamp: new Date().toISOString()
  };
};

/**
 * 問題生成APIのモック実装
 */
export const mockGenerateProblem = async (problemSpec: Partial<ProblemSpec>) => {
  // 通信を再現するため少し待つ
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // 90%の確率で成功、10%の確率で失敗
  const shouldSucceed = Math.random() < 0.9;
  
  if (!shouldSucceed) {
    throw new Error('問題生成に失敗しました。再試行してください。');
  }
  
  return {
    problem: mockProblem,
    pdfUrl: mockPdfUrl
  };
};

/**
 * スロットフィリングAPIのモック実装
 */
export const mockGetNextQuestion = async (
  userMessage: string,
  currentSpec: Partial<ProblemSpec>
) => {
  // 通信を再現するため少し待つ
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // 現在の問題仕様をチェックして次の質問を決定
  let nextQuestion = '';
  let isComplete = false;
  let updatedSpec = { ...currentSpec };
  
  // 主題（topic）がない場合
  if (!currentSpec.topic) {
    // メッセージから数学の分野を推測
    if (userMessage.includes('関数')) {
      updatedSpec.topic = '関数';
    } else if (userMessage.includes('図形')) {
      updatedSpec.topic = '図形';
    } else if (userMessage.includes('確率')) {
      updatedSpec.topic = '確率・統計';
    } else {
      updatedSpec.topic = '数と式'; // デフォルト
    }
    nextQuestion = `「${updatedSpec.topic}」に関する問題ですね。難易度を教えてください（小学生/中学生/高校生）`;
    return { updatedSpec, nextQuestion, isComplete };
  }
  
  // 難易度（difficulty）がない場合
  if (!currentSpec.difficulty) {
    // メッセージから難易度を推測
    if (userMessage.includes('小学生')) {
      updatedSpec.difficulty = '小学生';
    } else if (userMessage.includes('中学生')) {
      updatedSpec.difficulty = '中学生';
    } else {
      updatedSpec.difficulty = '高校生'; // デフォルト
    }
    nextQuestion = `難易度は「${updatedSpec.difficulty}」ですね。問題形式を教えてください（記述式/選択式/計算問題）`;
    return { updatedSpec, nextQuestion, isComplete };
  }
  
  // 出題形式（format）がない場合
  if (!currentSpec.format) {
    // メッセージから出題形式を推測
    if (userMessage.includes('記述')) {
      updatedSpec.format = '記述式';
    } else if (userMessage.includes('選択')) {
      updatedSpec.format = '選択式';
    } else {
      updatedSpec.format = '計算問題'; // デフォルト
    }
    nextQuestion = `問題形式は「${updatedSpec.format}」ですね。何問出題しますか？（1〜10問）`;
    return { updatedSpec, nextQuestion, isComplete };
  }
  
  // 問題数（count）がない場合
  if (!currentSpec.count) {
    // メッセージから問題数を推測
    const countMatch = userMessage.match(/(\d+)/);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      updatedSpec.count = Math.min(Math.max(count, 1), 10); // 1〜10問に制限
    } else {
      updatedSpec.count = 1; // デフォルト
    }
    nextQuestion = `${updatedSpec.count}問出題します。問題に関する詳細条件があれば教えてください。`;
    return { updatedSpec, nextQuestion, isComplete };
  }
  
  // 詳細条件（details）がない場合
  if (!currentSpec.details) {
    updatedSpec.details = userMessage || '特になし';
    
    // すべての必須項目が入力された
    isComplete = true;
    nextQuestion = `以下の条件で問題を生成します：
・分野：${updatedSpec.topic}
・難易度：${updatedSpec.difficulty}
・形式：${updatedSpec.format}
・問題数：${updatedSpec.count}問
・詳細条件：${updatedSpec.details}`;
    
    return { updatedSpec, nextQuestion, isComplete };
  }
  
  // すべて入力済みの場合
  isComplete = true;
  nextQuestion = '問題生成の準備ができました。';
  
  return { updatedSpec, nextQuestion, isComplete };
};

/**
 * PDFダウンロードAPIのモック実装
 */
export const mockDownloadPdf = async () => {
  // 通信を再現するため少し待つ
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // PDFのモックデータを返す代わりに、成功メッセージを返す
  return new Blob(['PDF data would be here'], { type: 'application/pdf' });
}; 