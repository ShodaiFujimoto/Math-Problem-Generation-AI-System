/**
 * 幾何図形描画のためのヘルパー関数群
 */

/**
 * 幾何図形のオプション設定
 */
export interface GeometricShapeOptions {
  gridVisible?: boolean;
  xmin?: number;
  xmax?: number;
  ymin?: number;
  ymax?: number;
  scale?: number;
  showOrigin?: boolean;
  showCoordinates?: boolean;
}

/**
 * 点の座標
 */
export type Point = [number, number];

/**
 * ラベルの設定
 */
export interface Label {
  position: Point;
  text: string;
  anchor?: string; // north, south, east, west, north east, etc.
}

/**
 * 寸法線の設定
 */
export interface Dimension {
  from: Point;
  to: Point;
  text: string;
  offset?: number; // 寸法線のオフセット（ピクセル単位）
}

/**
 * 基本図形要素の設定
 */
export interface ShapeElement {
  type: 'point' | 'line' | 'polygon' | 'circle' | 'arc' | 'angle' | 'text';
  style?: string;
  points?: Point[]; // 線と多角形用
  center?: Point; // 円と弧用
  radius?: number; // 円と弧用
  startAngle?: number; // 弧用
  endAngle?: number; // 弧用
  vertex?: Point; // 角度用
  angle1?: Point; // 角度用
  angle2?: Point; // 角度用
  text?: string; // テキスト用
  position?: Point; // テキスト用
}

/**
 * 基本的な幾何図形を生成する
 * @param elements 図形要素の配列
 * @param labels ラベルの配列（オプション）
 * @param dimensions 寸法線の配列（オプション）
 * @param options 図形のオプション設定
 * @returns TikZコード
 */
