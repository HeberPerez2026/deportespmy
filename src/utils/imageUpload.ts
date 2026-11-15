export interface ImageUploadOptions {
  maxDimension?: number;
  quality?: number;
  maxDataUrlLength?: number;
  maxInputSizeMB?: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates and compresses an image File into a lightweight JPEG Data URL
 * suitable for storing safely in Firestore documents (< 1 MB total doc limit).
 */
export async function processImageUpload(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const {
    maxDimension = 1000,
    quality = 0.76,
    maxDataUrlLength = 240000,
    maxInputSizeMB = 8,
  } = options;

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usá imágenes JPG, PNG o WEBP.');
  }

  if (file.size > maxInputSizeMB * 1024 * 1024) {
    throw new Error(`La imagen supera el máximo de ${maxInputSizeMB} MB.`);
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    image.src = rawDataUrl;
  });

  const renderCompressed = (dim: number, q: number): string => {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > dim || height > dim) {
      if (width >= height) {
        height = Math.round((height * dim) / width);
        width = dim;
      } else {
        width = Math.round((width * dim) / height);
        height = dim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', q);
  };

  let output = renderCompressed(maxDimension, quality);
  if (output.length > maxDataUrlLength) {
    output = renderCompressed(820, 0.62);
  }
  if (output.length > maxDataUrlLength) {
    output = renderCompressed(640, 0.52);
  }

  if (output.length > 340000) {
    throw new Error('La imagen sigue siendo demasiado pesada luego de comprimir. Probá con otra más liviana.');
  }

  return output;
}
