import * as path from 'path';
import { createPDFGenerator } from './pdfGenerator';

/**
 * TeXテンプレートの動作確認を行う関数
 */
async function testTeXTemplate() {
  console.log('🚀 TeXテンプレートの動作確認を開始します...');
  
  // テンプレートディレクトリとPDF出力ディレクトリの設定
  const templateDir = path.resolve(__dirname, 'templates');
  const outputDir = path.resolve(__dirname, '../../output/test-pdfs');
  
  console.log(`📁 テンプレートディレクトリ: ${templateDir}`);
  console.log(`📁 出力ディレクトリ: ${outputDir}`);
  
  try {
    // PDFGeneratorの作成
    const pdfGenerator = createPDFGenerator(templateDir, outputDir);
    console.log('✅ PDFGeneratorの作成が完了しました');
    
    // 1. 記述式問題のテスト
    console.log('\n📝 記述式問題のテスト...');
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
    
    const descriptivePdfPath = await pdfGenerator.generateProblemPDF(descriptiveData, {
      filename: 'test-descriptive',
      keepTexFile: true  // TeXファイルを保持（デバッグ用）
    });
    
    console.log(`✅ 記述式問題のPDFを生成しました: ${descriptivePdfPath}`);
    
    // 2. 選択式問題のテスト
    console.log('\n📝 選択式問題のテスト...');
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
    
    const multipleChoicePdfPath = await pdfGenerator.generateMultipleChoicePDF(multipleChoiceData, {
      filename: 'test-multiple-choice',
      keepTexFile: true  // TeXファイルを保持（デバッグ用）
    });
    
    console.log(`✅ 選択式問題のPDFを生成しました: ${multipleChoicePdfPath}`);
    
    console.log('\n🎉 テスト完了!');
    console.log('生成されたPDFファイルを確認してください:');
    console.log(`- 記述式問題: ${descriptivePdfPath}`);
    console.log(`- 選択式問題: ${multipleChoicePdfPath}`);
    
  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  }
}

// テスト関数の実行
testTeXTemplate().catch(error => {
  console.error('テスト実行に失敗しました:', error);
  process.exit(1);
}); 