export function generateGeometricShape(
  elements: ShapeElement[],
  labels?: Label[],
  dimensions?: Dimension[],
  options: GeometricShapeOptions = {}
): string {
  // デフォルト値の設定
  const gridVisible = options.gridVisible ?? false;
  const xmin = options.xmin ?? -5;
  const xmax = options.xmax ?? 5;
  const ymin = options.ymin ?? -5;
  const ymax = options.ymax ?? 5;
  const scale = options.scale ?? 1;
  const showOrigin = options.showOrigin ?? false;
  const showCoordinates = options.showCoordinates ?? false;

  // 基本的な図形設定
  let tikzCode = `\\begin{figure}[H]
  \\centering
  \\begin{tikzpicture}[scale=${scale}]\n`;

  // グリッドを表示する場合
  if (gridVisible) {
    tikzCode += `    \\draw[gray!30, step=1] (${xmin},${ymin}) grid (${xmax},${ymax});\n`;
    // x軸とy軸
    tikzCode += `    \\draw[->] (${xmin},0) -- (${xmax},0) node[right] {$x$};\n`;
    tikzCode += `    \\draw[->] (0,${ymin}) -- (0,${ymax}) node[above] {$y$};\n`;
  }

  // 原点を表示する場合
  if (showOrigin) {
    tikzCode += `    \\filldraw[black] (0,0) circle (1.5pt) node[anchor=north east] {O};\n`;
  }

  // 図形要素の追加
  for (const element of elements) {
    switch (element.type) {
      case 'point':
        if (element.points && element.points.length > 0) {
          const [x, y] = element.points[0];
          const style = element.style || 'fill=black';
          tikzCode += `    \\filldraw[${style}] (${x},${y}) circle (1.5pt);\n`;
        }
        break;
        
      case 'line':
        if (element.points && element.points.length >= 2) {
          const style = element.style || 'thick';
          const points = element.points.map(([x, y]) => `(${x},${y})`).join(' -- ');
          tikzCode += `    \\draw[${style}] ${points};\n`;
        }
        break;
        
      case 'polygon':
        if (element.points && element.points.length >= 3) {
          const style = element.style || 'thick';
          const points = element.points.map(([x, y]) => `(${x},${y})`).join(' -- ');
          tikzCode += `    \\draw[${style}] ${points} -- cycle;\n`;
        }
        break;
        
      case 'circle':
        if (element.center && element.radius) {
          const [x, y] = element.center;
          const style = element.style || 'thick';
          tikzCode += `    \\draw[${style}] (${x},${y}) circle (${element.radius});\n`;
        }
        break;
        
      case 'arc':
        if (element.center && element.radius && element.startAngle !== undefined && element.endAngle !== undefined) {
          const [x, y] = element.center;
          const style = element.style || 'thick';
          tikzCode += `    \\draw[${style}] (${x},${y}) ++(${element.startAngle}:${element.radius}) arc (${element.startAngle}:${element.endAngle}:${element.radius});\n`;
        }
        break;
        
      case 'angle':
        if (element.vertex && element.angle1 && element.angle2) {
          const [vx, vy] = element.vertex;
          const [a1x, a1y] = element.angle1;
          const [a2x, a2y] = element.angle2;
          
          // 角度の計算
          const angleStart = Math.atan2(a1y - vy, a1x - vx) * 180 / Math.PI;
          const angleEnd = Math.atan2(a2y - vy, a2x - vx) * 180 / Math.PI;
          
          const style = element.style || 'draw=black, fill=gray!20, opacity=0.5';
          const radius = 0.5; // 角度弧の半径
          
          tikzCode += `    \\draw[${style}] (${vx},${vy}) ++(${angleStart}:${radius}) arc (${angleStart}:${angleEnd}:${radius});\n`;
        }
        break;
        
      case 'text':
        if (element.position && element.text) {
          const [x, y] = element.position;
          const style = element.style || '';
          tikzCode += `    \\node[${style}] at (${x},${y}) {${element.text}};\n`;
        }
        break;
    }
  }

  // 座標を表示する場合
  if (showCoordinates) {
    for (const element of elements) {
      if (element.type === 'point' && element.points && element.points.length > 0) {
        const [x, y] = element.points[0];
        tikzCode += `    \\node[anchor=north east] at (${x},${y}) {(${x},${y})};\n`;
      } else if (element.type === 'circle' && element.center) {
        const [x, y] = element.center;
        tikzCode += `    \\node[anchor=north east] at (${x},${y}) {(${x},${y})};\n`;
      }
    }
  }

  // ラベルの追加
  if (labels && labels.length > 0) {
    for (const label of labels) {
      const [x, y] = label.position;
      const anchor = label.anchor || 'center';
      tikzCode += `    \\node[anchor=${anchor}] at (${x},${y}) {${label.text}};\n`;
    }
  }

  // 寸法線の追加
  if (dimensions && dimensions.length > 0) {
    tikzCode += `    % 寸法線\n`;
    for (const dim of dimensions) {
      const [x1, y1] = dim.from;
      const [x2, y2] = dim.to;
      const offset = dim.offset ?? 0.3;
      
      // 寸法線の方向ベクトル
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // 垂直方向のオフセットベクトル
      const nx = -dy / length * offset;
      const ny = dx / length * offset;
      
      tikzCode += `    \\draw[|<->|] (${x1 + nx},${y1 + ny}) -- (${x2 + nx},${y2 + ny}) node[midway, fill=white, font=\\footnotesize] {${dim.text}};\n`;
    }
  }

  // 図形終了
  tikzCode += `  \\end{tikzpicture}
\\end{figure}`;

  return tikzCode;
}

/**
 * 円を生成する便利関数
 * @param center 中心座標
 * @param radius 半径
 * @param options オプション設定
 * @returns TikZコード
 */
export function generateCircle(
  center: Point,
  radius: number,
  options: {
    style?: string;
    showRadius?: boolean;
    showCenter?: boolean;
    showDiameter?: boolean;
    label?: string;
  } = {}
): string {
  const elements: ShapeElement[] = [
    {
      type: 'circle',
      center,
      radius,
      style: options.style || 'thick, draw=blue, fill=blue!10'
    }
  ];
  
  // 中心点を表示
  if (options.showCenter) {
    elements.push({
      type: 'point',
      points: [center],
      style: 'fill=black'
    });
  }
  
  const labels: Label[] = [];
  const dimensions: Dimension[] = [];
  
  // ラベルの追加
  if (options.label) {
    labels.push({
      position: [center[0], center[1]],
      text: options.label,
      anchor: 'center'
    });
  }
  
  // 中心点ラベル
  if (options.showCenter) {
    labels.push({
      position: [center[0], center[1]],
      text: 'O',
      anchor: 'south east'
    });
  }
  
  // 半径を表示
  if (options.showRadius) {
    const [cx, cy] = center;
    elements.push({
      type: 'line',
      points: [[cx, cy], [cx + radius, cy]],
      style: 'dashed, gray'
    });
    
    dimensions.push({
      from: [cx, cy],
      to: [cx + radius, cy],
      text: `$r = ${radius}$`,
      offset: 0.2
    });
  }
  
  // 直径を表示
  if (options.showDiameter) {
    const [cx, cy] = center;
    elements.push({
      type: 'line',
      points: [[cx - radius, cy], [cx + radius, cy]],
      style: 'dashed, gray'
    });
    
    dimensions.push({
      from: [cx - radius, cy],
      to: [cx + radius, cy],
      text: `$d = ${radius * 2}$`,
      offset: 0.2
    });
  }
  
  return generateGeometricShape(elements, labels, dimensions, {
    xmin: center[0] - radius - 1,
    xmax: center[0] + radius + 1,
    ymin: center[1] - radius - 1,
    ymax: center[1] + radius + 1
  });
}

