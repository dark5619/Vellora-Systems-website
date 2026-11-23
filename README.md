# Vellora Systems website

React 18 + TypeScript + Vite 5 + Three.js. Seven routes built from the supplied designs and
`Vellora-Website-Assets.zip`.

| Route | Page | Reference |
| --- | --- | --- |
| `/` | Home (WebGL hero) | `design-reference/01_Home.png` (1672 × 941) |
| `/work` | Selected Work (filters `?filter=`, previews `?project=`) | `02_Our_Work.png` (1199 × 1312) |
| `/work/streaming-platform` | Streaming case study (Work → TV Streaming Platform → View Case Study; "Case Studies" in its header) | `03_Project_Case_Study.png` (1199 × 1312) |
| `/expertise` | Expertise | `04_Expertise.png` (1672 × 941) |
| `/studio` | Studio & Team | `05_Studio_And_Team.png` (1199 × 1312) |
| `/about` | About | `06_About.png` (1199 × 711) |
| `/contact` | Contact (`?type=` preselects a project type) | `07_Contact.png` (1199 × 613) |

## Run

```bash
npm install
npm run assets     # regenerate public/assets from asset-source/ (already generated; rerun after asset changes)
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ at http://localhost:4173 (SPA history fallback included)
```

Checks (run against `npm run preview` in another terminal; they use the local Google Chrome,
override with `CHROME_PATH=…`):

```bash
npm run test:e2e     # 109 interaction checks; exits non-zero on failure
npm run test:visual  # reference-width captures + 50% overlays → test-results/visual/
node scripts/visual.mjs --widths 1440,1024,768,390,360   # plus the review widths
```

Per-route fidelity report (design-size viewport and full page, side-by-side, 50% overlay,
difference image and ink-measured anchors for all seven routes):
`node scripts/compare.mjs <label>` → `test-results/compare/<label>/` (see `anchors.md`).

Contact captures (full viewport at 1199 × 613, 1624 × 908 and 390 × 844, plus a 50% overlay):
`node scripts/contact-shots.mjs <label>` → `test-results/contact/`.

Static hosting: serve `dist/` with a fallback from unknown paths to `index.html`.

## Project layout

```
asset-source/Vellora-Assets/   untouched extracted package (source of truth, not shipped)
design-reference/              full-resolution page designs used for overlays
public/assets/                 generated derivatives (WebP, alpha kept; glyphs copied as PNG)
public/fonts/                  Plus Jakarta Sans variable (OFL), self-hosted
scripts/build-assets.mjs       derivative pipeline + typed manifest (src/data/assets.generated.ts)
scripts/e2e.mjs, visual.mjs    browser checks
src/data/                      site facts, nav, projects + per-project art direction
src/components/                header, buttons, plates, ribbons, project card/preview, filters, form
src/hero/                      Home hero poster + Three.js scene
src/pages/                     one component + stylesheet per route
```

## How the designs are reproduced

- **Reference pixels.** Each page declares its reference width; `--dp` (a registered `<length>`)
  is one reference pixel, capped at 1px and derived from the main container. Desktop
  compositions (≥1024px) place text and artwork with manifest coordinates in `--dp` units, so
  the layout matches at the reference width and scales proportionally down to 1024px. Below
  that, pages reflow into single/two-column layouts with fluid type.
- **Wider than the reference,** compositions keep filling the viewport: `--dp` is no longer
  capped at 1px and there is no centred reference-width column or blurred side fill, so artwork
  runs edge to edge. Fixed compositions (Home, Work, case study, Expertise, Studio, Contact) scale
  proportionally. About is fluid: its text stays at natural size near the left gutter (a separate
  type unit, `--t`, capped at 1px) while the office art, metrics strip (≈78%) and industry row
  (≈91%) take the extra width.
- **Typeface.** Plus Jakarta Sans (variable) was chosen by rendering candidates against the
  designs: it matched the Home body line width (480 vs 484px) and nav labels (113/74 vs
  113/75px) at matched x-height. Headings are tuned per page (weight, tracking, size) so the
  reference line breaks hold.
