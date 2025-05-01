/**
 * 関数グラフ描画のためのヘルパー関数群
 */

/**
 * 関数グラフのオプション設定
 */
export interface FunctionGraphOptions {
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
  xtick?: string;
  ytick?: string;
  grid?: boolean;
  xlabel?: string;
  ylabel?: string;
  title?: string;
}

/**
 * 描画する関数の設定
 */
export interface FunctionConfig {
  expression: string;
  domain?: [number, number];
  style?: string;
  label?: string;
}

/**
 * ハイライトする点の設定
 */
export interface HighlightPoint {
  coordinates: [number, number];
  label?: string;
  style?: string;
}

/**
 * 塗りつぶし領域の設定
 */
export interface FillAreaConfig {
  between?: [string, string];  // 2つの関数式の間を塗りつぶす
  under?: string;              // 関数の下部を塗りつぶす
  over?: string;               // 関数の上部を塗りつぶす
  domain: [number, number];    // 塗りつぶす範囲のx軸の定義域
  style?: string;              // 塗りつぶしスタイル
}

/**
 * 基本的な関数グラフを生成する
 * @param functions 描画する関数の配列
 * @param highlightPoints ハイライトする点の配列（オプション）
 * @param fillAreas 塗りつぶし領域の配列（オプション）
 * @param options グラフのオプション設定
 * @returns TikZコード
 */
export function generateFunctionGraph(
  functions: FunctionConfig[],
  highlightPoints?: HighlightPoint[],
  fillAreas?: FillAreaConfig[],
  options: FunctionGraphOptions = {}
): string {
  // デフォルト値の設定
  const xmin = options.xmin ?? -5;
  const xmax = options.xmax ?? 5;
  const ymin = options.ymin ?? -5;
  const ymax = options.ymax ?? 5;
  const xtick = options.xtick ?? '{-5,...,5}';
  const ytick = options.ytick ?? '{-5,...,5}';
  const grid = options.grid ?? true;
  const xlabel = options.xlabel ?? '$x$';
  const ylabel = options.ylabel ?? '$y$';
  const title = options.title ?? '';

  // 基本的なグラフ設定
  let tikzCode = `\\begin{figure}[H]
  \\centering
  \\begin{tikzpicture}
    \\begin{axis}[
      axis lines=middle,
      xlabel=${xlabel},
      ylabel=${ylabel},
      ${title ? `title={${title}},` : ''}
      xmin=${xmin}, xmax=${xmax},
      ymin=${ymin}, ymax=${ymax},
      xtick=${xtick},
      ytick=${ytick},
      ${grid ? 'grid=both,' : ''}
      grid style={line width=.1pt, draw=gray!10},
      major grid style={line width=.2pt,draw=gray!50},
      axis lines=middle,
      minor tick num=5,
      enlargelimits={abs=0.5},
      axis line style={latex-latex},
      ticklabel style={font=\\tiny, fill=white},
      xlabel style={at={(ticklabel* cs:1)}, anchor=north west},
      ylabel style={at={(ticklabel* cs:1)}, anchor=south west}
    ]\n`;

  // 塗りつぶし領域の追加
  if (fillAreas && fillAreas.length > 0) {
    for (const fillArea of fillAreas) {
      const domainStr = `domain=${fillArea.domain[0]}:${fillArea.domain[1]}`;
      const fillStyle = fillArea.style || 'opacity=0.3, fill=blue!20';

      if (fillArea.between) {
        tikzCode += `    \\addplot[${fillStyle}] fill between[
          of=${functions.findIndex(f => f.expression === fillArea.between![0]) + 1} and ${functions.findIndex(f => f.expression === fillArea.between![1]) + 1},
          ${domainStr}
        ];\n`;
      } else if (fillArea.under) {
        const idx = functions.findIndex(f => f.expression === fillArea.under) + 1;
        tikzCode += `    \\addplot[${fillStyle}] fill between[
          of=${idx} and axis,
          ${domainStr}
        ];\n`;
      } else if (fillArea.over) {
        const idx = functions.findIndex(f => f.expression === fillArea.over) + 1;
        tikzCode += `    \\addplot[${fillStyle}] fill between[
          of=axis and ${idx},
          ${domainStr}
        ];\n`;
      }
    }
  }

  // 関数グラフの追加
  for (const [idx, func] of functions.entries()) {
    const domain = func.domain ? `domain=${func.domain[0]}:${func.domain[1]}` : `domain=${xmin}:${xmax}`;
    const style = func.style || 'thick, blue';
    const label = func.label || `$f_${idx+1}(x)=${func.expression}$`;

    tikzCode += `    \\addplot[${style}, ${domain}] {${func.expression}};\n`;
    if (label) {
      tikzCode += `    \\addlegendentry{${label}};\n`;
    }
  }

  // ハイライト点の追加
  if (highlightPoints && highlightPoints.length > 0) {
    for (const point of highlightPoints) {
      const style = point.style || 'mark=*, mark size=2pt, color=red';
      const [x, y] = point.coordinates;
      
      tikzCode += `    \\addplot[${style}] coordinates {(${x},${y})};\n`;
      
      if (point.label) {
        tikzCode += `    \\node[anchor=south west] at (axis cs:${x},${y}) {${point.label}};\n`;
      }
    }
  }

  // グラフ終了
  tikzCode += `    \\end{axis}
  \\end{tikzpicture}
\\end{figure}`;

  return tikzCode;
}

