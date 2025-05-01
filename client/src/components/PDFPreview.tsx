import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import './PDFPreview.css';

// PDF.jsワーカーのパスをアプリケーションのpublicディレクトリに設定
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// PDFプログレス型定義
interface PDFProgressData {
  loaded: number;
  total: number;
}

interface PDFPreviewProps {
  pdfPath: string | null | undefined;
}

/**
 * PDFプレビューコンポーネント
 * PDF.jsを使用してPDFを表示し、保存機能を提供
 */
const PDFPreview: React.FC<PDFPreviewProps> = ({ pdfPath }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.75);
  const [retryCount, setRetryCount] = useState<number>(0);

  // レンダリング関数をuseCallbackでメモ化
  const renderPage = useCallback(async (pageNumber: number, currentScale: number) => {
    if (!canvasRef.current || !pdfDocRef.current) return;

    try {
      setLoading(true);
      console.log(`ページ ${pageNumber} をレンダリング中... スケール: ${currentScale}`);
      const page = await pdfDocRef.current.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // デバイスのピクセル比を取得
      const outputScale = window.devicePixelRatio || 1;

      // ビューポートを計算
      const viewport = page.getViewport({ scale: currentScale });
      
      // キャンバスサイズをピクセル比を考慮して設定
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      
      // キャンバスのスタイルサイズを実際のビューポートサイズに設定（横方向も正確に反映）
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      
      // 正確なスケーリングのためにキャンバスのスタイルをリセット
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = 'none';
      canvas.style.position = 'relative'; // 位置調整を追加

      // コンテキストを初期化
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // コンテキストのスケーリング
      context.scale(outputScale, outputScale);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      console.log(`ページ ${pageNumber} をレンダリング完了 (スケール: ${currentScale}, キャンバスサイズ: ${canvas.width}x${canvas.height}, 表示サイズ: ${canvas.style.width}x${canvas.style.height})`);
    } catch (e) {
      console.error('Error rendering PDF page:', e);
      setError('PDFページのレンダリングに失敗しました。' + (e instanceof Error ? e.message : '不明なエラー'));
    } finally {
      setLoading(false);
    }
  }, []);

  // PDFのロード
  useEffect(() => {
    if (!pdfPath) {
      setPdf(null);
      pdfDocRef.current = null;
      setNumPages(0);
      setCurrentPage(1);
      setError(null);
      return;
    }

    let mounted = true;
    const loadPDF = async () => {
      try {
        setError(null);
        setLoading(true);
        console.log('PDF読み込み開始:', pdfPath);
        
        // 確実にURLを構築
        const pdfUrl = pdfPath.startsWith('http') || pdfPath.startsWith('/') 
          ? pdfPath 
          : `/api/pdf/${pdfPath}`;
        
        console.log('使用するPDF URL:', pdfUrl);
        
        // PDFの読み込み
        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        // PDFロード中の状態更新
        loadingTask.onProgress = (progress: PDFProgressData) => {
          if (mounted) {
            console.log(`PDF読み込み進捗: ${Math.round(progress.loaded / progress.total * 100)}%`);
          }
        };
        
        const pdfDocument = await loadingTask.promise;
        console.log('PDF読み込み成功:', pdfDocument.numPages, 'ページ');
        
        if (mounted) {
          setPdf(pdfDocument);
          pdfDocRef.current = pdfDocument;
          setNumPages(pdfDocument.numPages);
          setCurrentPage(1);
          setRetryCount(0); // 成功したらリトライカウントをリセット
          
          // 初回レンダリング
          setTimeout(() => {
            if (mounted) {
              renderPage(1, scale);
            }
          }, 100);
        }
      } catch (e) {
        if (mounted) {
          console.error('Error loading PDF:', e);
          const errorMessage = e instanceof Error ? e.message : '不明なエラー';
          setError(`PDFの読み込みに失敗しました。${errorMessage}`);
          
          // PDFが生成中または一時的にアクセスできない場合、数回自動再試行
          if (retryCount < 3) {
            console.log(`PDF読み込み再試行 (${retryCount + 1}/3)...`);
            setTimeout(() => {
              if (mounted) {
                setRetryCount(prev => prev + 1);
                loadPDF(); // 再試行
              }
            }, 2000); // 2秒待ってから再試行
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
    };
  }, [pdfPath, scale, renderPage, retryCount]);

  // ページまたはスケールが変更されたときに再レンダリング
  useEffect(() => {
    console.log(`スケールまたはページが変更されました: ページ=${currentPage}, スケール=${scale}`);
    if (pdfDocRef.current) {
      // 少し遅延させて確実にレンダリングする
      setTimeout(() => {
        renderPage(currentPage, scale);
      }, 50);
    }
  }, [currentPage, scale, renderPage]);

  const handlePreviousPage = () => {
    if (pdf && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pdf && currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prevScale => {
      const newScale = Math.min(prevScale + 0.25, 3.0);
      console.log(`ズームイン: ${prevScale} → ${newScale}`);
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale(prevScale => {
      const newScale = Math.max(prevScale - 0.25, 0.5);
      console.log(`ズームアウト: ${prevScale} → ${newScale}`);
      return newScale;
    });
  };

  const handleSavePDF = () => {
    if (pdfPath) {
      // 確実にURLを構築
      const pdfUrl = pdfPath.startsWith('http') || pdfPath.startsWith('/') 
        ? pdfPath 
        : `/api/pdf/${pdfPath}`;
      
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = pdfPath.split('/').pop() || 'mathproblem.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // PDFロード再試行ハンドラ
  const handleRetryLoading = () => {
    if (pdfPath) {
      setRetryCount(0); // リトライカウントをリセット
      setError(null);   // エラーをクリア
      // useEffectでpdfPathの依存関係が変わらないので、強制的に再レンダリング
      setPdf(null);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 100);
    }
  };

  return (
    <div className="pdf-preview-container">
      {pdfPath ? (
        <>
          <div className="pdf-canvas-container">
            {loading && (
              <div className="pdf-loading-overlay">
                <div className="pdf-spinner"></div>
                <div className="pdf-loading-text">PDFを読み込み中...</div>
              </div>
            )}
            
            {error ? (
              <div className="pdf-error">
                <div className="pdf-error-icon">⚠️</div>
                <div className="pdf-error-message">{error}</div>
                <button className="pdf-retry-button" onClick={handleRetryLoading}>
                  再読み込み
                </button>
              </div>
            ) : (
              <canvas ref={canvasRef} className={`pdf-canvas ${loading ? 'loading' : ''}`}></canvas>
            )}
          </div>
          
          <div className="pdf-controls">
            <div className="pdf-navigation">
              <button 
                className="nav-button" 
                onClick={handlePreviousPage} 
                disabled={!pdf || currentPage <= 1 || !!error}
              >
                前のページ
              </button>
              
              {pdf && (
                <span className="page-info">
                  {currentPage} / {numPages}
                </span>
              )}
              
              <button 
                className="nav-button" 
                onClick={handleNextPage} 
                disabled={!pdf || currentPage >= numPages || !!error}
              >
                次のページ
              </button>
            </div>
            
            <div className="pdf-zoom">
              <button 
                className="zoom-button" 
                onClick={handleZoomOut} 
                disabled={!pdf || scale <= 0.5 || !!error}
              >
                -
              </button>
              
              <span className="zoom-info">
                {Math.round(scale * 100)}%
              </span>
              
              <button 
                className="zoom-button" 
                onClick={handleZoomIn} 
                disabled={!pdf || scale >= 3.0 || !!error}
              >
                +
              </button>
            </div>
            
            <button 
              className="save-button" 
              onClick={handleSavePDF}
              disabled={!pdfPath || !!error}
            >
              PDFを保存
            </button>
          </div>
        </>
      ) : (
        <div className="pdf-empty-state">
          <div className="pdf-empty-icon">📄</div>
          <div className="pdf-empty-message">
            問題を生成すると、ここにPDFがプレビュー表示されます
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFPreview; 