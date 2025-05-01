import * as path from 'path';
import * as fs from 'fs';

/**
 * TeXテンプレートを確認するための簡易テスト
 * TeXファイルの生成のみを行います。PDFへの変換は行いません
 */
function testTeXTemplateSimple() {
  console.log('🚀 TeXテンプレートの確認を開始します...');
  
  // テンプレートディレクトリと出力ディレクトリの設定
  const templateDir = path.resolve(__dirname, 'templates');
  const outputDir = path.resolve(__dirname, '../../output/test-tex');
  
  console.log(`📁 テンプレートディレクトリ: ${templateDir}`);
  console.log(`📁 出力ディレクトリ: ${outputDir}`);
  
  // 出力ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 出力ディレクトリを作成しました: ${outputDir}`);
  }
  
  try {
    // 1. 記述式問題のテンプレート読み込み
    console.log('\n📄 記述式問題のテンプレート読み込み...');
    const descriptiveTemplate = fs.readFileSync(
      path.join(templateDir, 'problem.tex'),
      'utf-8'
    );
    
    // テスト用データ
    const descriptiveData = {
      problemText: '次の二次関数 $f(x) = x^2 - 4x + 3$ のグラフについて、頂点の座標を求めなさい。',
      answerText: '頂点の座標は $(2, -1)$ である。',
      explanationText: '二次関数 $f(x) = x^2 - 4x + 3$ は $f(x) = (x - 2)^2 - 1$ と変形できる。\nしたがって、頂点の座標は $(2, -1)$ である。',
      figureCode: `\\begin{tikzpicture}
        \\begin{axis}[
          axis lines=middle,
          xlabel=$x$,
          ylabel=$y$,
          xmin=-1, xmax=5,
          ymin=-2, ymax=4,
          grid=both,
          width=10cm,
          height=8cm
        ]
          \\addplot[domain=-1:5, samples=100, blue, thick] {x^2 - 4*x + 3};
          \\addplot[mark=*, fill=red] coordinates {(2,-1)} node[above right] {$(2,-1)$};
        \\end{axis}
      \\end{tikzpicture}`
    };
    
    // テンプレート変数の置換
    let descriptiveContent = descriptiveTemplate;
    descriptiveContent = descriptiveContent.replace(/{{PROBLEM_TEXT}}/g, descriptiveData.problemText);
    descriptiveContent = descriptiveContent.replace(/{{ANSWER_TEXT}}/g, descriptiveData.answerText);
    descriptiveContent = descriptiveContent.replace(/{{EXPLANATION_TEXT}}/g, descriptiveData.explanationText);
    descriptiveContent = descriptiveContent.replace(/{{FIGURE_CODE}}/g, descriptiveData.figureCode);
    
    // TeXファイルの書き出し
    const descriptiveFilePath = path.join(outputDir, 'test-descriptive.tex');
    fs.writeFileSync(descriptiveFilePath, descriptiveContent, 'utf-8');
    console.log(`✅ 記述式問題のTeXファイルを生成しました: ${descriptiveFilePath}`);
    
    // 2. 選択式問題のテンプレート読み込み
    console.log('\n📄 選択式問題のテンプレート読み込み...');
    const multipleChoiceTemplate = fs.readFileSync(
      path.join(templateDir, 'multiple_choice.tex'),
      'utf-8'
    );
    
    // テスト用データ
    const multipleChoiceData = {
      problemText: '次の方程式 $x^2 - 5x + 6 = 0$ の解として正しいものを選びなさい。',
      answerText: '正解は B) $x = 2, x = 3$ です。',
      explanationText: '$x^2 - 5x + 6 = 0$ を因数分解すると $(x - 2)(x - 3) = 0$ となる。\nしたがって、$x = 2$ または $x = 3$ が解である。',
      choices: [
        '$x = 1, x = 6$',
        '$x = 2, x = 3$',
        '$x = -2, x = -3$',
        '$x = 1, x = -6$'
      ]
    };
    
    // 選択肢のTeXコード生成
    const choicesTeX = multipleChoiceData.choices.map((choice, index) => {
      const label = String.fromCharCode(65 + index); // A, B, C, ...
      return `\\choice{${label}}{${choice}}`;
    }).join('\n');
    
    // テンプレート変数の置換
    let multipleChoiceContent = multipleChoiceTemplate;
    multipleChoiceContent = multipleChoiceContent.replace(/{{PROBLEM_TEXT}}/g, multipleChoiceData.problemText);
    multipleChoiceContent = multipleChoiceContent.replace(/{{ANSWER_TEXT}}/g, multipleChoiceData.answerText);
    multipleChoiceContent = multipleChoiceContent.replace(/{{EXPLANATION_TEXT}}/g, multipleChoiceData.explanationText);
    multipleChoiceContent = multipleChoiceContent.replace(/{{CHOICES}}/g, choicesTeX);
    multipleChoiceContent = multipleChoiceContent.replace(/{{FIGURE_CODE}}/g, '');
    
    // TeXファイルの書き出し
    const multipleChoiceFilePath = path.join(outputDir, 'test-multiple-choice.tex');
    fs.writeFileSync(multipleChoiceFilePath, multipleChoiceContent, 'utf-8');
    console.log(`✅ 選択式問題のTeXファイルを生成しました: ${multipleChoiceFilePath}`);
    
    console.log('\n🎉 テスト完了!');
    console.log('生成されたTeXファイルを確認してください:');
    console.log(`- 記述式問題: ${descriptiveFilePath}`);
    console.log(`- 選択式問題: ${multipleChoiceFilePath}`);
    
  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  }
}

// テスト関数の実行
testTeXTemplateSimple(); 