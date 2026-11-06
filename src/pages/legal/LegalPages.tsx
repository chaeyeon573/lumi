/**
 * /privacy and /terms — public pages (no sign-in), linked from Settings, the welcome screen and sign-up.
 * App Store Connect points at https://<host>/privacy. The server (server/legal.ts) serves index.html with the
 * right title, and GET /api/legal gives the operator name and contact email from env (LEGAL_NAME, PRIVACY_CONTACT_EMAIL).
 * Unset values show a visible "[… — to be set]" placeholder — never a guessed name or address.
 *
 * Every statement here was checked against the code (see docs/app-store/APP_PRIVACY.md for the audit with file references).
 * When a feature changes what Lumi collects or who receives it, update this page and that doc together.
 * English only — the App Store release is US-only.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { apiMode } from '@core/api';

/** Same shape as GET /api/legal (server/legal.ts) */
interface LegalConfig { operator: string | null; contactEmail: string | null }

export const LEGAL_UPDATED = 'November 6, 2026';

function useLegalConfig(): LegalConfig {
  const [cfg, setCfg] = useState<LegalConfig>({ operator: null, contactEmail: null });
  useEffect(() => {
    if (apiMode !== 'remote') return;
    let alive = true;
    fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/legal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((x: LegalConfig | null) => { if (alive && x) setCfg({ operator: x.operator ?? null, contactEmail: x.contactEmail ?? null }); })
      .catch(() => { /* keep placeholders */ });
    return () => { alive = false; };
  }, []);
  return cfg;
}

/** Visible placeholder for a value the owner still has to set */
const Missing = ({ children }: { children: ReactNode }) => <mark className="rounded px-1 bg-gold-soft text-ink font-semibold ring-1 ring-gold">{children}</mark>;
const Operator = ({ cfg }: { cfg: LegalConfig }) => (cfg.operator ? <>{cfg.operator}</> : <Missing>[operator name — to be set]</Missing>);
const Contact = ({ cfg }: { cfg: LegalConfig }) => (cfg.contactEmail ? <a href={`mailto:${cfg.contactEmail}`} className="text-primary font-semibold underline underline-offset-2">{cfg.contactEmail}</a> : <Missing>[contact email — to be set]</Missing>);

const H = ({ children }: { children: ReactNode }) => <h2 className="font-display text-[18px] font-bold text-ink mt-7 mb-2">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="text-[14.5px] leading-relaxed text-ink-2 mt-2">{children}</p>;
const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc pl-5 space-y-1.5 text-[14.5px] leading-relaxed text-ink-2 mt-2">{children}</ul>;
const B = ({ children }: { children: ReactNode }) => <b className="text-ink font-semibold">{children}</b>;

function LegalShell({ title, other, children }: { title: string; other: { to: string; label: string }; children: ReactNode }) {
  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back />
      <article className="px-5 pt-4 max-w-[640px] mx-auto">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{title}</h1>
        <p className="text-[12.5px] text-ink-3 mt-1">Last updated {LEGAL_UPDATED}</p>
        {children}
        <div className="mt-10 pt-4 border-t border-line flex items-center justify-between text-[13px]">
          <Link to={other.to} className="text-primary font-semibold">{other.label} →</Link>
          <span className="text-ink-3">Lumi</span>
        </div>
      </article>
    </div>
  );
}

