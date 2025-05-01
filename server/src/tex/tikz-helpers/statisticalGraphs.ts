/**
 * 統計グラフのためのTeXヘルパー関数
 * 棒グラフ、円グラフ、折れ線グラフなどを生成します。
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 棒グラフを生成するための関数
 * @param data - データポイントの配列 [ラベル, 値]
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generateBarChart(
  data: Array<[string, number]>,
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    yMax?: number;
    legendPosition?: string;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 6;
  const title = options.title || '';
  const xLabel = options.xLabel || '';
  const yLabel = options.yLabel || '';
  const defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'cyan', 'magenta'];
  const colors = options.colors || defaultColors;
  const yMax = options.yMax || Math.max(...data.map(item => item[1])) * 1.2; // 最大値の1.2倍をデフォルトの上限に
  const legendPosition = options.legendPosition || 'north east';

  // データポイントからTeXコードを生成
  const barCommands = data.map((item, index) => {
    const [label, value] = item;
    const color = colors[index % colors.length];
    return `    \\addplot[fill=${color}] coordinates {(${label},${value})};`;
  }).join('\n');

  // 凡例の設定
  const legendCommands = data.map((item, index) => {
    const [label] = item;
    return label;
  }).join(',');

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    ymin=0,
    ymax=${yMax},
    symbolic x coords={${data.map(item => item[0]).join(',')}},
    xtick=data,
    nodes near coords,
    nodes near coords align={vertical},
    ybar,
    legend style={at={(${legendPosition})}, anchor=north east},
    legend entries={${legendCommands}}
  ]
${barCommands}
  \\end{axis}
\\end{tikzpicture}
`;
}

/**
 * 円グラフを生成するための関数
 * @param data - データポイントの配列 [ラベル, 値]
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generatePieChart(
  data: Array<[string, number]>,
  options: {
    radius?: number;
    title?: string;
    colors?: string[];
    legendPosition?: string;
    explode?: number[];
  } = {}
): string {
  // デフォルト値の設定
  const radius = options.radius || 4;
  const title = options.title || '';
  const defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'cyan', 'magenta'];
  const colors = options.colors || defaultColors;
  const legendPosition = options.legendPosition || 'north east';
  const explode = options.explode || new Array(data.length).fill(0);

  // 合計値の計算
  const total = data.reduce((sum, item) => sum + item[1], 0);

  // 各セクションのパーセント値とTeXコマンドを生成
  const pieCommands = data.map((item, index) => {
    const [label, value] = item;
    const percentage = (value / total) * 100;
    const color = colors[index % colors.length];
    const explodeValue = explode[index] || 0;
    return `    \\pie[explode=${explodeValue}, color=${color}, text=pin]{${percentage.toFixed(1)}/${label}}`;
  }).join('\n');

  // TeXコードの構築
  return `
\\begin{tikzpicture}[scale=0.8]
  \\begin{pie}[
    radius=${radius},
    text=legend,
    sum=auto,
    after number=\\%,
    style={thick},
    color={${colors.join(',')}},
    title={${title}},
    legend style={at={(${legendPosition})}, anchor=north east}
  ]
${pieCommands}
  \\end{pie}
\\end{tikzpicture}
`;
}

/**
 * 折れ線グラフを生成するための関数
 * @param dataSets - データセットの配列 [{label: string, data: [x, y][]}]
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generateLineChart(
  dataSets: Array<{
    label: string;
    data: Array<[number, number]>;
    markerStyle?: string;
    lineStyle?: string;
  }>,
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    grid?: boolean;
    legendPosition?: string;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 6;
  const title = options.title || '';
  const xLabel = options.xLabel || '';
  const yLabel = options.yLabel || '';
  const defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'cyan', 'magenta'];
  const colors = options.colors || defaultColors;
  const grid = options.grid !== undefined ? options.grid : true;
  const legendPosition = options.legendPosition || 'north east';

  // X軸とY軸の範囲設定
  let xValues: number[] = [];
  let yValues: number[] = [];
  dataSets.forEach(dataset => {
    dataset.data.forEach(point => {
      xValues.push(point[0]);
      yValues.push(point[1]);
    });
  });

  const xMin = options.xMin !== undefined ? options.xMin : Math.min(...xValues) - 1;
  const xMax = options.xMax !== undefined ? options.xMax : Math.max(...xValues) + 1;
  const yMin = options.yMin !== undefined ? options.yMin : Math.min(...yValues) - 1;
  const yMax = options.yMax !== undefined ? options.yMax : Math.max(...yValues) + 1;

  // データセットからTeXコードを生成
  const lineCommands = dataSets.map((dataset, index) => {
    const color = colors[index % colors.length];
    const markerStyle = dataset.markerStyle || 'mark=*';
    const lineStyle = dataset.lineStyle || 'solid';
    
    const coordinates = dataset.data.map(point => `(${point[0]},${point[1]})`).join(' ');
    
    return `    \\addplot[${color}, ${markerStyle}, ${lineStyle}] coordinates {${coordinates}};
    \\addlegendentry{${dataset.label}}`;
  }).join('\n');

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    xmin=${xMin},
    xmax=${xMax},
    ymin=${yMin},
    ymax=${yMax},
    ${grid ? 'grid=both,' : ''}
    legend pos=${legendPosition},
    legend style={nodes={scale=0.8, transform shape}}
  ]
${lineCommands}
  \\end{axis}
\\end{tikzpicture}
`;
}

/**
 * ヒストグラムを生成するための関数
 * @param data - データの配列
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generateHistogram(
  data: number[],
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    color?: string;
    bins?: number;
    xMin?: number;
    xMax?: number;
    density?: boolean;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 6;
  const title = options.title || 'ヒストグラム';
  const xLabel = options.xLabel || 'データ値';
  const yLabel = options.yLabel || '頻度';
  const color = options.color || 'blue';
  const bins = options.bins || 10;
  const xMin = options.xMin !== undefined ? options.xMin : Math.min(...data);
  const xMax = options.xMax !== undefined ? options.xMax : Math.max(...data);
  const density = options.density !== undefined ? options.density : false;

  // データを文字列に変換
  const dataString = data.join(', ');

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    xmin=${xMin},
    xmax=${xMax},
    ymin=0,
    hist/bins=${bins},
    ${density ? 'hist/density=true,' : ''}
  ]
    \\addplot[
      hist=${density ? 'density' : 'count'},
      fill=${color},
      opacity=0.7,
      draw=black
    ] table [row sep=\\\\, y index=0] {
      data\\\\
      ${dataString}\\\\
    };
  \\end{axis}
\\end{tikzpicture}
`;
}

/**
 * 箱ひげ図を生成するための関数
 * @param dataSets - データセットの配列 [{label: string, data: number[]}]
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generateBoxPlot(
  dataSets: Array<{
    label: string;
    data: number[];
  }>,
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    horizontal?: boolean;
    boxWidth?: number;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 6;
  const title = options.title || '箱ひげ図';
  const xLabel = options.xLabel || '';
  const yLabel = options.yLabel || '';
  const defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'cyan', 'magenta'];
  const colors = options.colors || defaultColors;
  const horizontal = options.horizontal !== undefined ? options.horizontal : false;
  const boxWidth = options.boxWidth || 0.3;

  // 各データセットの統計値を計算（最小値、第1四分位点、中央値、第3四分位点、最大値）
  const boxPlotCommands = dataSets.map((dataset, index) => {
    const color = colors[index % colors.length];
    const sortedData = [...dataset.data].sort((a, b) => a - b);
    const min = sortedData[0];
    const max = sortedData[sortedData.length - 1];
    const q1 = sortedData[Math.floor(sortedData.length * 0.25)];
    const median = sortedData[Math.floor(sortedData.length * 0.5)];
    const q3 = sortedData[Math.floor(sortedData.length * 0.75)];

    // 水平または垂直方向の箱ひげ図
    if (horizontal) {
      return `    \\addplot+[
      boxplot prepared={
        median=${median},
        upper quartile=${q3},
        lower quartile=${q1},
        upper whisker=${max},
        lower whisker=${min}
      },
      fill=${color},
      opacity=0.7,
      boxplot/box width=${boxWidth}
    ] coordinates {};
    \\addlegendentry{${dataset.label}}`;
    } else {
      return `    \\addplot+[
      boxplot prepared={
        median=${median},
        upper quartile=${q3},
        lower quartile=${q1},
        upper whisker=${max},
        lower whisker=${min}
      },
      fill=${color},
      opacity=0.7,
      boxplot/box width=${boxWidth}
    ] coordinates {};
    \\addlegendentry{${dataset.label}}`;
    }
  }).join('\n');

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    ${horizontal ? 'boxplot/horizontal=true,' : ''}
    boxplot/draw direction=${horizontal ? 'x' : 'y'},
    legend style={at={(0.5,1.05)}, anchor=south},
    legend columns=${dataSets.length}
  ]
${boxPlotCommands}
  \\end{axis}
\\end{tikzpicture}
`;
}

/**
 * 散布図を生成するための関数
 * @param dataSets - データセットの配列 [{label: string, data: [x, y][]}]
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generateScatterPlot(
  dataSets: Array<{
    label: string;
    data: Array<[number, number]>;
    markerStyle?: string;
  }>,
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    grid?: boolean;
    legendPosition?: string;
    regression?: boolean;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 6;
  const title = options.title || '散布図';
  const xLabel = options.xLabel || 'X軸';
  const yLabel = options.yLabel || 'Y軸';
  const defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'cyan', 'magenta'];
  const colors = options.colors || defaultColors;
  const grid = options.grid !== undefined ? options.grid : true;
  const legendPosition = options.legendPosition || 'north east';
  const regression = options.regression !== undefined ? options.regression : false;

  // X軸とY軸の範囲設定
  let xValues: number[] = [];
  let yValues: number[] = [];
  dataSets.forEach(dataset => {
    dataset.data.forEach(point => {
      xValues.push(point[0]);
      yValues.push(point[1]);
    });
  });

  const xMin = options.xMin !== undefined ? options.xMin : Math.min(...xValues) - 1;
  const xMax = options.xMax !== undefined ? options.xMax : Math.max(...xValues) + 1;
  const yMin = options.yMin !== undefined ? options.yMin : Math.min(...yValues) - 1;
  const yMax = options.yMax !== undefined ? options.yMax : Math.max(...yValues) + 1;

  // データセットからTeXコードを生成
  let plotCommands = '';

  dataSets.forEach((dataset, index) => {
    const color = colors[index % colors.length];
    const markerStyle = dataset.markerStyle || 'mark=*';
    
    const coordinates = dataset.data.map(point => `(${point[0]},${point[1]})`).join(' ');
    
    plotCommands += `    \\addplot[${color}, ${markerStyle}, only marks] coordinates {${coordinates}};
    \\addlegendentry{${dataset.label}}\n`;

    // 回帰直線を追加（オプション）
    if (regression) {
      const { slope, intercept } = calculateLinearRegression(dataset.data);
      plotCommands += `    \\addplot[${color}, domain=${xMin}:${xMax}] {${slope}*x + ${intercept}};
    \\addlegendentry{${dataset.label}の回帰直線}\n`;
    }
  });

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    xmin=${xMin},
    xmax=${xMax},
    ymin=${yMin},
    ymax=${yMax},
    ${grid ? 'grid=both,' : ''}
    legend pos=${legendPosition},
    legend style={nodes={scale=0.8, transform shape}}
  ]
${plotCommands}
  \\end{axis}
\\end{tikzpicture}
`;
}

/**
 * 線形回帰を計算するヘルパー関数
 * @param data - データポイントの配列 [x, y]
 * @returns 傾きと切片
 */