- **Header.** One fixed global navigation with active state (also on the case study via
  `/work`), an accessible mobile menu (<1000px) and a "Start a Project" action. Its metrics interpolate
  between the 1199px and 1672px reference headers; the long labels "Our Work" and
  "Studio & Team" plus the company tagline appear from 1500px, as on the Home design.

## Home WebGL hero

`src/hero/heroScene.ts`: orthographic camera over the native 1672 × 581 canvas; the four
`motion-home-hero` layers are textured planes at manifest positions, stacked in filename order;
sRGB textures, premultiplied on upload with ONE/ONE_MINUS_SRC_ALPHA blending. Pointer input
(fine pointers only) eases the orbit up to ±3.5 × 2 CSS px and the V up to ±7 × 4.5 CSS px;
the resting-light pass fades as they move and returns at rest, where positions snap exactly.
Rendering is on demand (one frame at rest), pauses offscreen/in hidden tabs, caps DPR at 2,
and disposes textures, geometry, listeners and the context on unmount. Samples texels
directly at ≥1:1 and uses mipmaps when minified.

The finished plate `hero-with-v` is the poster: it paints first (preloaded on `/` only) and
remains the experience for reduced motion, coarse pointers, viewports under 1280px,
low-memory/save-data devices, missing WebGL and context loss. The scene is code-split
(Three.js loads only when idle and eligible) and fades in over the identical frame.

Verified: resting WebGL frame vs `asset-source/…/hero-with-v.png` → max Δ 2/255, mean 0.06;
after pointer movement the frame returns to the resting frame with Δ 0.

## Asset handling

- 233 of 277 PNGs ship as derivatives (4.9 MB total). Card references, industry card
  references, ribbon `reference.png` files and the Guide maps are comparison-only and not shipped.
- Brand marks and glyphs are copied unchanged. Hero layers and the six project devices are
  lossless WebP (exact rest pose; crisp screen text). Other artwork is WebP q90 with alpha kept;
  plates ≥1100px also get a half-width variant for phones.
- Two ribbon backings contain baked interface pixels (Studio hero wave: button, play control and
  stat labels; Contact lower edge: response-time text, submit button and privacy note). The
  pipeline derives clean backings from supplied pixels only — the text-free page plate where the
  light strip is absent, the supplied ribbon-free backing under (and within 6px of) the strip.
- Ribbon rigs (Home divider, case-study footer crest, Studio hero wave, About lower edge,
  Contact top and lower edges) align base + strip by manifest coordinates; the strip drifts
  ±3px, clipped to its section, and is static under reduced motion.

## Intentional portfolio revision: more of the frame for the product

Recorded difference from `02_Our_Work.png`: the media frame grows from 371 × 225 / 202 to a
uniform 371 × 248 at the reference width (row 1 +23px, row 2 +46px; captions keep a shared
baseline per row). Each project has its own art direction in `src/data/projects.ts` (focal
point, placement, scale cap, anchored edge): the project art covers the taller frame, cropping
scenery first, and the isolated device is layered exactly over its baked counterpart. Device
scale stays at or below ~1.25× native.

| Project | What became easier to see |
| --- | --- |
| Casual Mobile Games | Phone enlarged a further 10% from its lower edge; island scenery cropped; the Ray Adventure title and hero fill the frame. |
| TV Streaming | TV +10%, stand anchored at the frame edge; VelloraTV menu, astronaut feature and the title row read clearly. |
| Healthcare Web | Laptop now spans the frame; "Neo Health", "Patient Overview" and "1,248 Active Patients" are legible. |
| Fintech Dashboard | Phone +23% with the wave scenery cropped; balance, actions and transactions read clearly. |
| PCB Design | Board +23% centred on the Vellora chip; traces and components are distinct. |
| Robotics | Arm +23%; joints and gripper over the holographic surface are clear. |

Hover/keyboard focus brightens the card edge and lifts the device 2% without moving captions.
Larger views open in an accessible preview dialog, capped by native resolution.

## Other intentional differences

- **One fixed global header, visible on every route.** `position: fixed`: transparent over the
  artwork at the top of a page, a solid blurred surface once the page scrolls or the mobile menu
  opens. `scroll-padding-top` keeps focused fields and in-page jumps clear of it. The Contact
  design has no header, so its scene starts at the header's lower edge (the section top is the
  alignment origin for 07_Contact).
