/**
 * 스토어 등록에 필요한 공개 페이지 — 개인정보처리방침 · 이용약관 · 고객지원 · 계정 삭제 안내.
 * 앱스토어 Connect / Play Console 에 이 서버의 URL(예: https://<도메인>/privacy)을 그대로 넣는다.
 * 운영자 이름·연락처는 환경변수 OPERATOR_NAME · SUPPORT_EMAIL 로 바꾼다.
 */
export const LEGAL_PAGES = ['privacy', 'terms', 'support', 'delete-account'] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

const EFFECTIVE = '2026-10-01';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function ctx() {
  return {
    op: process.env.OPERATOR_NAME?.trim() || 'AroundU',
    mail: process.env.SUPPORT_EMAIL?.trim() || '',
  };
}

type Doc = { title: string; body: string };

function ko(page: LegalPage): Doc {
  const { op, mail } = ctx();
  const contact = mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : '앱 설정 › 고객지원';
  switch (page) {
    case 'privacy': return { title: '개인정보처리방침', body: `
<p>${esc(op)}(이하 "운영자")는 AroundU 앱과 웹(이하 "서비스")을 이용하는 분의 개인정보를 아래와 같이 처리합니다. 시행일: ${EFFECTIVE}</p>
<h2>1. 수집하는 정보</h2>
<ul>
<li><b>가입·로그인:</b> 학교 이메일 주소(로그인과 학교 인증에만 쓰며 다른 사용자에게 보이지 않아요), 학교, 인증 방법</li>
<li><b>프로필:</b> 이름(닉네임), 프로필 사진, 출생연도, 성별(선택), 전공·학년 또는 졸업연도, 거주·활동 도시(도시 단위, 주소는 받지 않아요), 관심사, 질문 답변, 하고 있는 일(선택), 연구 분야(선택)</li>
<li><b>이용 중 만드는 정보:</b> 글·댓글·사진, 모임·그룹 활동, 연결 요청과 한마디, 메시지, 신고·차단 기록, 시간표(선택)</li>
<li><b>자동 수집:</b> 접속 기록, 오류 기록. 정확한 위치(GPS)는 저장하지 않아요.</li>
</ul>
<h2>2. 이용 목적</h2>
<ul><li>회원 식별과 학교 인증</li><li>사람·모임 추천과 검색(추천 이유를 함께 보여줘요)</li><li>연결·메시지·모임 기능 제공</li><li>신고 처리, 부정 이용 방지, 서비스 개선</li></ul>
<h2>3. 공개 범위</h2>
<p>프로필은 설정 › 개인정보 공개 범위에서 정한 대상(전체 / 같은 학교·2촌 / 연결된 사람)에게만 자세히 보여요. 회사·도시·졸업연도·그룹은 항목마다 끌 수 있어요. 이메일 주소는 누구에게도 보이지 않아요.</p>
<h2>4. 보관과 삭제</h2>
<p>계정을 삭제하면 프로필·글·댓글·모임·연결 기록과 로그인 이메일을 바로 지워요. 상대방과 주고받은 메시지는 상대방 대화방에 "탈퇴한 사용자"로 남을 수 있어요. 법령상 보관이 필요한 기록은 그 기간 동안만 보관해요. 삭제 방법: 앱 설정 › 계정 삭제 (또는 <a href="/delete-account">계정 삭제 안내</a>).</p>
<h2>5. 처리 위탁·외부 전송</h2>
<ul><li>서버·데이터베이스 호스팅: Railway (미국)</li><li>인증 메일 발송: Resend (미국)</li></ul>
<p>개인정보를 판매하거나 광고 목적으로 제3자에게 제공하지 않아요.</p>
<h2>6. 이용자의 권리</h2>
<p>언제든 앱에서 내 정보를 보고 고치거나 지울 수 있고, 아래 연락처로 열람·정정·삭제·처리 정지를 요청할 수 있어요.</p>
<h2>7. 만 14세 미만</h2>
<p>서비스는 대학(원)생과 졸업생을 위한 것으로 만 14세 미만은 가입할 수 없어요.</p>
<h2>8. 문의</h2>
<p>개인정보 보호 책임자: ${esc(op)} · ${contact}</p>` };
    case 'terms': return { title: '이용약관', body: `
<p>시행일: ${EFFECTIVE}. AroundU(이하 "서비스")를 이용하면 아래 약관에 동의한 것으로 봐요.</p>
<h2>1. 서비스</h2><p>AroundU는 학교 인증을 바탕으로 사람을 발견하고, 연결하고, 모임을 만드는 서비스예요. 데이팅 서비스가 아니에요.</p>
<h2>2. 가입</h2><p>본인의 학교 이메일 또는 인증 수단으로 가입해야 하며, 다른 사람을 사칭할 수 없어요. 만 14세 미만은 가입할 수 없어요.</p>
<h2>3. 금지 행위 (무관용)</h2>
<ul><li>괴롭힘, 혐오·차별, 위협, 성적 콘텐츠, 불법 정보</li><li>스팸, 광고·영업 목적의 무분별한 연락, 사기</li><li>다른 사람의 개인정보(연락처·주소 등)를 동의 없이 올리는 것</li><li>사칭, 허위 정보</li></ul>
<p>이런 콘텐츠와 이용자는 무관용으로 처리해요. 신고가 들어오면 24시간 안에 검토하고, 위반 콘텐츠는 지우고 해당 계정을 이용 정지할 수 있어요.</p>
<h2>4. 신고와 차단</h2><p>사람·글·모임·요청 화면의 메뉴(⋯)에서 신고하거나 차단할 수 있어요. 차단하면 서로 보이지 않고 연락할 수 없어요.</p>
<h2>5. 콘텐츠</h2><p>내가 올린 콘텐츠의 권리는 나에게 있어요. 다만 서비스 제공(표시·추천)을 위해 필요한 범위에서 운영자가 사용할 수 있어요.</p>
<h2>6. 유료 기능</h2><p>사람을 만나는 기능(추천, 다른 학교 보기, 연결 요청, 모임, 메시지)은 무료예요. AroundU+ 같은 유료 기능은 결제 화면에 표시된 조건을 따르고, 구독 해지는 스토어 구독 관리에서 할 수 있어요.</p>
<h2>7. 책임</h2><p>오프라인 만남은 공개된 장소에서, 스스로 판단해 주세요. 운영자는 이용자 사이의 만남에서 생긴 문제에 대해 법이 정한 범위를 넘어 책임지지 않아요.</p>
<h2>8. 탈퇴</h2><p>앱 설정 › 계정 삭제에서 언제든 탈퇴할 수 있어요.</p>
<h2>9. 문의</h2><p>${esc(op)} · ${contact}</p>` };
    case 'support': return { title: '고객지원', body: `
<p>AroundU를 이용하면서 불편한 점이나 신고할 일이 있으면 알려주세요.</p>
<ul><li>연락처: ${contact}</li><li>앱 안에서: 사람·글·모임 화면의 ⋯ › 신고 / 차단</li><li>계정 삭제: 앱 설정 › 계정 삭제 · <a href="/delete-account">안내</a></li></ul>
<p><a href="/privacy">개인정보처리방침</a> · <a href="/terms">이용약관</a></p>` };
    case 'delete-account': return { title: '계정 삭제 안내', body: `
<p><b>앱에서 바로 삭제:</b> AroundU 앱 › 프로필 › 설정(톱니바퀴) › <b>계정 삭제</b> › 확인. 삭제는 즉시 처리돼요.</p>
<p><b>앱을 쓸 수 없다면:</b> 가입한 학교 이메일 주소에서 ${contact} 로 "계정 삭제 요청"이라고 보내주세요. 본인 확인 후 7일 안에 삭제해요.</p>
<h2>삭제되는 정보</h2><ul><li>프로필(사진·소개·질문 답변·관심사·지역·하는 일·연구 정보)</li><li>내가 쓴 글·댓글, 만든 모임, 참여 기록, 연결·팔로우·차단 기록, 저장한 검색</li><li>로그인 이메일과 로그인 기록</li></ul>
<h2>남는 정보</h2><ul><li>상대방과 주고받은 메시지는 상대방 대화방에 "탈퇴한 사용자"로 남을 수 있어요.</li><li>법령상 보관 의무가 있는 기록은 그 기간 동안만 보관 후 지워요.</li></ul>` };
  }
}