function calculateLinearRegression(data: Array<[number, number]>): { slope: number; intercept: number } {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * 3Dサーフェスプロットを生成するための関数（pgfplotsの3D機能を使用）
 * @param func - 数式文字列（xとyの関数）
 * @param options - グラフのオプション設定
 * @returns TeXコード文字列
 */
export function generate3DSurfacePlot(
  func: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    zLabel?: string;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    zMin?: number;
    zMax?: number;
    colormap?: string;
    samples?: number;
  } = {}
): string {
  // デフォルト値の設定
  const width = options.width || 10;
  const height = options.height || 10;
  const title = options.title || '3Dサーフェスプロット';
  const xLabel = options.xLabel || 'X';
  const yLabel = options.yLabel || 'Y';
  const zLabel = options.zLabel || 'Z';
  const xMin = options.xMin !== undefined ? options.xMin : -5;
  const xMax = options.xMax !== undefined ? options.xMax : 5;
  const yMin = options.yMin !== undefined ? options.yMin : -5;
  const yMax = options.yMax !== undefined ? options.yMax : 5;
  const zMin = options.zMin;
  const zMax = options.zMax;
  const colormap = options.colormap || 'hot';
  const samples = options.samples || 25;

  // TeXコードの構築
  return `
\\begin{tikzpicture}
  \\begin{axis}[
    width=${width}cm,
    height=${height}cm,
    title={${title}},
    xlabel={${xLabel}},
    ylabel={${yLabel}},
    zlabel={${zLabel}},
    xmin=${xMin},
    xmax=${xMax},
    ymin=${yMin},
    ymax=${yMax},
    ${zMin !== undefined ? `zmin=${zMin},` : ''}
    ${zMax !== undefined ? `zmax=${zMax},` : ''}
    view={30}{30},
    colormap/${colormap},
    colorbar,
    colorbar style={
      title={値}
    },
    samples=${samples}
  ]
    \\addplot3[
      surf,
      domain=${xMin}:${xMax},
      domain y=${yMin}:${yMax},
      samples=${samples},
      samples y=${samples},
    ] 
    {${func}};
  \\end{axis}
\\end{tikzpicture}
`;
} 