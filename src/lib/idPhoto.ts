import { ID_PHOTO_MAX_BYTES, ID_PHOTO_MAX_SIDE } from '@core/lib/verification';

/**
 * Student ID photo → a JPEG data: URL the server takes (server/idverify.ts accepts JPEG only).
 * Redrawing on a canvas drops EXIF (location, device) — the server strips metadata again. Longest side
 * ID_PHOTO_MAX_SIDE; the quality steps down until it fits under the server limit.
 */
export async function shrinkIdPhoto(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('not an image');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, ID_PHOTO_MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  for (const q of [0.85, 0.72, 0.6, 0.45]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length * 0.75 <= ID_PHOTO_MAX_BYTES * 0.95) return url;
  }
  throw new Error('too large');
}
