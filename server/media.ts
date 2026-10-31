/**
 * 사진 올리기 — 글에 붙는 학생 본인의 사진 (2026-10-30 사장님 결정: 샘플 사진 대신 진짜 올리기).
 * - 휴대폰이 올리기 전에 긴 변 1600px·WebP/JPEG 로 줄여 보낸다. 다시 그리면서 위치정보(EXIF)도 빠진다 (src/lib/photoUpload.ts)
 * - 서버는 파일 앞부분(매직 바이트)으로 JPEG·PNG·WebP 만 받고, 한 장 1.2MB, 한 사람 하루 40장까지
 * - 사진은 스냅샷 밖 media 표에 두고, 주소는 짐작할 수 없는 긴 id (/api/media/<id>) — 계정을 지우면 같이 지운다
 */
import { randomBytes } from 'node:crypto';
import type { MediaFile } from './store';
import type { ID } from '@core/types';

export const MAX_MEDIA_BYTES = 1_200_000;
export const MAX_MEDIA_PER_DAY = 40;

/** 파일 내용으로 본 종류 — 이름표(mime)를 믿지 않는다 */
export function sniffImage(b: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** base64(또는 data: URL) → 받을 수 있는 사진이면 저장할 MediaFile, 아니면 사람이 읽는 이유 */
export function acceptUpload(ownerId: string, raw: unknown, now = new Date()): { file: MediaFile } | { error: string } {
  if (typeof raw !== 'string' || !raw) return { error: 'No photo.' };
  const b64 = raw.replace(/^data:[^,]*,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'That file couldn’t be read.' };
  const data = Buffer.from(b64, 'base64');
  if (data.length > MAX_MEDIA_BYTES) return { error: 'Photo is too large.' };
  const mime = sniffImage(data);
  if (!mime) return { error: 'Only JPEG, PNG or WebP photos.' };
  return { file: { id: randomBytes(12).toString('hex'), ownerId, mime, data, createdAt: now.toISOString() } };
}

/** 오늘(UTC 0시부터) — 하루 한도를 세는 시작점 */
export const dayStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

/**
 * 이 사진을 지금 보여 줘도 되나 — 사진 주소만 알면 열리므로, 글이 지워지거나(운영자·작성자·계정 삭제) 신고로 숨겨지거나
 * 작성자가 정지되면 사진도 닫는다. 아직 글에 붙기 전(쓰는 중 미리보기)인 사진은 올린 지 2시간 동안만 — 갓 올린 글을 지워도 사진은 늦어도 2시간 뒤 닫힌다.
 */
export function mediaVisible(id: string, uploadedAt: string, posts: { authorId?: ID; media: { url?: string }[]; id: ID }[], blocked: { hidden: Map<ID, ID>; suspended: Set<ID> }, now = new Date()): boolean {
  const url = `api/media/${id}`;
  const using = posts.filter((p) => p.media.some((m) => m.url === url));
  if (!using.length) return now.getTime() - Date.parse(uploadedAt) < 2 * 3600_000;
  return using.some((p) => !blocked.hidden.has(p.id) && !(p.authorId && blocked.suspended.has(p.authorId)));
}
