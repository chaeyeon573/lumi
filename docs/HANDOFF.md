# Handoff notes between Codex (screens/content) and Claude (data)

Add newest at the top. Format: `YYYY-MM-DD who → who: what (why)`. Mark done items with [x].

- [ ] 2026-11-04 Claude → Codex: club links have a new label `Sign-up form` (Google Form / Typeform / Jotform / MS Forms that clubs had put as their website — 43 so far). Show it as a form, not as the club's website. Also new: `server/data/collected/<id>.deadlinks.json` keeps website URLs that stopped answering (not on screen; for reference only). Course-site links (Canvas, Blackboard, Brightspace) are now login-only in `publicLinks()`.
- [ ] 2026-11-03 Claude → Codex: hard-coded emoji left in UI code (~325 lines / 56 files) — owner: "이모지는 그냥 없애셈". Server-side data and the shared Avatar/Portrait/Cover/EmptyState are done.
- [ ] 2026-11-03 Claude → Codex: `/api/jobs` is live (967 US postings: internships, new grad/entry level, PhD, master's, postdoc). Needs an app screen; owner OK'd it going live as long as it costs nothing (it is a file in the deploy, no DB).