/**
 * 三角形を生成する便利関数
 * @param points 3つの頂点座標
 * @param options オプション設定
 * @returns TikZコード
 */
export function generateTriangle(
  points: [Point, Point, Point],
  options: {
    style?: string;
    showAngles?: boolean;
    showSides?: boolean;
    labels?: [string, string, string];
  } = {}
): string {
  const elements: ShapeElement[] = [
    {
      type: 'polygon',
      points,
      style: options.style || 'thick, draw=blue, fill=blue!10'
    }
  ];
  
  const labels: Label[] = [];
  const dimensions: Dimension[] = [];
  
  // 頂点ラベル
  if (options.labels) {
    // 頂点A
    labels.push({
      position: points[0],
      text: options.labels[0],
      anchor: getAnchorForPoint(points[0], points)
    });
    
    // 頂点B
    labels.push({
      position: points[1],
      text: options.labels[1],
      anchor: getAnchorForPoint(points[1], points)
    });
    
    // 頂点C
    labels.push({
      position: points[2],
      text: options.labels[2],
      anchor: getAnchorForPoint(points[2], points)
    });
  }
  
  // 辺の長さを表示
  if (options.showSides) {
    // 辺AB
    dimensions.push({
      from: points[0],
      to: points[1],
      text: `$${calculateDistance(points[0], points[1]).toFixed(2)}$`
    });
    
    // 辺BC
    dimensions.push({
      from: points[1],
      to: points[2],
      text: `$${calculateDistance(points[1], points[2]).toFixed(2)}$`
    });
    
    // 辺CA
    dimensions.push({
      from: points[2],
      to: points[0],
      text: `$${calculateDistance(points[2], points[0]).toFixed(2)}$`
    });
  }
  
  // 角度を表示
  if (options.showAngles) {
    // 角A
    elements.push({
      type: 'angle',
      vertex: points[0],
      angle1: points[2],
      angle2: points[1]
    });
    
    // 角B
    elements.push({
      type: 'angle',
      vertex: points[1],
      angle1: points[0],
      angle2: points[2]
    });
    
    // 角C
    elements.push({
      type: 'angle',
      vertex: points[2],
      angle1: points[1],
      angle2: points[0]
    });
  }
  
  // 表示範囲の計算
  const xValues = points.map(p => p[0]);
  const yValues = points.map(p => p[1]);
  const xmin = Math.min(...xValues) - 1;
  const xmax = Math.max(...xValues) + 1;
  const ymin = Math.min(...yValues) - 1;
  const ymax = Math.max(...yValues) + 1;
  
  return generateGeometricShape(elements, labels, dimensions, {
    xmin,
    xmax,
    ymin,
    ymax
  });
}

/**
 * 四角形を生成する便利関数
 * @param points 4つの頂点座標
 * @param options オプション設定
 * @returns TikZコード
 */