- **Disputed metrics.** "Projects Delivered" (50+ vs 100+) is omitted and its slots show
  "End-to-End · Concept to Launch" (Expertise copy). Industries use 8+ (eight industries are
  named on About), replacing 10+. Team size is 15 (Studio/About copy), replacing Home's 15+.
- **No video supplied.** Home's secondary action is "Meet the studio" → /studio (arrow, not a
  play icon, no duration). Studio's "Watch our studio" becomes "See our culture" (in-page).
- **No profile URLs supplied.** LinkedIn icons on the team cards are omitted.
- **Honest card actions.** Only the streaming project has a case study ("View Case Study");
  the others open a preview ("View Details"). The external-link glyph is omitted (no external
  destinations were supplied).
- **Case study.** Follows its own design, including its header: the case-study lockup and a
  "Case Studies" item (active) between Work and Expertise; the phone menu also keeps Contact.
  The header button reads "Start a Project" (the design's "Start in project" is a typo).
  "View project" opens product views: the supplied TV + phone cutout at native resolution with
  the featured-title and Trending Now close-ups. Related cards use the design's titles and open
  the matching work; their art is the supplied 81px strip, continued behind the caption by a
  soft, darkened cover copy of the same pixels. On small screens the TV + phone cutout and the
  screen close-ups also appear inline.
- **About.** Below the reference composition and its lower-edge ribbon: a short "How we work"
  section told through delivered projects, and a closing action. The About package has no art
  between the hero plate (ends y=449) and the bottom ribbons (y=673); the hero's lower edge fades
  out and the supplied transparent light strip from the Home divider carries the ribbons behind
  the metrics strip, visible at both sides. The second metric stays "End-to-End / Concept to
  Launch": the design's "100+ Projects Delivered" conflicts with "50+" elsewhere and is unverified.
- **Home headline.** The design reads "Technology that moves *ideas* forward." The brief quotes
  "…moves us forward." The design copy is used; change `HOME_HEADLINE_EMPHASIS` in
  `src/data/site.ts` if "us" is intended.

## Contact composition

On desktop the Contact page scales with the viewport (its `--dp` is not capped at 1px like the
other pages) and is at least one viewport tall. The artwork — the supplied backdrop plus the two
ribbon rigs — is one layer in the 1199 × 613 source frame, cover-scaled to the section, so the
lower ribbon always sits on the visible bottom edge; extra viewport height is shared above and
below the 1199 × 613 frame. Both rigs use derived backings that equal the
backdrop outside each light strip, so the globe and ribbons render once with no seams. The panel
is the supplied `inquiry-glass-panel` (clipped to its radius), the button uses the supplied
`contact-submit` surface, and the intro and form are CSS grid in normal flow. Measured at
1199 × 613, relative to the section top (header bottom at 64): panel 465,40 → 1160,521, button
508,445 → 793,492, eyebrow 62,50.

## Contact delivery

No submission handler is configured, so the form performs an explicitly labelled email-draft
hand-off to `hello@vellorasystems.com` (the address printed in the design): it validates
fields, opens a pre-filled `mailto:` draft, keeps the entered values (also kept in session
storage), and then explains the hand-off on screen with "Open the draft again" and "Copy
message". Before activation the hand-off is described to assistive technology only (the button's
description), matching the design's resting copy. A "sent" confirmation appears only after a
configured endpoint accepts the inquiry.

To connect an authorized handler, set at build time (see `.env.example`):

```
VITE_INQUIRY_ENDPOINT=https://…   # receives POST application/json {name,email,company,projectType,budget,details,source}
VITE_INQUIRY_EMAIL=…              # override the hand-off address
```

## Open dependencies

- Approved submission endpoint (or confirmation that the email hand-off is acceptable).
- Budget ranges in the form are placeholders (`src/data/site.ts`).
- Confirmed "Projects Delivered" figure, if it should return.
- Story/studio video, team profile URLs, and a full case study for any other project.
- Headline wording ("ideas" vs "us").