function en(page: LegalPage): Doc {
  const { op, mail } = ctx();
  const contact = mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : 'Settings › Support in the app';
  switch (page) {
    case 'privacy': return { title: 'Privacy Policy', body: `
<p>${esc(op)} ("we") processes personal information of people who use the AroundU app and website (the "Service") as described below. Effective: ${EFFECTIVE}</p>
<h2>1. What we collect</h2>
<ul><li><b>Sign-up & login:</b> school email address (used only for login and school verification; never shown to others), school, verification method</li>
<li><b>Profile:</b> name, photos, birth year, gender (optional), major and class year or graduation year, home and activity city (city level only — no street address), interests, prompt answers, what you do (optional), research field (optional)</li>
<li><b>Content you create:</b> posts, comments, photos, meetups and groups, connect requests and notes, messages, reports and blocks, timetable (optional)</li>
<li><b>Automatically:</b> access and error logs. We do not store precise (GPS) location.</li></ul>
<h2>2. How we use it</h2><ul><li>Identify accounts and verify schools</li><li>Recommend and search people and meetups (always with the reason)</li><li>Provide connections, messages and meetups</li><li>Handle reports, prevent abuse, improve the Service</li></ul>
<h2>3. Who can see your profile</h2><p>Your detailed profile is visible only to the audience you choose in Settings › Privacy (everyone / same school & 2nd-degree / connections). Company, city, graduation year and groups can each be hidden. Your email is never shown.</p>
<h2>4. Retention & deletion</h2><p>When you delete your account we immediately delete your profile, posts, comments, meetups, connections and login email. Messages you exchanged may remain in the other person's chat as "Deleted user". Records we are legally required to keep are kept only for that period. How: Settings › Delete account (or see <a href="/delete-account?lang=en">account deletion</a>).</p>
<h2>5. Service providers</h2><ul><li>Hosting & database: Railway (USA)</li><li>Verification email: Resend (USA)</li></ul><p>We do not sell personal information or share it for advertising.</p>
<h2>6. Your rights</h2><p>You can view, edit and delete your information in the app at any time, or contact us to access, correct, delete or restrict processing.</p>
<h2>7. Children</h2><p>The Service is for university students and alumni. You must be at least 14 (16 in the EU) to use it.</p>
<h2>8. Contact</h2><p>${esc(op)} · ${contact}</p>` };
    case 'terms': return { title: 'Terms of Use', body: `
<p>Effective: ${EFFECTIVE}. By using AroundU (the "Service") you agree to these terms.</p>
<h2>1. The Service</h2><p>AroundU helps verified students and alumni discover people, connect and meet up. It is not a dating service.</p>
<h2>2. Accounts</h2><p>Sign up with your own school email or verification method. Do not impersonate others. You must be at least 14 (16 in the EU).</p>
<h2>3. Prohibited conduct (zero tolerance)</h2><ul><li>Harassment, hate, threats, sexual content, illegal content</li><li>Spam, unsolicited sales, scams</li><li>Posting other people's personal information without consent</li><li>Impersonation or false information</li></ul>
<p>We have zero tolerance for objectionable content or abusive users. Reports are reviewed within 24 hours; violating content is removed and accounts may be suspended.</p>
<h2>4. Reporting & blocking</h2><p>Use the ⋯ menu on a person, post, meetup or request to report or block. Blocked people can't see or contact you.</p>
<h2>5. Content</h2><p>You own what you post. You let us display it as needed to run the Service.</p>
<h2>6. Paid features</h2><p>Meeting people (recommendations, other schools, connect requests, meetups, messages) is free. Paid features such as AroundU+ follow the terms shown at checkout; cancel anytime in your store subscription settings.</p>
<h2>7. Safety & liability</h2><p>Meet in public places and use your judgment. To the extent permitted by law, we are not liable for interactions between users.</p>
<h2>8. Leaving</h2><p>Delete your account anytime in Settings › Delete account.</p>
<h2>9. Contact</h2><p>${esc(op)} · ${contact}</p>` };
    case 'support': return { title: 'Support', body: `
<p>Questions, problems or something to report? Let us know.</p>
<ul><li>Contact: ${contact}</li><li>In the app: ⋯ › Report / Block on any person, post or meetup</li><li>Delete your account: Settings › Delete account · <a href="/delete-account?lang=en">details</a></li></ul>
<p><a href="/privacy?lang=en">Privacy Policy</a> · <a href="/terms?lang=en">Terms of Use</a></p>` };
    case 'delete-account': return { title: 'Delete your AroundU account', body: `
<p><b>In the app:</b> AroundU › Profile › Settings (gear) › <b>Delete account</b> › confirm. Deletion is immediate.</p>
<p><b>Can't use the app?</b> Email ${contact} from your school email address with the subject "Delete my account". We'll verify and delete it within 7 days.</p>
<h2>What is deleted</h2><ul><li>Your profile (photos, bio, prompt answers, interests, cities, work, research)</li><li>Your posts, comments, meetups you host, participation, connections, follows, blocks and saved searches</li><li>Your login email and sessions</li></ul>
<h2>What may remain</h2><ul><li>Messages you exchanged may remain in the other person's chat as "Deleted user".</li><li>Records we must keep by law are kept only for that period, then deleted.</li></ul>` };
  }
}