export function generateQuadrilateral(
  points: [Point, Point, Point, Point],
  options: {
    style?: string;
    showAngles?: boolean;
    showSides?: boolean;
    labels?: [string, string, string, string];
  } = {}
): string {
  const elements: ShapeElement[] = [
    {
      type: 'polygon',
      points,
      style: options.style || 'thick, draw=blue, fill=blue!10'
    }
  ];
  
  const labels: Label[] = [];
  const dimensions: Dimension[] = [];
  
  // 頂点ラベル
  if (options.labels) {
    for (let i = 0; i < 4; i++) {
      labels.push({
        position: points[i],
        text: options.labels[i],
        anchor: getAnchorForPoint(points[i], points)
      });
    }
  }
  
  // 辺の長さを表示
  if (options.showSides) {
    for (let i = 0; i < 4; i++) {
      const nextIdx = (i + 1) % 4;
      dimensions.push({
        from: points[i],
        to: points[nextIdx],
        text: `$${calculateDistance(points[i], points[nextIdx]).toFixed(2)}$`
      });
    }
  }
  
  // 角度を表示
  if (options.showAngles) {
    for (let i = 0; i < 4; i++) {
      const prevIdx = (i + 3) % 4;
      const nextIdx = (i + 1) % 4;
      
      elements.push({
        type: 'angle',
        vertex: points[i],
        angle1: points[prevIdx],
        angle2: points[nextIdx]
      });
    }
  }
  
  // 表示範囲の計算
  const xValues = points.map(p => p[0]);
  const yValues = points.map(p => p[1]);
  const xmin = Math.min(...xValues) - 1;
  const xmax = Math.max(...xValues) + 1;
  const ymin = Math.min(...yValues) - 1;
  const ymax = Math.max(...yValues) + 1;
  
  return generateGeometricShape(elements, labels, dimensions, {
    xmin,
    xmax,
    ymin,
    ymax
  });
}

/**
 * 長方形を生成する便利関数
 * @param width 幅
 * @param height 高さ
 * @param position 左下隅の位置
 * @param options オプション設定
 * @returns TikZコード
 */
export function generateRectangle(
  width: number,
  height: number,
  position: Point = [0, 0],
  options: {
    style?: string;
    showDimensions?: boolean;
    labels?: [string, string, string, string];
  } = {}
): string {
  const [x, y] = position;
  const points: [Point, Point, Point, Point] = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height]
  ];
  
  const elements: ShapeElement[] = [
    {
      type: 'polygon',
      points,
      style: options.style || 'thick, draw=blue, fill=blue!10'
    }
  ];
  
  const labels: Label[] = [];
  const dimensions: Dimension[] = [];
  
  // 頂点ラベル
  if (options.labels) {
    // 左下
    labels.push({
      position: points[0],
      text: options.labels[0],
      anchor: 'south west'
    });
    
    // 右下
    labels.push({
      position: points[1],
      text: options.labels[1],
      anchor: 'south east'
    });
    
    // 右上
    labels.push({
      position: points[2],
      text: options.labels[2],
      anchor: 'north east'
    });
    
    // 左上
    labels.push({
      position: points[3],
      text: options.labels[3],
      anchor: 'north west'
    });
  }
  
  // 寸法を表示
  if (options.showDimensions) {
    // 幅
    dimensions.push({
      from: [x, y - 0.5],
      to: [x + width, y - 0.5],
      text: `$${width}$`
    });
    
    // 高さ
    dimensions.push({
      from: [x - 0.5, y],
      to: [x - 0.5, y + height],
      text: `$${height}$`
    });
  }
  
  return generateGeometricShape(elements, labels, dimensions, {
    xmin: x - 1,
    xmax: x + width + 1,
    ymin: y - 1,
    ymax: y + height + 1
  });
}

// ユーティリティ関数

/**
 * 2点間の距離を計算する
 * @param p1 点1
 * @param p2 点2
 * @returns 距離
 */
function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 点の位置に基づいて最適なアンカーを決定する
 * @param point 対象の点
 * @param allPoints すべての点
 * @returns アンカー方向
 */
function getAnchorForPoint(point: Point, allPoints: Point[]): string {
  const [x, y] = point;
  const xValues = allPoints.map(p => p[0]);
  const yValues = allPoints.map(p => p[1]);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  let anchor = '';
  
  // 垂直方向のアンカー
  if (y === yMin) {
    anchor += 'south';
  } else if (y === yMax) {
    anchor += 'north';
  }
  
  // 水平方向のアンカー
  if (x === xMin) {
    anchor += anchor.length > 0 ? ' west' : 'west';
  } else if (x === xMax) {
    anchor += anchor.length > 0 ? ' east' : 'east';
  }
  
  // デフォルトアンカー
  return anchor || 'center';
} 