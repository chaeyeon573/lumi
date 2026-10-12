# Lumi design v2 — handoff

Handoff for whoever applies the new design to the app. The images in this folder are
mockups rendered from HTML with real Berkeley data from the live app. Some numbers and
copy in them are illustrative — see "Not real data" at the bottom. **Code is the truth for
behaviour; these images are the truth for look and feel.**

## 1. Color system — pink + lime, dark  (`01-color-system.jpg`)

Dark app. Brand pink and lime stay, but as small bright accents; big areas use the dark
steps of the same colors so screens don't tire the eyes.

```css
/* neutrals */
--bg:#08070C; --s1:#16131F; --s2:#1F1B2B; --line:#2A2433;
--tx:#F4F1FF; --tx2:#A79FC4; --tx3:#6E6889; --ink:#0C0A14; /* text on lime */
/* pink */
--p900:#2A0E20; --p800:#5C1640; --p600:#C42683; --p400:#FF3DA8 /*brand*/;
--p300:#FF7AC0; --p200:#FFB3D9; --p100:#FFE0F0;
/* lime */
--l900:#1C220A; --l800:#4A5A12; --l600:#A9CC1F; --l400:#D4FF3A /*brand*/;
--l200:#E6FF8F; --l100:#F4FFD1;
```

| Step | Use |
|---|---|
| pink 900 / 800 | tinted card & chip backgrounds, borders, pressed |
| pink 300 / 200 | small labels, icons, soft text on dark |
| pink 400 | badge, dot, heart, at most one hero card |
| lime 900 / 800 | "selected" chip background / border |
| lime 400 | primary button, band, active tab dot, D-day badge |

Rules:
1. **90 / 10** — ~90% of a screen is night + dark surfaces + soft text.
2. **One loud thing per screen** — usually the lime button.
3. **Body text stays neutral** (white / lavender-grey). Brand colors only for short labels,
   numbers and one highlighted word.

Type: **Unbounded** (800 for titles, 600 for card titles) + **Inter** for body. Radii:
cards 20, big cards 26–30, pills 99.

## 2. Welcome (z1)  (`02-welcome-and-timetable.jpg`, left)

- Black background, pink glow top-left, faint lime glow bottom-right.
- `lumi.` logo (pink dot), tilted lime band: `🍕 FREE FOOD ✦ ⏰ DEADLINES ✦ 🎸 N CLUBS ✦ 💼 N INTERNSHIPS`.
- Headline "What's on **campus** this week?" — "campus" in lime.
- Three tilted cards, in this order: **free food (dark)** → **"See who's free right now" (pink 400)**
  → **deadline (white/paper)**. The middle one is pink — this was explicitly asked for.
- Lime "Get in →" button, "Have an account? Sign in".

## 3. Timetable — big, Everytime-style  (`02-…jpg`, right)

Full width, ~62px per hour, 9–6, filled blocks with course code + room, colors from the
pink/lime scales (600, 400 lime, 800, 300, neutral). Current time = lime line on today's
column. Shown without opening the timetable page (on Me).

## 4. Main screens  (`03-main-screens.jpg`)

Sign-up quiz, People, Discover ("This week" + Ask bar + Today / Closing soon / Clubs
recruiting), Internships list (filters, saved strip, New / field / posted badges, heart),
listing detail (D-day, "You get", "Who can apply", "Going for it" faces, big lime
"Open application ↗" + "I applied"), Me. Bottom tabs: People · Discover · Ask · Chats · Me,
active tab = white label + lime dot.

**The People screen in this sheet is superseded** — see §6.

## 5. First open — not decided yet

Two directions were explored. The user leans toward **asking interests and, on each pick,
showing "here's what Lumi does for that"**. Five layouts (`04`, `05`), not chosen yet:

- **A** grid of interests → tap opens a bottom sheet with a real example ("We find the free food for you")
- **B** Lumi talks: chat-style, Lumi asks, user taps chips, Lumi answers with a real card
- **C** pick a few → one full-screen story per pick
- **D** swipe feature cards yes / skip
- **E** bento: tapping a tile opens it in place

Earlier fun-quiz version (`06-first-run-quiz.jpg`): "This week you're hunting for…" →
this-or-that → finish the sentence → shareable "campus type" result card → instant
payoff ("Here's your campus today"). Its this-or-that and finish-the-sentence answers feed
the ice-breaker games (§7).

**Affiliation (year, major, classes, clubs) is asked later, not at first open**
(`07-affiliation-later.jpg`): ask it when the user first adds a timetable or opens People.

## 6. People card

- Not a dating app: **medium face** (circle ~96–128px), **minimal text** — name, one line
  (campus type or "Business · Junior"), and one card (their answer, or what you have in common:
  same class / same club).
- Layout options are in `08-people-layouts.jpg`; the user found the text-heavy big-photo card
  awkward. Direction: option 3 (avatar + one card).
- **No "Say hi" button.** It is replaced by the games below.

## 7. Ice-breaker games  (`09`, `10`)

Five games (a sixth, "spin a plan" slot machine, was rejected):

1. **This or that** — send a pair, pick yours; recipient picks.
2. **Guess their pick** — guess the person's answer to one of their own quiz questions.
3. **Hot take** — 🔥 agree / 🧊 nope on their hot take (+ optional note).
4. **2 truths & a lie** — spot the lie.
5. **Week in 3 emojis** — guess what their emojis mean.

Rotate games between cards so it never feels the same. Flow (`10-game-flow.jpg`):
sent toast (pink card) → next card → recipient gets "Alex sent you a this-or-that" →
result: **same pick** (celebration, "You're both ramen people") or **different pick**
("Uh oh. Settle this.") → **chat opens either way** with the game result pinned on top and
a "Next round" game card inside the chat.

Backend for the games is being built separately (core types + `games` RPC on the server);
build the UI against that API rather than inventing state in the client.

## Not real data (mockup only)

Maya's classes/clubs, "Free till 3PM", "4 friends are free too", "23 people picked this",
"41 explorers", campus-type names and descriptions, Maya's hot take / lies / emojis, chat
lines, Lumi's suggested plan copy. Real in the mockups: listings, free-food events, NSF GRFP
and Hertz deadlines, internships, Berkeley department and course names, club names and logos,
sample-user photos.
