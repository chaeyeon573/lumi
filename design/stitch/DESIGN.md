---
name: Pastel Breeze
colors:
  surface: '#f9faf3'
  surface-dim: '#d9dbd4'
  surface-bright: '#f9faf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4ed'
  surface-container: '#edeee8'
  surface-container-high: '#e8e9e2'
  surface-container-highest: '#e2e3dc'
  on-surface: '#1a1c18'
  on-surface-variant: '#43474d'
  inverse-surface: '#2f312d'
  inverse-on-surface: '#f0f1ea'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#476080'
  primary: '#00162d'
  on-primary: '#ffffff'
  primary-container: '#0f2b48'
  on-primary-container: '#7a93b5'
  inverse-primary: '#afc8ed'
  secondary: '#2e6388'
  on-secondary: '#ffffff'
  secondary-container: '#a2d4fe'
  on-secondary-container: '#265c81'
  tertiary: '#00191d'
  on-tertiary: '#ffffff'
  tertiary-container: '#002f36'
  on-tertiary-container: '#6699a3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#afc8ed'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#2f4867'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#9accf6'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#0c4b6e'
  tertiary-fixed: '#b7ebf6'
  tertiary-fixed-dim: '#9bcfda'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#144e57'
  background: '#f9faf3'
  on-background: '#1a1c18'
  surface-variant: '#e2e3dc'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## 적용 범위 (2026-09)

앱 **구조·화면 구성은 `docs/PRD.md`**(Home | People | Meet | Feed | Profile), **색·타이포·컴포넌트는 이 Pastel Breeze 시스템**을 따른다. 참고 화면 PNG는 이전 구조(사람·발견·캠퍼스) 기준이지만 카드·알약·헤더 스타일은 그대로 쓴다.

## Brand & Style

This design system embodies a fresh, buoyant, and youthful aesthetic tailored for modern campus dating and social discovery. It strips away the cynical, high-pressure feel of traditional dating platforms in favor of an airy, optimistic, and low-friction atmosphere reminiscent of sunny quad afternoons and casual coffee meetups.

The visual direction blends modern soft minimalism with subtle glassmorphic touches. Light, breathing spaces dominate every viewport, anchored by milky undertones and crisp pastel blues. High-contrast slate cobalt elements introduce grounded clarity, giving the interface structure without sacrificing its breezy warmth. The emotional experience is approachable, effortless, and friendly.

## Colors

The palette directly adopts the sunlit pastel blue harmony:
- **Neutral Canvas (`#F6F7F0`)**: A warm, milky white base that avoids the clinical glare of pure `#FFFFFF`, providing an organic, comfortable backdrop for content cards and feeds.
- **Primary Text & Actions (`#0F2B48`)**: A dense slate cobalt providing authoritative contrast for primary buttons, prominent iconography, and headings, ensuring AAA legibility.
- **Secondary Tone (`#A3D5FF`)**: Clear pastel sky blue used for active pill toggles, secondary actions, and vibrant card highlights.
- **Tertiary Accent (`#BFF4FF`)**: Ethereal ice cyan applied across interactive hover states, badge fills, unread notification pips, and soft contextual tinting.
- **Sky Cerulean Midtone (`#B1E5FF`)**: Utilized for decorative gradients, border accents, and chip backgrounds.

Always maintain high contrast: place the slate cobalt `#0F2B48` directly over the pastel tints (`#BFF4FF`, `#A3D5FF`, `#F6F7F0`) to ensure instant readability and crisp definition.

## Typography

Typography relies uniformly on **Plus Jakarta Sans** to maintain a cohesive, friendly, and geometric presence across all viewports. Its wide apertures and soft curves complement the campus-oriented design tone.

Headlines employ bold weights (`700` and `600`) with tight line spacing for punchy profile intros, prompt questions, and conversational callouts. Body copy leans on regular weights (`400`) with generous line heights to preserve comfortable scanability across biographies and message bubbles. Labels prioritize clear legibility in small form factors using `600` weight.