export function PrivacyPage() {
  const cfg = useLegalConfig();
  return (
    <LegalShell title="Privacy Policy" other={{ to: '/terms', label: 'Terms of Use' }}>
      <P>Lumi helps college students find people and things to do on campus. This page explains what Lumi collects, why, who else receives it, and how to delete it. "We" means <Operator cfg={cfg} />, who runs Lumi. Questions: <Contact cfg={cfg} />.</P>

      <div className="card p-4 mt-4">
        <B>The short version</B>
        <UL>
          <li>We collect what you give us: your school email, your profile, your classes, and what you post and send.</li>
          <li>We use it only to run Lumi. We don't sell it, we don't show ads, and we don't track you across other apps or websites.</li>
          <li>A few service providers handle data for us: hosting (Railway), email (Resend) and AI features (OpenAI).</li>
          <li>You can delete your account any time in <B>Settings → Delete account</B>.</li>
        </UL>
      </div>

      <H>1. What we collect</H>
      <P><B>Account.</B> Your school email address, used to send you a 6-digit sign-in code and to confirm you're a student at your school. Other users never see it. You can skip it when you sign up, but then you can't sign back in on another device. Signing in creates a random session token that your device keeps.</P>
      <P><B>Student ID photo (only if you can't use a school email).</B> If you have no school email — for example as an alum — or the code never arrives, you can send a photo of your student ID (or alumni card or diploma) instead. It's used only to check that you study at (or graduated from) your school. Only the Lumi team sees it — never other users — and we delete it as soon as we've reviewed it, whether we approve it or not. We keep only the result (verified or not, and the reason if not). The photo is shrunk and stripped of location data (EXIF) on your device, and again on our server. Until it's approved, other users don't see your account. If you verify this way you can also add any email address just for signing in on another device; it's checked with a code, used only to send you sign-in codes, never shown to other users, and doesn't count as school verification.</P>
      <P><B>Profile.</B> The name or nickname you choose, birth year (only you see it — it isn't on your profile and isn't sent to other users; we use it to check the 16+ rule, and 18+ for rides), school, major, year, and whether you're an undergrad, grad student or alum. Optional extras you can fill in: a short bio, likes, free-time activities, interests, goals, who you'd like to meet, answers to profile questions and icebreaker games, what you'd like to do right now, and where you live in general terms (dorm, off-campus or commuting, plus an area — never an address). Your avatar is an emoji and a color — Lumi doesn't upload photos from your device.</P>
      <P><B>Classes.</B> Classes you add to your timetable (course, days and times, and optionally room, instructor and section), class-seat alerts, and whether classmates can see that you take a class.</P>
      <P><B>Course reviews and exam info.</B> If you write a course review (star rating, text and optional details such as workload, grading, tags and instructor) or exam info (number of midterms, final, format, notes and an optional tip), we store it with your account so you can edit or delete it, so we can enforce one review per class and term, and so we can act on reports. Other students never see your name or profile with it — only the term (and not even that while a class has fewer than three reviews for that term). "Helpful" taps are shown only as a count. Text with phone numbers, e-mail addresses or links is refused, and text that may name a student is held until our team checks it. Deleting your account deletes your reviews, exam info and helpful taps.</P>
      <P><B>What you create and do.</B> Posts, comments, meetups and who joins them, plans and votes, rides (a pickup point from a preset list, destination, time, seats, and an optional cost estimate and note), chats and messages, friend requests, follows, likes, saved people (with any folders and private notes you add — only you can see them), saved listings and clubs, favorite dining dishes and gym crowd alerts, blocks and reports. Photos you choose to attach to a post — we shrink them and remove location data (EXIF) on your device before upload.</P>
      <P><B>Link plans.</B> If someone without an account answers a plan through a shared link, we store the first name they type and a scrambled (hashed) token that lets their device change the answer later.</P>
      <P><B>AI features.</B> Questions you ask Ask Lumi and its answers, text you paste to fill in your profile at sign-up, and conversation starters we suggest. We keep a log of these to fix problems and prevent abuse.</P>
      <P><B>Feedback.</B> Anything you send with Settings → Send feedback.</P>
      <P><B>Technical.</B> Our hosting provider keeps standard server logs (such as IP address, the page or request, time and errors). Lumi doesn't use analytics or advertising tools and doesn't use cookies to track you. Your browser stores your sign-in token and a few settings (like design, language and filters) on your device. If you turn on notifications in the iPhone app, we store a push token for that device so we can send them; it's deleted when you sign out on that device or delete your account.</P>
      <P><B>What we don't collect.</B> Lumi doesn't read your device's location (GPS), contacts, your photo library (only the photos you pick are uploaded) or microphone, and uses the camera only when you take a photo for a post or of your student ID. Maps show places for events and rides, not where you are. Notifications appear inside the app; in the iPhone app you can also choose to get them as push notifications (off until you say yes, and you can turn them off in Settings). The only emails we send you are sign-in codes. (Clubs may get an e-mail from us at the address listed in the campus directory, with a count of students who asked to join — no names.)</P>

      <H>2. How we use it</H>
      <UL>
        <li>To run Lumi: show your profile, find classmates and times you're both free, recommend events, clubs and listings, deliver messages and send in-app alerts you turn on.</li>
        <li>To check that you're a student at your school.</li>
        <li>To keep people safe: review reports, remove content and accounts that break the <Link to="/terms" className="text-primary font-semibold underline underline-offset-2">Terms of Use</Link>.</li>
        <li>To fix bugs, read your feedback and make Lumi better.</li>
      </UL>
      <P>We don't sell your personal information, share it for advertising, or use it to track you.</P>

      <H>3. Who can see what</H>
      <UL>
        <li><B>Other Lumi users</B> see your name, avatar, year, general area, what you'd like to do right now, the roles you're looking for or can offer, and the profile sections you allow. You choose who sees each section in <B>Settings → Visibility</B>, and can hide your school name and major. Sections someone isn't allowed to see aren't sent to their app at all.</li>
        <li><B>Your timetable:</B> others only see when you're busy or free, never your class names or rooms. Classmates in the same class can see that you take it, unless you turn that off.</li>
        <li><B>Course reviews and exam info:</B> other students see the text and details, never who wrote them. Our team sees the author only when reviewing a report.</li>
        <li><B>Anonymous posts</B> don't show your name to other users, and their app isn't told who wrote them (comments on anonymous posts are anonymous too). We still know who wrote them so we can act on reports.</li>
        <li><B>Messages</B> are visible to the people in that chat. They're stored on our servers and aren't end-to-end encrypted, so we can review them when someone reports a problem.</li>
        <li><B>Asking to join a club:</B> when you tap Ask to join, the club's organizers on Lumi see your name, year and major (even if your major is hidden on your profile) and can message you as the club. If the club has no organizers on Lumi yet, your request is saved and shared the same way once an organizer of that club signs up through the club's official e-mail. Others only see how many students asked, and your face only if your memberships are visible to them. Withdraw the request from the club page (··· menu) and the club can no longer message you; blocks apply as usual. If a club has requests waiting, we may contact the club (by its address in the campus directory, or a message to its public Instagram) with a count of requests — never names.</li>
        <li><B>Your email address</B> is never shown to other users.</li>
        <li><B>A student ID photo</B> is seen only by the Lumi team reviewing it, and is deleted after the review.</li>
      </UL>

      <H>4. Service providers</H>
      <P>These companies process data for us to run Lumi. They may only use it to provide their service to us.</P>
      <UL>
        <li><B>Railway</B> (United States) — hosts the app and its database. Everything described above is stored there.</li>
        <li><B>Resend</B> — sends sign-in code emails, so it receives your email address and the code. It also delivers feedback notices to our team.</li>
        <li><B>OpenAI</B> — powers Ask Lumi, "fill in my profile" at sign-up, and conversation starters. It receives: your question and your recent Ask Lumi conversation along with your school, major, year, interests and goals; the text you paste at sign-up; and, for conversation starters, only the profile details the other person lets you see (such as their name, major, shared classes, interests and bio). Please don't put sensitive personal information into these features.</li>
        <li><B>Expo</B> and <B>Apple</B> — if you turn on push notifications in the iPhone app, the notification's title and text — for a new chat message, the sender's first name, the chat's name and the start of the message — and your device's push token pass through Expo's push service to Apple, which delivers them to your phone.</li>
        <li><B>Google Fonts</B> and <B>CARTO</B> (map images) — the app loads fonts and map tiles from them, so they see your IP address and, for CARTO, the map area you're viewing.</li>
      </UL>
      <P>Lumi also reads public information — Cal Dining menus, the RSF crowd meter, class schedules, academic calendars and public listings — from those websites. We don't send them anything about you.</P>
      <P>We may share information if the law requires it, or to protect someone's safety.</P>

      <H>5. How long we keep it</H>
      <UL>
        <li>We keep your account information until you delete your account.</li>
        <li>Sign-in codes expire after 10 minutes.</li>
        <li>A student ID photo is deleted as soon as we've reviewed it (approved or not), or when you delete your account if that comes first.</li>
        <li>When you delete your account (<B>Settings → Delete account</B>), we delete your sign-in email, your profile and timetable, your posts and comments and photos you uploaded, your connections and saved-people notes (including notes others kept about you), and your messages — 1:1 chats with you are removed for both people. Meetups, plans and rides you host are cancelled, and the people in them get a notice that doesn't name you. You're signed out everywhere and your devices' push tokens are deleted. Reports you filed are kept without your name; reports about you are kept for safety review.</li>
        <li>Ask Lumi logs and feedback are kept to fix problems and prevent abuse, and are deleted with your account. Text you paste into "fill in my profile" during sign-up is logged before you have an account, so it isn't linked to you — email <Contact cfg={cfg} /> if you want it removed.</li>
        <li>Server logs are kept by our hosting provider for a limited time.</li>
      </UL>

      <H>6. Your choices</H>
      <UL>
        <li>Edit or remove profile details, change who sees them, and hide yourself from class lists at any time.</li>
        <li>Block anyone. Blocked people can't see you or message you.</li>
        <li>Delete your account in <B>Settings → Delete account</B>.</li>
        <li>Email <Contact cfg={cfg} /> to get a copy of your information, fix it or delete it. Depending on where you live (for example, California), you may have these rights by law; we won't treat you differently for using them.</li>
      </UL>

      <H>7. Age</H>
      <P>Lumi is for college students who are <B>16 or older</B> (some students start college at 16). It isn't meant for anyone under 16, and it is not directed to children under 13. If we learn that someone under 16 has an account, we'll delete it. Ride sharing is limited to students 18 and older. If you think a child has given us information, contact <Contact cfg={cfg} />.</P>

      <H>8. Security</H>
      <P>Lumi uses HTTPS, one-time sign-in codes instead of passwords, and random session tokens. No system is perfectly secure, so please tell us right away if you notice a problem.</P>

      <H>9. Changes</H>
      <P>If we change this policy, we'll update the date at the top. For important changes, we'll let you know in the app.</P>

      <H>10. Contact</H>
      <P><Operator cfg={cfg} /> · <Contact cfg={cfg} /></P>
    </LegalShell>
  );
}

export function TermsPage() {
  const cfg = useLegalConfig();
  return (
    <LegalShell title="Terms of Use" other={{ to: '/privacy', label: 'Privacy Policy' }}>
      <P>These terms are an agreement between you and <Operator cfg={cfg} />, who runs Lumi. By creating an account or using Lumi, you agree to them and to our <Link to="/privacy" className="text-primary font-semibold underline underline-offset-2">Privacy Policy</Link>. If you don't agree, please don't use Lumi.</P>

      <div className="card p-4 mt-4 border-danger/40">
        <B>Zero tolerance</B>
        <P>Lumi has <B>no tolerance for objectionable content or abusive users</B>. We remove content that breaks these rules and ban the people who post it — we don't need to warn you first. We review every report within 24 hours.</P>
      </div>

      <H>1. Who can use Lumi</H>
      <UL>
        <li>You must be <B>16 or older</B> and a current, incoming or former student of a school on Lumi. Ride sharing is only for users 18 and older.</li>
        <li>Use your real school email, keep one account, and don't pretend to be someone else.</li>
        <li>You're responsible for what happens on your account. Keep your email account secure.</li>
      </UL>

      <H>2. Community rules</H>
      <P>Don't post, send or do any of the following on Lumi:</P>
      <UL>
        <li>Harassment, bullying, threats, or encouraging violence or self-harm.</li>
        <li>Hate speech or attacks on people based on race, ethnicity, national origin, religion, gender, gender identity, sexual orientation, disability or similar traits.</li>
        <li>Sexual content, nudity, or unwanted sexual messages. Anything that sexualizes minors is reported to the authorities.</li>
        <li>Graphic violence, or illegal activity such as selling drugs or weapons.</li>
        <li>Spam, scams, pyramid schemes, or repeated unwanted messages.</li>
        <li>Sharing someone's private information (address, phone number, photos, class schedule) without their permission.</li>
        <li>Pretending to be another person, a club or a school office, or posting false listings.</li>
        <li>Trying to break, overload, scrape or get around Lumi's security or limits.</li>
      </UL>

      <H>3. Reporting and blocking</H>
      <UL>
        <li><B>Report</B> a person, post, comment, message, meetup or ride from its menu (⋯ or the flag). Reports go to our team, not to the person you report.</li>
        <li><B>Block</B> someone from their profile or your chat with them. You won't see each other or be able to message each other.</li>
        <li>We review reports within 24 hours. We may remove content, and suspend or permanently ban accounts. If there's a threat to someone's safety, we may contact the authorities.</li>
        <li>When 3 different people report the same post or comment, it's hidden from everyone except the person who wrote it until we've reviewed it.</li>
        <li>A suspended account can't sign in or post, and its profile and content are hidden from everyone else.</li>
        <li>In an emergency, call 911 (or UCPD at Berkeley) first.</li>
      </UL>

      <H>4. Your content</H>
      <P>You own what you post. You give us permission to store, show and share it inside Lumi as needed to run the service (for example, showing your post to the people you chose). You're responsible for what you post and confirm you have the right to post it. We can remove any content for any reason, including when it breaks these terms.</P>

      <H>5. Meeting people and sharing rides</H>
      <UL>
        <li>Lumi helps you find people and plans, but we don't run background checks. Meet in public places, tell a friend where you're going, and trust your judgment.</li>
        <li>Rides on Lumi are informal arrangements between students to share costs. Lumi isn't a transportation company and isn't part of your ride. Don't use Lumi to drive for profit. Drivers must have a valid license and insurance and follow the law.</li>
      </UL>

      <H>6. Information on Lumi</H>
      <P>Events, listings, deadlines, dining menus, gym crowd levels, class seats and academic dates come from public sources and can be wrong or out of date. Ask Lumi and other AI suggestions can make mistakes. Always check the official source before relying on them.</P>
      <P>Lumi is an independent app. It isn't affiliated with, endorsed by or sponsored by UC Berkeley or any other school.</P>

      <H>7. Lumi+</H>
      <P>Lumi+ is an optional paid plan with a few extras: more people filters, folders and private notes for saved people, and higher limits for groups and meetups. Safety features, finding people, meetups and your timetable stay free. Payments aren't open yet, so Lumi+ can't be bought today. Before any purchase, the app will show the price, how renewal works, and how to cancel and get a refund, and we'll add those terms here first.</P>

      <H>8. Ending your account</H>
      <P>You can delete your account any time in <B>Settings → Delete account</B>. We may suspend or end your access if you break these terms or put others at risk.</P>

      <H>9. Disclaimers</H>
      <P>Lumi is provided "as is" without warranties of any kind. To the extent the law allows, we aren't liable for indirect or consequential damages, or for the conduct of other users on or off Lumi.</P>

      <H>10. Apple</H>
      <P>If you got Lumi from Apple's App Store: these terms are between you and us, not Apple. Apple isn't responsible for Lumi or its content, has no obligation to provide support for it, and isn't responsible for handling any claims about it. Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them.</P>

      <H>11. Changes</H>
      <P>We may update these terms. We'll change the date at the top and let you know in the app about important changes. If you keep using Lumi after that, you accept the new terms.</P>

      <H>12. Contact</H>
      <P><Operator cfg={cfg} /> · <Contact cfg={cfg} /></P>
    </LegalShell>
  );
}