export function legalPage(page: LegalPage, lang: 'ko' | 'en'): string {
  const d = lang === 'en' ? en(page) : ko(page);
  const other = lang === 'en' ? `<a href="/${page}?lang=ko">한국어</a>` : `<a href="/${page}?lang=en">English</a>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title)} · AroundU</title>
<style>
:root{--ink:#1E2B3A;--ink2:#4A5A6B;--blue:#2F80ED;--line:#E1E8F0;--bg:#F6F9FC}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.brand{font-weight:800;color:var(--blue);font-size:20px;text-decoration:none}
h1{font-size:28px;margin:12px 0 16px;letter-spacing:-.4px}h2{font-size:18px;margin:28px 0 8px}
p,li{color:var(--ink2)}b{color:var(--ink)}a{color:var(--blue)}
article{background:#fff;border:1px solid var(--line);border-radius:20px;padding:8px 24px 24px}
nav{margin-top:24px;font-size:14px;display:flex;gap:14px;flex-wrap:wrap}
</style></head><body><main>
<header><a class="brand" href="/support${lang === 'en' ? '?lang=en' : ''}">AroundU</a><span>${other}</span></header>
<article><h1>${esc(d.title)}</h1>${d.body}</article>
<nav><a href="/privacy?lang=${lang}">${lang === 'en' ? 'Privacy' : '개인정보처리방침'}</a><a href="/terms?lang=${lang}">${lang === 'en' ? 'Terms' : '이용약관'}</a><a href="/support?lang=${lang}">${lang === 'en' ? 'Support' : '고객지원'}</a><a href="/delete-account?lang=${lang}">${lang === 'en' ? 'Delete account' : '계정 삭제'}</a></nav>
</main></body></html>`;
}
