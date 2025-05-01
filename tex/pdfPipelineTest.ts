import * as path from 'path';
import { createPDFGenerator } from './pdfGenerator';
import { createPDFService } from './pdfService';

/**
 * PDF生成パイプラインの動作確認を行う関数
 */
async function testPDFPipeline() {
  console.log('🚀 PDF生成パイプラインの動作確認を開始します...');
  
  // テンプレートディレクトリとPDF出力ディレクトリの設定
  const templateDir = path.resolve(__dirname, 'templates');
  const outputDir = path.resolve(__dirname, '../output/pipeline-test');
  
  console.log(`📁 テンプレートディレクトリ: ${templateDir}`);
  console.log(`📁 出力ディレクトリ: ${outputDir}`);
  
  try {
    // 1. PDFGeneratorの動作確認
    console.log('\n📋 PDFGeneratorの動作確認...');
    const pdfGenerator = createPDFGenerator(templateDir, outputDir);
    
    // 記述式問題のテスト
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
    
    console.log('記述式問題のPDF生成を実行中...');
    const descriptivePdfPath = await pdfGenerator.generateProblemPDF(descriptiveData, {
      filename: 'generator-test-descriptive',
      keepTexFile: true
    });
    console.log(`✅ PDFGeneratorで記述式問題のPDFを生成しました: ${descriptivePdfPath}`);
    
    // 選択式問題のテスト
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
    
    console.log('選択式問題のPDF生成を実行中...');
    const multipleChoicePdfPath = await pdfGenerator.generateMultipleChoicePDF(multipleChoiceData, {
      filename: 'generator-test-multiple-choice',
      keepTexFile: true
    });
    console.log(`✅ PDFGeneratorで選択式問題のPDFを生成しました: ${multipleChoicePdfPath}`);
    
    // 2. PDFServiceの動作確認
    console.log('\n📋 PDFServiceの動作確認...');
    const pdfService = createPDFService(templateDir, outputDir);
    
    // 記述式問題のテスト
    console.log('PDFServiceを使用して記述式問題のPDF生成を実行中...');
    const serviceProblemData = {
      problemText: '2次方程式 $x^2 + 6x + 8 = 0$ を解きなさい。',
      answerText: '$x = -2$ または $x = -4$',
      explanationText: '$x^2 + 6x + 8 = 0$ を因数分解すると $(x + 2)(x + 4) = 0$\nしたがって $x = -2$ または $x = -4$',
      figureCode: `\\begin{tikzpicture}
        \\begin{axis}[
          axis lines=middle,
          xlabel=$x$,
          ylabel=$y$,
          xmin=-6, xmax=2,
          ymin=-5, ymax=15,
          grid=both,
          width=10cm,
          height=8cm
        ]
          \\addplot[domain=-6:2, samples=100, blue, thick] {x^2 + 6*x + 8};
          \\addplot[mark=*, fill=red] coordinates {(-2,0)} node[above right] {$(-2,0)$};
          \\addplot[mark=*, fill=red] coordinates {(-4,0)} node[above right] {$(-4,0)$};
        \\end{axis}
      \\end{tikzpicture}`
    };
    
    const servicePdfPath = await pdfService.generateMathProblemPDF(serviceProblemData, {
      filename: 'service-test-problem',
      keepTexFile: true
    });
    console.log(`✅ PDFServiceで問題のPDFを生成しました: ${servicePdfPath}`);
    
    // 選択式問題のテスト
    console.log('PDFServiceを使用して選択式問題のPDF生成を実行中...');
    const serviceMultipleChoiceData = {
      problemText: '次の三角形の面積として正しいものを選びなさい。底辺が6cm、高さが4cmの三角形の面積は？',
      answerText: '正解は C) 12平方センチメートル',
      explanationText: '三角形の面積は (底辺 × 高さ) ÷ 2 で求められます。\n(6 × 4) ÷ 2 = 12',
      isMultipleChoice: true,
      choices: [
        '10平方センチメートル',
        '24平方センチメートル',
        '12平方センチメートル',
        '8平方センチメートル'
      ],
      figureCode: `\\begin{tikzpicture}
        \\draw[thick] (0,0) -- (6,0) -- (3,4) -- cycle;
        \\draw[dashed] (3,0) -- (3,4);
        \\node at (3,0) [below] {底辺 = 6cm};
        \\node at (3.5,2) [right] {高さ = 4cm};
      \\end{tikzpicture}`
    };
    
    const serviceMultipleChoicePdfPath = await pdfService.generateMathProblemPDF(serviceMultipleChoiceData, {
      filename: 'service-test-multiple-choice',
      keepTexFile: true
    });
    console.log(`✅ PDFServiceで選択式問題のPDFを生成しました: ${serviceMultipleChoicePdfPath}`);
    
    // 3. エンドツーエンドパイプラインの確認
    console.log('\n📋 エンドツーエンドパイプラインの確認...');
    console.log('問題データの生成 → PDFサービスでのPDF生成 → PDFファイルの出力までの流れを確認します');
    
    // 問題データを作成（実際のシステムでは問題生成エージェントから提供される）
    const problemData = {
      question: '直線 $y = 2x + 3$ と直線 $y = -x + 6$ の交点の座標を求めなさい。',
      answer: '交点の座標は $(1, 5)$ です。',
      explanation: '連立方程式を解きます：\n$y = 2x + 3$\n$y = -x + 6$\n$2x + 3 = -x + 6$\n$3x = 3$\n$x = 1$\nこのとき $y = 2 \\cdot 1 + 3 = 5$\nよって交点の座標は $(1, 5)$ です。',
    };
    
    // TeXコンテンツの生成（実際のシステムではTeX整形エージェントから提供される）
    const texContent = `
\\documentclass[a4paper,11pt]{article}

% 日本語対応
\\usepackage{xeCJK}
\\setCJKmainfont{Yu Gothic}

% 数学関連パッケージ
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsthm}
\\usepackage{amsfonts}
\\usepackage{mathtools}

% 図形描画用パッケージ
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}

% その他パッケージ
\\usepackage{graphicx}
\\usepackage{enumitem}
\\usepackage{float}
\\usepackage{hyperref}
\\usepackage{fancyhdr}
\\usepackage{geometry}

% ページ設定
\\geometry{
  a4paper,
  top=25mm,
  bottom=25mm,
  left=25mm,
  right=25mm
}

% ヘッダーとフッターの設定
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{数学問題}
\\fancyhead[R]{\\today}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0.4pt}

% タイトル情報
\\title{数学問題}
\\author{数学問題生成AIシステム}
\\date{\\today}

% ドキュメント開始
\\begin{document}

\\maketitle

% 問題セクション
\\section*{問題}

${problemData.question}

\\begin{tikzpicture}
  \\begin{axis}[
    axis lines=middle,
    xlabel=$x$,
    ylabel=$y$,
    xmin=-2, xmax=4,
    ymin=-1, ymax=8,
    grid=both,
    width=10cm,
    height=8cm
  ]
    \\addplot[domain=-2:4, samples=100, blue, thick] {2*x + 3};
    \\addplot[domain=-2:4, samples=100, red, thick] {-x + 6};
    \\addplot[mark=*, fill=black] coordinates {(1,5)} node[above right] {$(1,5)$};
  \\end{axis}
\\end{tikzpicture}

% 解答セクション
\\section*{解答}

${problemData.answer}

% 解説セクション
\\section*{解説}

${problemData.explanation}

\\end{document}
    `;
    
    // 一時ファイルにTeXコンテンツを書き出し
    const fs = require('fs');
    const tempTeXPath = path.join(outputDir, 'pipeline-test.tex');
    
    console.log('TeXファイルを生成中...');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(tempTeXPath, texContent, 'utf-8');
    
    // TeXコンパイルでPDF生成
    const { execSync } = require('child_process');
    
    console.log('PDFを生成中...');
    const command = `cd "${outputDir}" && xelatex -interaction=nonstopmode pipeline-test.tex`;
    
    try {
      execSync(command);
      const pipelinePdfPath = path.join(outputDir, 'pipeline-test.pdf');
      console.log(`✅ エンドツーエンドパイプラインでPDFを生成しました: ${pipelinePdfPath}`);
    } catch (error) {
      console.error('❌ PDFのコンパイル中にエラーが発生しました:', error);
      throw error;
    }
    
    console.log('\n🎉 PDF生成パイプラインの動作確認が完了しました!');
    console.log('生成されたPDFファイル:');
    console.log(`- PDFGenerator (記述式): ${descriptivePdfPath}`);
    console.log(`- PDFGenerator (選択式): ${multipleChoicePdfPath}`);
    console.log(`- PDFService (記述式): ${servicePdfPath}`);
    console.log(`- PDFService (選択式): ${serviceMultipleChoicePdfPath}`);
    console.log(`- エンドツーエンドパイプライン: ${path.join(outputDir, 'pipeline-test.pdf')}`);
    
  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  }
}

// テスト関数の実行
testPDFPipeline().catch(error => {
  console.error('テスト実行に失敗しました:', error);
  process.exit(1);
}); 