import * as pdfjsLib from 'pdfjs-dist';

// Initialize the worker from CDN to avoid Next.js bundling issues
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function convertPdfToImages(file: File, maxDim = 1200, quality = 0.8): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
  } catch (err) {
    const error = err as { name?: string };
    if (error && error.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    throw err;
  }
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewportDefault = page.getViewport({ scale: 1.0 });
    
    // Direct scale calculation to target maximum dimension in a single pass
    const currentMax = Math.max(viewportDefault.width, viewportDefault.height);
    const scale = currentMax > maxDim ? maxDim / currentMax : 1.0;
    
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    
    // We export as jpeg at requested quality
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    imageUrls.push(dataUrl);
  }

  return imageUrls;
}

export function resizeImage(dataUrl: string, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(dataUrl);
    }
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

export async function processFileToImages(file: File, maxDim = 1200, quality = 0.8): Promise<string[]> {
  if (file.type === 'application/pdf') {
    return convertPdfToImages(file, maxDim, quality);
  } else if (file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return [await resizeImage(base64, maxDim, quality)];
  }
  return [];
}

export async function getPdfPageCount(file: File): Promise<number> {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return 1;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (err) {
    console.error('Error reading PDF page count:', err);
    return 1;
  }
}

export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return '';
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    if (pdf.numPages === 0) return '';
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    return textContent.items.map((item) => {
      const textItem = item as { str?: string };
      return textItem.str || '';
    }).join(' ').toLowerCase();
  } catch (err) {
    console.error('Error extracting PDF text:', err);
    return '';
  }
}

export async function checkPdfSwapLocally(qpFile: File, ansFile: File): Promise<{ swapped: boolean; reason?: string }> {
  // 1. Filename keyword check (catches instant swaps)
  const qpName = qpFile.name.toLowerCase();
  const ansName = ansFile.name.toLowerCase();

  const ansHasQpName = ansName.includes('question') || ansName.includes(' qp') || ansName.endsWith('qp.pdf') || ansName.includes('paper');
  const qpHasAnsName = qpName.includes('answer') || qpName.includes('ans_') || qpName.endsWith('ans.pdf') || qpName.includes('sheet');

  if (ansHasQpName && qpHasAnsName) {
    return {
      swapped: true,
      reason: 'Mismatched Files: The Question Paper and Student Answer Sheet appear to be swapped. Please upload them in the correct slots.'
    };
  }

  // 2. Text Content check
  const qpText = await extractPdfText(qpFile);
  const ansText = await extractPdfText(ansFile);

  const strongQpKeywords = ['maximum marks', 'max marks', 'time allowed', 'duration:', 'question paper', 'marks:', 'marks ]'];
  const generalKeywords = ['question', 'marks', 'exam', 'section', 'test'];

  let ansStrongCount = 0;
  strongQpKeywords.forEach(kw => {
    if (ansText.includes(kw)) ansStrongCount++;
  });

  let qpStrongCount = 0;
  strongQpKeywords.forEach(kw => {
    if (qpText.includes(kw)) qpStrongCount++;
  });

  let ansGeneralCount = 0;
  generalKeywords.forEach(kw => {
    if (ansText.includes(kw)) ansGeneralCount++;
  });

  let qpGeneralCount = 0;
  generalKeywords.forEach(kw => {
    if (qpText.includes(kw)) qpGeneralCount++;
  });

  if (ansStrongCount > qpStrongCount && ansStrongCount >= 1) {
    return {
      swapped: true,
      reason: 'Mismatched Files: The Question Paper and Student Answer Sheet appear to be swapped. Please check and upload them in the correct slots.'
    };
  }

  if (ansGeneralCount > qpGeneralCount + 1 && ansGeneralCount >= 2) {
    return {
      swapped: true,
      reason: 'Mismatched Files: The Question Paper and Student Answer Sheet appear to be swapped. Please check and upload them in the correct slots.'
    };
  }

  return { swapped: false };
}
