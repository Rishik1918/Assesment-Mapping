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

export async function convertPdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    // Render at a reasonable scale (1.5) for text extraction accuracy and visibility
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    
    // We export as jpeg to reduce base64 size significantly compared to png
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    imageUrls.push(dataUrl);
  }

  return imageUrls;
}

export function resizeImage(dataUrl: string, maxDim = 1200): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
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

export async function processFileToImages(file: File): Promise<string[]> {
  if (file.type === 'application/pdf') {
    const images = await convertPdfToImages(file);
    // Resize each page image to optimize network transfer and speed up Gemini processing
    return Promise.all(images.map(img => resizeImage(img, 1200)));
  } else if (file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return [await resizeImage(base64, 1200)];
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