/**
 * 二次関数のグラフを生成する便利関数
 * @param a 二次の係数
 * @param b 一次の係数
 * @param c 定数項
 * @param options グラフオプション
 * @returns TikZコード
 */
export function generateQuadraticFunctionGraph(
  a: number,
  b: number,
  c: number,
  options: FunctionGraphOptions = {}
): string {
  // 標準形への変換（平方完成）
  const h = -b / (2 * a);
  const k = c - (b * b) / (4 * a);
  
  // 頂点の計算
  const vertex: HighlightPoint = {
    coordinates: [h, k],
    label: `頂点 $(${h}, ${k})$`,
    style: 'mark=*, mark size=3pt, color=red'
  };

  // 関数式の構築
  let expression = `${a}*x^2`;
  if (b !== 0) expression += `${b > 0 ? '+' : ''}${b}*x`;
  if (c !== 0) expression += `${c > 0 ? '+' : ''}${c}`;

  // x軸との交点を計算
  const discriminant = b * b - 4 * a * c;
  const highlightPoints: HighlightPoint[] = [vertex];
  
  if (discriminant >= 0) {
    const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    highlightPoints.push({
      coordinates: [x1, 0],
      label: `$x = ${x1.toFixed(2)}$`,
      style: 'mark=*, mark size=2pt, color=blue'
    });
    
    if (discriminant > 0) {
      highlightPoints.push({
        coordinates: [x2, 0],
        label: `$x = ${x2.toFixed(2)}$`,
        style: 'mark=*, mark size=2pt, color=blue'
      });
    }
  }

  // y軸との交点
  highlightPoints.push({
    coordinates: [0, c],
    label: `$y = ${c}$`,
    style: 'mark=*, mark size=2pt, color=green'
  });

  // グラフの表示範囲を調整
  const xRange = Math.max(5, Math.abs(h) * 2 + 2);
  const yMin = a > 0 ? Math.min(k - 1, -2) : Math.min(k - xRange * xRange * Math.abs(a) / 2, -2);
  const yMax = a > 0 ? Math.max(yMin + xRange * xRange * Math.abs(a), 10) : Math.max(k + 2, 10);

  const functionConfig: FunctionConfig = {
    expression,
    label: `$f(x) = ${a}x^2${b !== 0 ? `${b > 0 ? '+' : ''}${b}x` : ''}${c !== 0 ? `${c > 0 ? '+' : ''}${c}` : ''}$`
  };

  // グラフ描画
  return generateFunctionGraph(
    [functionConfig],
    highlightPoints,
    undefined,
    {
      ...options,
      xmin: -xRange,
      xmax: xRange,
      ymin: yMin,
      ymax: yMax,
      title: options.title || `二次関数 $f(x) = ${a}x^2${b !== 0 ? `${b > 0 ? '+' : ''}${b}x` : ''}${c !== 0 ? `${c > 0 ? '+' : ''}${c}` : ''}$`
    }
  );
}

/**
 * 二つの関数の交点を含むグラフを生成する
 * @param expr1 関数式1
 * @param expr2 関数式2
 * @param intersections 交点の座標 [[x1,y1], [x2,y2], ...]
 * @param options グラフオプション
 * @returns TikZコード
 */
export function generateFunctionIntersectionGraph(
  expr1: string,
  expr2: string,
  intersections: [number, number][],
  options: FunctionGraphOptions = {}
): string {
  // 関数の設定
  const functions: FunctionConfig[] = [
    {
      expression: expr1,
      style: 'thick, blue',
      label: `$f(x) = ${expr1}$`
    },
    {
      expression: expr2,
      style: 'thick, red',
      label: `$g(x) = ${expr2}$`
    }
  ];

  // 交点のハイライト
  const highlightPoints: HighlightPoint[] = intersections.map((coords, idx) => ({
    coordinates: coords,
    label: `交点${idx + 1} $(${coords[0].toFixed(2)}, ${coords[1].toFixed(2)})$`,
    style: 'mark=*, mark size=3pt, color=purple'
  }));

  // x, y軸の範囲を調整
  let xMin = Math.floor(Math.min(...intersections.map(i => i[0])) - 3);
  let xMax = Math.ceil(Math.max(...intersections.map(i => i[0])) + 3);
  let yMin = Math.floor(Math.min(...intersections.map(i => i[1])) - 3);
  let yMax = Math.ceil(Math.max(...intersections.map(i => i[1])) + 3);

  // 範囲が狭すぎる場合は広げる
  xMin = Math.min(xMin, -5);
  xMax = Math.max(xMax, 5);
  yMin = Math.min(yMin, -5);
  yMax = Math.max(yMax, 5);

  // グラフ描画
  return generateFunctionGraph(
    functions,
    highlightPoints,
    undefined,
    {
      ...options,
      xmin: xMin,
      xmax: xMax,
      ymin: yMin,
      ymax: yMax,
      title: options.title || `関数 $f(x) = ${expr1}$ と $g(x) = ${expr2}$ の交点`
    }
  );
} 