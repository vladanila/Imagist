// engine.js - Client-Side Image Processing & Format Conversion Engine

/**
 * Applies visual filters onto an HTMLCanvasElement
 */
export function applyCanvasFilter(canvas, filterType, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  if (filterType === 'none') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  if (filterType === 'clean-signature') {
    const threshold = options.threshold || 170;
    const contrast = options.contrast || 1.3;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > threshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        let factor = (lum / threshold);
        let newR = Math.max(0, Math.min(255, (r - 128) * contrast + 128 * factor));
        let newG = Math.max(0, Math.min(255, (g - 128) * contrast + 128 * factor));
        let newB = Math.max(0, Math.min(255, (b - 128) * contrast + 128 * factor));

        data[i] = Math.min(newR, 80);
        data[i + 1] = Math.min(newG, 80);
        data[i + 2] = Math.min(newB, 100);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (filterType === 'enhance') {
    const contrast = 1.15;
    const brightness = 8;
    for (let i = 0; i < len; i += 4) {
      data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
    ctx.putImageData(imageData, 0, 0);
  } 
  else if (filterType === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Draws candidate Name and Date banner at the bottom of the photo
 */
export function drawNameDateStamp(canvas, candidateName, photoDate) {
  if (!candidateName && !photoDate) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const bannerHeight = Math.max(38, Math.round(h * 0.18));
  const bannerY = h - bannerHeight;

  // Solid white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bannerY, w, bannerHeight);

  // Border separator
  ctx.fillStyle = '#1A1A1A';
  ctx.lineWidth = Math.max(1, Math.round(w * 0.003));
  ctx.strokeRect(0, bannerY, w, bannerHeight);

  // Dynamic font sizes
  const fontSize = Math.max(12, Math.round(bannerHeight * 0.32));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  if (candidateName && photoDate) {
    const lineSpacing = bannerHeight / 3;
    ctx.fillText(candidateName.toUpperCase(), w / 2, bannerY + lineSpacing * 1.1);
    ctx.font = `600 ${Math.round(fontSize * 0.9)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(photoDate, w / 2, bannerY + lineSpacing * 2.1);
  } else if (candidateName) {
    ctx.fillText(candidateName.toUpperCase(), w / 2, bannerY + bannerHeight / 2);
  } else if (photoDate) {
    ctx.fillText(photoDate, w / 2, bannerY + bannerHeight / 2);
  }
}

/**
 * Helper to convert canvas to blob with given format and quality
 */
export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Helper to convert canvas to PDF Blob using jsPDF
 */
export function canvasToPdfBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => {
    try {
      const { jsPDF } = window.jspdf;
      const w = canvas.width;
      const h = canvas.height;
      const orientation = w > h ? 'l' : 'p';
      
      const doc = new jsPDF({
        orientation,
        unit: 'px',
        format: [w, h],
        hotfixes: ['px_scaling']
      });

      const imgData = canvas.toDataURL('image/jpeg', quality);
      doc.addImage(imgData, 'JPEG', 0, 0, w, h);
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (e) {
      console.error('PDF generation error:', e);
      resolve(null);
    }
  });
}

/**
 * Iterative binary-search compression to hit target file size with format support
 */
export async function optimizeImageToTargetSize(sourceCanvas, targetWidth, targetHeight, minKb, maxKb, options = {}) {
  let curWidth = targetWidth;
  let curHeight = targetHeight;
  const targetFormat = options.format || 'jpeg'; // 'jpeg', 'png', 'webp', 'pdf'

  let workingCanvas = document.createElement('canvas');
  workingCanvas.width = curWidth;
  workingCanvas.height = curHeight;
  let ctx = workingCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill pure white background for JPEG / PDF to prevent transparent pixels turning black
  if (targetFormat === 'jpeg' || targetFormat === 'pdf') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, curWidth, curHeight);
  }

  ctx.drawImage(sourceCanvas, 0, 0, curWidth, curHeight);

  if (options.filter && options.filter !== 'none') {
    applyCanvasFilter(workingCanvas, options.filter, options.filterOptions);
  }

  if (options.addNameDate && (options.candidateName || options.photoDate)) {
    drawNameDateStamp(workingCanvas, options.candidateName, options.photoDate);
  }

  // Handle PDF
  if (targetFormat === 'pdf') {
    const pdfBlob = await canvasToPdfBlob(workingCanvas, 0.92);
    const sizeKb = pdfBlob ? (pdfBlob.size / 1024).toFixed(1) : 0;
    return {
      blob: pdfBlob,
      dataUrl: workingCanvas.toDataURL('image/jpeg', 0.9), // preview as image
      finalCanvas: workingCanvas,
      width: curWidth,
      height: curHeight,
      sizeKb: parseFloat(sizeKb),
      format: 'pdf',
      extension: 'pdf',
      mimeType: 'application/pdf'
    };
  }

  // Handle PNG (lossless format)
  if (targetFormat === 'png') {
    const pngBlob = await canvasToBlob(workingCanvas, 'image/png');
    const sizeKb = pngBlob ? (pngBlob.size / 1024).toFixed(1) : 0;
    return {
      blob: pngBlob,
      dataUrl: pngBlob ? URL.createObjectURL(pngBlob) : null,
      finalCanvas: workingCanvas,
      width: curWidth,
      height: curHeight,
      sizeKb: parseFloat(sizeKb),
      format: 'png',
      extension: 'png',
      mimeType: 'image/png'
    };
  }

  // Handle JPEG & WEBP with binary search target size optimization
  const mimeType = targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
  const targetMinBytes = (minKb || 5) * 1024;
  const targetMaxBytes = (maxKb || 50) * 1024;

  let bestBlob = null;
  let low = 0.15;
  let high = 0.98;

  for (let iter = 0; iter < 7; iter++) {
    let midQuality = (low + high) / 2;
    let blob = await canvasToBlob(workingCanvas, mimeType, midQuality);

    if (!blob) break;
    bestBlob = blob;

    if (blob.size > targetMaxBytes) {
      high = midQuality - 0.05;
    } else if (blob.size < targetMinBytes) {
      low = midQuality + 0.05;
    } else {
      break;
    }
    if (high < low) break;
  }

  // Progressive downscale if still exceeds maxKb
  let downscaleTries = 0;
  while (bestBlob && bestBlob.size > targetMaxBytes && downscaleTries < 5) {
    downscaleTries++;
    curWidth = Math.round(curWidth * 0.90);
    curHeight = Math.round(curHeight * 0.90);

    let downCanvas = document.createElement('canvas');
    downCanvas.width = curWidth;
    downCanvas.height = curHeight;
    let dctx = downCanvas.getContext('2d');
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';

    if (targetFormat === 'jpeg' || targetFormat === 'pdf') {
      dctx.fillStyle = '#FFFFFF';
      dctx.fillRect(0, 0, curWidth, curHeight);
    }

    dctx.drawImage(sourceCanvas, 0, 0, curWidth, curHeight);

    if (options.filter && options.filter !== 'none') {
      applyCanvasFilter(downCanvas, options.filter, options.filterOptions);
    }
    if (options.addNameDate && (options.candidateName || options.photoDate)) {
      drawNameDateStamp(downCanvas, options.candidateName, options.photoDate);
    }

    workingCanvas = downCanvas;
    bestBlob = await canvasToBlob(workingCanvas, mimeType, 0.70);
  }

  const finalSizeBytes = bestBlob ? bestBlob.size : 0;
  const finalSizeKb = (finalSizeBytes / 1024).toFixed(1);

  return {
    blob: bestBlob,
    dataUrl: bestBlob ? URL.createObjectURL(bestBlob) : null,
    finalCanvas: workingCanvas,
    width: curWidth,
    height: curHeight,
    sizeKb: parseFloat(finalSizeKb),
    format: targetFormat,
    extension: targetFormat === 'jpeg' ? 'jpg' : targetFormat,
    mimeType
  };
}

/**
 * Standalone direct image format converter (Zero cropping / zero forced resizing)
 */
export async function convertImageDirectly(imageElementOrCanvas, targetFormat = 'jpeg', quality = 0.92) {
  let canvas;
  if (imageElementOrCanvas instanceof HTMLCanvasElement) {
    canvas = imageElementOrCanvas;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.width;
    canvas.height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.height;
    const ctx = canvas.getContext('2d');
    
    // For JPEG/PDF, fill white background in case of transparent PNG/WEBP
    if (targetFormat === 'jpeg' || targetFormat === 'pdf') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(imageElementOrCanvas, 0, 0);
  }

  if (targetFormat === 'pdf') {
    const pdfBlob = await canvasToPdfBlob(canvas, quality);
    return {
      blob: pdfBlob,
      dataUrl: pdfBlob ? URL.createObjectURL(pdfBlob) : null,
      previewUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: canvas.width,
      height: canvas.height,
      sizeKb: pdfBlob ? (pdfBlob.size / 1024).toFixed(1) : 0,
      extension: 'pdf',
      formatName: 'PDF'
    };
  }

  let mimeType = 'image/jpeg';
  let ext = 'jpg';
  let fmtName = 'JPEG';

  if (targetFormat === 'png') {
    mimeType = 'image/png';
    ext = 'png';
    fmtName = 'PNG';
  } else if (targetFormat === 'webp') {
    mimeType = 'image/webp';
    ext = 'webp';
    fmtName = 'WEBP';
  }

  const blob = await canvasToBlob(canvas, mimeType, quality);
  return {
    blob,
    dataUrl: blob ? URL.createObjectURL(blob) : null,
    previewUrl: blob ? URL.createObjectURL(blob) : null,
    width: canvas.width,
    height: canvas.height,
    sizeKb: blob ? (blob.size / 1024).toFixed(1) : 0,
    extension: ext,
    formatName: fmtName
  };
}
