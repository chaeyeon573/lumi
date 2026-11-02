# Third-party notices — ux-sim

ux-sim contains **no code copied** from the projects below. It adapts **ideas and data shapes** from them (see
`docs/ux-sim/OSS_COMPARISON.md`). Their MIT notices are reproduced here as attribution.

| Project | What ux-sim adapted | Where |
|---|---|---|
| [renjie-liu/autouser](https://github.com/renjie-liu/autouser) @ `551f164` | Expected outcome + confidence before an action and mismatch after; frustration from objective events only (failed 1.0, no effect 1.0, repeated 0.75, backtrack 0.5, mismatch 0.5) against a patience threshold; a simulated reading-time budget; a fixed success predicate with `false_success` when the persona's belief disagrees | `lib/session-server.mjs` |
| [browser-use/browser-use](https://github.com/browser-use/browser-use) @ `b49a68e` | Numbered interactive elements (`[12]<button> Label`), `*` for elements new since the last step, page fingerprints and a 20-action window to detect repeats/loops | `lib/dom.mjs`, `lib/session-server.mjs` |
| [andrew-shwetzer/human-experience](https://github.com/andrew-shwetzer/human-experience) @ `aa6341f` | Cheap per-screen checks: 44 px tap targets on phones, load timing, horizontal overflow; "every emotion traces to an event" | `lib/dom.mjs`, `docs/ux-sim/PERSONA_RUN.md` |
| [de6eling/user-testing-agent](https://github.com/de6eling/user-testing-agent) @ `3f1c433` | **Ideas only — the repository has no LICENSE file, nothing was copied.** Claude Code as the tester, patience enforced outside the model with nudges near the end, no devtools / no constructed URLs | `lib/session-server.mjs`, `docs/ux-sim/PERSONA_RUN.md` |

Runtime dependencies (installed from npm, not vendored): `playwright-core` (Apache-2.0), `ajv` (MIT).

---

## autouser

```
MIT License

Copyright (c) 2026 Renjie Liu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## browser-use

```
MIT License

Copyright (c) 2024 Gregor Zunic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## human-experience

```
MIT License

Copyright (c) 2026 Andrew Shwetzer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

