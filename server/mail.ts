/**
 * 인증 코드 메일 발송.
 * - `RESEND_API_KEY` 가 있으면 Resend HTTP API 로 보낸다 (`MAIL_FROM` 필요, 예: "AroundU <login@yourdomain.com>")
 * - 없으면 콘솔에 찍고, 응답 힌트에 코드를 담아 돌려준다 (개발·데모용)
 */
export interface MailResult { sent: boolean; devCode?: string }

export async function sendCodeMail(to: string, code: string, lang: 'ko' | 'en'): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const subject = lang === 'ko' ? `[AroundU] 인증 코드 ${code}` : `[AroundU] Your verification code: ${code}`;
  const text = lang === 'ko'
    ? `AroundU 인증 코드는 ${code} 입니다. 10분 안에 입력해주세요.\n본인이 요청하지 않았다면 이 메일을 무시하세요.`
    : `Your AroundU verification code is ${code}. It expires in 10 minutes.\nIf you didn't request this, you can ignore this email.`;

  if (!key || !from) {
    console.log(`[mail] (not configured) code for ${to}: ${code}`);
    return { sent: false, devCode: process.env.HIDE_DEV_CODE === '1' ? undefined : code };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    console.error('[mail] resend failed', res.status, await res.text().catch(() => ''));
    return { sent: false };
  }
  return { sent: true };
}

/** 신고 알림 — 운영자(SUPPORT_EMAIL)에게 바로 알린다. 메일이 설정되지 않았으면 콘솔에만 */
export async function sendReportMail(summary: string): Promise<void> {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM, to = process.env.SUPPORT_EMAIL;
  console.log(`[report] ${summary}`);
  if (!key || !from || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: '[AroundU] 새 신고 / New report', text: `${summary}\n\n24시간 안에 확인해주세요: GET /api/admin/reports (x-admin-token)` }),
  }).catch((e) => console.error('[report] mail failed', e));
}
