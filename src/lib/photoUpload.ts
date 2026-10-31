/**
 * 올리기 전에 사진을 줄인다 — 긴 변 1600px, WebP(안 되면 JPEG). 캔버스에 다시 그리면 위치정보(EXIF GPS)·기기 정보가 빠진다.
 * 서버 한도(1.2MB, server/media.ts)를 넘으면 화질을 낮춰 다시 만든다.
 */
const MAX_SIDE = 1600;
const MAX_BYTES = 1_100_000;

export async function shrinkPhoto(file: File): Promise<string> {
  // 휴대폰 사진의 회전(EXIF Orientation)은 지키고, 나머지 메타데이터는 버린다
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    let url = canvas.toDataURL('image/webp', q);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', q); // WebP 를 못 만드는 브라우저
    if (url.length * 0.75 <= MAX_BYTES) return url;
  }
  throw new Error('too large');
}