## Layout & Spacing

The layout is built around a mobile-first fluid grid that transitions into a restrained desktop card feed:
- **Mobile (up to 640px)**: 4-column fluid layout with `1rem` outer margins and `1rem` gutters. Profile discovery cards fill the screen width within safe areas.
- **Tablet (641px - 1024px)**: 8-column fluid layout with `1.5rem` margins and gutters, supporting side-by-side feed browsing and conversational drawers.
- **Desktop (1025px+)**: 12-column grid capped at a maximum width of `1200px`, centered with `2.5rem` outer margins. Content manifests primarily as floating elevated boards.

Components lean on `space-md` (`1rem`) for standard inner cell padding and `space-sm` (`0.5rem`) for compact badge and tag separations.

## Elevation & Depth

Visual hierarchy leverages soft tonal layering and tinted ambient shadows rather than harsh drop shadows:

- **Flat Layering**: Cards sit above the milky neutral canvas (`#F6F7F0`) using clean `#FFFFFF` surfaces bounded by hairline borders tinted in `#B1E5FF` at 40% opacity.
- **Floating Cards (Profile Deck)**: Swipable discovery cards feature an ambient shadow: `0 12px 32px -4px rgba(15, 43, 72, 0.08)`. The slight slate-cobalt tint ensures the shadow feels atmospheric rather than muddy grey.
- **Overlays & Modals**: Bottom sheets and modals use subtle backdrop blurs (`backdrop-filter: blur(16px)`) with an ethereal ice cyan tint overlay (`rgba(191, 244, 255, 0.35)`).
- **Interactive States**: Hover and pressed states reduce shadow radius and trigger a soft glow using `#BFF4FF`.

## Shapes

The shape language is overtly pill-shaped and rounded (`roundedness: 3`). Buttons, badge chips, input fields, and message bubbles adopt full circular ends (`9999px` / `pill`), underscoring a friendly, tactile, and non-threatening aesthetic.

Container cards and media frames utilize generous radiuses (`1.5rem` to `2rem`), softening screen transitions and mimicking modern mobile hardware corners.

## Components

### Buttons
- **Primary Button**: Solid `#0F2B48` background with `#F6F7F0` text, fully pill-shaped (`9999px`), styled with `0.875rem` vertical and `1.75rem` horizontal padding. Typography is `label-lg`.
- **Secondary Button**: Solid `#A3D5FF` background with `#0F2B48` text.
- **Tertiary / Ghost Button**: Transparent background with a `1.5px` border in `#B1E5FF` and `#0F2B48` text.

### Chips & Interest Tags
- Fully pill-shaped with `0.375rem` vertical and `0.875rem` horizontal padding.
- Default state: `#BFF4FF` surface with `#0F2B48` typography.
- Selected state: `#0F2B48` background with `#F6F7F0` typography.

### Input Fields
- Enclosed pill containers with `#FFFFFF` background and a subtle `1px` border in `#B1E5FF`.
- Placeholder text in `#0F2B48` at 45% opacity.
- Active focus state introduces a `2px` ring in `#A3D5FF` without harsh black borders.

### Profile & Content Cards
- Crisp white surfaces with a `2rem` border radius, encased in a delicate `1px` border in `#B1E5FF` (30% opacity) and backed by the tinted ambient slate shadow.
- Inner image containers follow a `1.5rem` border radius.

### Checkboxes & Radio Controls
- Radio buttons feature smooth concentric circles with a `#0F2B48` indicator inside a `#BFF4FF` ring.
- Checkboxes use rounded squares (`8px` radius) with `#A3D5FF` fill and `#0F2B48` checkmarks.

### Campus Verification Badges
- Compact pill badges using a `#BFF4FF` background, a 1px border in `#A3D5FF`, and a slate cobalt university icon with `label-sm` bold text.