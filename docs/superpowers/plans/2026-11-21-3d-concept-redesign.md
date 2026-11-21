# 3D Concept Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the WaterMart frontend to the user's "3D concept" design exactly (look, copy, CSS motion), keeping every existing flow and real data, and removing the earlier water-motion effects.

**Architecture:** Shared design tokens, fonts and `wm-` utility classes and keyframes live in `frontend/app/globals.css`. Decorative 3D pieces (CSS jar, iso platform, chips, iso map) are server-safe components in `frontend/components/three-d/` with CSS-only animation. Interactive pieces stay the existing client components (PincodeChecker, Browse, OrderForm, TrackLookup, LeadForm), restyled: markup and styles change, logic doesn't. Small pure helpers in `frontend/lib/three-d/` hold the only logic, unit-tested with `node --test`.

**Tech Stack:** Next.js 16.4.6 (read `frontend/node_modules/next/dist/docs/` before Next-specific code), React 19.3, Tailwind 4, TypeScript; `next/font/google`; Node at `~/.local/node/bin`.

**Spec:** `docs/superpowers/specs/2026-11-21-3d-concept-redesign-design.md`. Reference mockups: `docs/superpowers/specs/assets/3d-concept/{Main,Order,Track}.dc.html`, which give the exact colours, sizes, copy and keyframes to copy.

## Global Constraints

- Existing behaviour wins: re-skin only. Never change the logic of submit, OTP verification, autofill, saved addresses, pincode check, tracking lookup, cancel or waitlist.
- No new npm dependencies. Animations are CSS only. The home page (`/`) first-load client JS after must not be larger than before. Baseline is measured in Task 1.
- Light only: no `prefers-color-scheme: dark` styles and no `dark:` classes anywhere.
- Fonts: Space Grotesk (headings, numbers) and Inter (body) via `next/font/google`. Nothing may reference Manrope or Comfortaa.
- Palette (from the spec): ground `#F2F7FB`, ink `#0B1F33`, text `#3A4F64`/`#4A5B6E`, lines `#DCE6F0`/`#C6D5E4`, brand `#0057D9` (pressed `#003C99`, deep `#0047B3`), accent fill `#FF8A2A` (shadow `#C25A00`; as text use `#B85300`), dark section `#0B1F33`/`#13304D`/`#24476B`, success `#12A150`. Text contrast ≥ 4.5:1 (3:1 at 24px+).
- Every design animation is off under `prefers-reduced-motion: reduce`.
- No placeholders (`[PRICE]`, `[ETA]`, rider names), fake stats (33% full) or features without a backend (Use my location, QR scan, OTP digits, pass credits).
- Accessibility: real buttons, links and labels; touch targets ≥ 44px; decorative scenes `aria-hidden="true"`. At 390px width nothing scrolls sideways.
- Gates every task: `npm test`, `npm run build`, `npm run lint` with no new errors beyond the 3 pre-existing ones (LeadForm.tsx:36, OrderForm.tsx two unescaped-quote lines; if a task rewrites those lines, fixing them is fine).
- Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `redesign-3d`.

## Review Focus

1. **Order submit with all required fields** (name, phone, pincode, society, flat) on the restyled form: a request must still post and show the placed card. Task 6 keeps the `name=` attributes and the `submit` handler untouched; the reviewer checks the diff for them.
2. **Saved-address autofill after OTP verification** fills the restyled inputs. Task 6 keeps the `key={…fillKey}` and `defaultValue` wiring.
3. **The pincode filter in pricing reducing to 0 or 1 items** shows the empty card, or a single unrotated card. Task 2 tests `pricingLayout` for 0, 1, 2, 3 and 5 items.
4. **No live zone / no zones:** the Areas section hides or shows all-dashed blocks. Task 2 tests `zoneBlocks` for 0, 1, 3 and 5 zones, and for no live zones.
5. **Phone width (390px):** the hero scene, pricing rotation and order sticky summary don't overflow. Tasks 3, 4 and 6 drop rotation and scale the scene below `md`; Task 8 checks it in the browser.

---

### Task 1: Foundation: tokens, fonts, light only, header, footer, logo

**Files:**
- Modify: `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/components/Header.tsx`, `frontend/components/Footer.tsx`, `frontend/components/Logo.tsx`, `frontend/components/Browse.tsx` (only remove `dark:` classes), `frontend/components/PartnerPortal.tsx` (only remove `dark:` classes)
- Delete: `frontend/components/water/Ripple.tsx` (and its mount in layout and its `.ripple` CSS)

**Interfaces:**
- Produces CSS tokens on `:root`:
  - `--background`, `--foreground`, `--brand`, `--brand-dark`, `--brand-soft`, `--accent`, `--muted`, `--card`, `--line`, set to the palette above, keeping the existing Tailwind `@theme inline` names so `text-brand`, `bg-card` and the rest keep working.
  - New: `--brand-press:#003C99`, `--brand-deep:#0047B3`, `--orange:#FF8A2A`, `--orange-press:#C25A00`, `--orange-text:#B85300`, `--night:#0B1F33`, `--night-2:#13304D`, `--night-line:#24476B`, `--ok:#12A150`, `--line-2:#C6D5E4`, `--text-2:#4A5B6E`.
- Produces font variables `--font-display` (Space Grotesk) and `--font-body` (Inter), and a `.display-font` class.
- Produces utility classes for later tasks:
  - `.wm-press` (`:active{translate:0 3px}`) and `.wm-lift` (`:hover{translate:0 -4px}`).
  - `.wm-raised` (white card, `0 6px 0 var(--line)`).
  - `.btn-primary` restyled to the design's raised blue (`box-shadow:0 4px 0 var(--brand-press)`).
  - Keyframes `wmFloat`, `wmShadow`, `wmBob`, `wmWave`, `wmRipple`, `wmRise`, `wmDash`, `wmRide`, `wmPing`, `wmBreath`, `wmSheet`, copied verbatim from the mockups.
  - The reduced-motion block turning all of them off.

- [ ] **Step 1:** On the current HEAD, record the baseline. Run `npm run build`, then sum the gzip size of the client chunks the `/` route loads. Read `.next` build manifests (`app-build-manifest` or `client-reference-manifest` for `/page`) to list them. Put the number and the method at the top of your report. Later tasks reuse the same method.
- [ ] **Step 2:** In `layout.tsx`, replace Manrope and Comfortaa with `Space_Grotesk` (weights 500, 600, 700, variable `--font-display`) and `Inter` (400, 500, 600, variable `--font-body`). Remove the `<Ripple />` mount.
- [ ] **Step 3:** In `globals.css`, set the tokens. Delete the `@media (prefers-color-scheme: dark)` block, the `.ripple` rules and the earlier `.stream`, `.jar-*`, `.scooter`/`.road`, `.rider-pulse` and `.shake` rules only if no remaining file uses them (grep first; Tasks 3–7 remove their users, so leave any still referenced and note them in your report). Add the utilities and keyframes above. Body font is `var(--font-body)`; `.display`, `.title`, `h1`–`h3` use `var(--font-display)`.
- [ ] **Step 4:** Rewrite `Logo.tsx` as the design's badge: a 34px rounded square with `linear-gradient(145deg,#2B86FF,#0047B3)`, `box-shadow:0 4px 0 #00327F, 0 8px 16px rgba(0,71,179,.3)`, and a white drop SVG, next to "WaterMart" in the display font, 20px, weight 700.
- [ ] **Step 5:** Restyle `Header.tsx` to Main.dc.html lines 21–41: sticky, translucent `rgba(242,247,251,.92)` with blur. Nav links: How it works `/#how`, Pricing `/#pricing`, Areas `/#areas`, For business `/b2b`, FAQ `/faq`; keep "Become a partner" out of the main nav and put it in the footer. Buttons: My account `/account` (outlined), Track order `/track` (outlined), Order now `/order` (`.wm-lift .wm-press`, raised blue). Wrap on narrow screens. Restyle `Footer.tsx` to Main.dc.html lines 225–230, linking to the existing pages (`/faq`, `/partner`, `/b2b`); keep any existing links.
- [ ] **Step 6:** Remove every `dark:` class from `Browse.tsx` and `PartnerPortal.tsx`; change nothing else in them.
- [ ] **Step 7:** Run the gates. Then `grep -rn "font-manrope\|font-comfortaa\|prefers-color-scheme\|dark:" app components`. Expected: no hits.
- [ ] **Step 8:** Commit: `Redesign: 3D concept tokens, fonts, header, footer; light only`

### Task 2: Pure layout helpers

**Files:**
- Create: `frontend/lib/three-d/layout.ts`, Test: `frontend/lib/three-d/layout.test.ts` (sibling imports with the `.ts` extension, `node:test` and `node:assert/strict`, as in `lib/water/*.test.ts`)

**Interfaces:**
- Produces:
  - `pricingLayout(kinds: ("pass"|"jar")[]): { featured: number | null; tilted: boolean }`. 0 items: `{featured:null, tilted:false}`. Exactly 3: `{featured:1, tilted:true}`. Otherwise the index of the first `"pass"` or, failing that, 0, with `tilted:false`.
  - `zoneBlocks(zones: {name:string; status:string}[]): { name: string; live: boolean }[]`. Live (`status==="launching"`) first, keeping the original order within each group, at most 4.
  - `jarFill(jars: number): string`, which returns `` `${40 + clamp(jars,1,5)*10}%` ``.

- [ ] **Step 1: Write the failing tests**

```ts
test("pricing: empty", () => assert.deepEqual(pricingLayout([]), { featured: null, tilted: false }));
test("pricing: one", () => assert.deepEqual(pricingLayout(["jar"]), { featured: 0, tilted: false }));
test("pricing: two prefers pass", () => assert.deepEqual(pricingLayout(["jar", "pass"]), { featured: 1, tilted: false }));
test("pricing: three tilts middle", () => assert.deepEqual(pricingLayout(["jar", "pass", "pass"]), { featured: 1, tilted: true }));
test("pricing: five no pass", () => assert.deepEqual(pricingLayout(["jar", "jar", "jar", "jar", "jar"]), { featured: 0, tilted: false }));
test("zones: none", () => assert.deepEqual(zoneBlocks([]), []));
test("zones: live first, max 4", () => assert.deepEqual(
  zoneBlocks([{ name: "A", status: "waitlist" }, { name: "B", status: "launching" }, { name: "C", status: "waitlist" }, { name: "D", status: "waitlist" }, { name: "E", status: "launching" }]).map((z) => z.name),
  ["B", "E", "A", "C"]));
test("zones: no live", () => assert.ok(zoneBlocks([{ name: "A", status: "waitlist" }]).every((z) => !z.live)));
test("jarFill", () => { assert.equal(jarFill(1), "50%"); assert.equal(jarFill(5), "90%"); assert.equal(jarFill(9), "90%"); assert.equal(jarFill(0), "50%"); });
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `layout.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `Redesign: pricing, zone and jar-fill layout helpers`

### Task 3: 3D building blocks and the home hero

**Files:**
- Create: `frontend/components/three-d/CssJar.tsx`, `frontend/components/three-d/HeroScene.tsx`
- Modify: `frontend/app/page.tsx` (hero section), `frontend/components/PincodeChecker.tsx` (markup/styles only)
- Delete: `frontend/components/water/HeroJar.tsx`, `PourIntro.tsx`, `ScrollStream.tsx`, `Splash.tsx`, `OrderHeadingJar.tsx`, `frontend/lib/water/celebrate.ts`, `celebrate.test.ts`, `stream.ts`, `stream.test.ts`. Also remove the Splash mount in layout, the `watermart:*` events, `data-stream` attributes and CSS no longer used.

**Interfaces:**
- Consumes the Task 1 tokens and keyframes.
- Produces:
  - `CssJar({ size = "lg" | "sm", level = "74%", capped = true, float = true, label = true }: {...})`. A server-safe (no hooks, no `"use client"`) port of Main.dc.html lines 72–89 (`lg`, 200×330) and Order.dc.html's 104×140 jar (`sm`). Water height comes from `level` with `transition: height .6s cubic-bezier(.3,1.4,.5,1)`, the waving surface uses `wmWave`, the wrapper `wmFloat` (when `float`) with a `wmShadow` shadow, `capped=false` hides the cap and band, and `label` shows the "20L · ISI SEALED" tag (`lg` only). `aria-hidden="true"`.
  - `HeroScene({ otpDemo = "4827" })`: Main.dc.html lines 64–104 (platform, ripple rings, `CssJar size="lg"`, three bobbing chips). Server-safe. Below `md`, scale it to fit (e.g. `transform: scale(.72)` with the height adjusted) so nothing overflows at 390px.

- [ ] **Step 1:** Implement `CssJar` and `HeroScene`, copying the mockups' inline styles. Inline styles or Tailwind arbitrary values are both fine; keep the exact values.
- [ ] **Step 2:** Rebuild the hero in `page.tsx` per Main.dc.html lines 44–105:
  - Live badge with the green dot. The text is `Now delivering in {first launching zone name}` from `catalog.zones`, streamed inside the existing `Suspense` and `loadData()` pattern; hidden when there's none. The static shell keeps everything else instant.
  - H1 with `wmRise`, lead text, PincodeChecker, three tick points, and `<HeroScene />` on the right.
- [ ] **Step 3:** Restyle PincodeChecker as the design's search bar (Main.dc.html lines 51–55): white rounded container, borderless input, raised "Check delivery" button with `.wm-press`. Keep its state, fetch, messages, `role="status"`/`alert` and the "Order now" link. Remove the old shake and event-dispatch code from Task 4 of the previous plan.
- [ ] **Step 4:** Delete the files listed above and their imports. Run `grep -rn "watermart:\|ScrollStream\|PourIntro\|Splash\|HeroJar\|burst(" app components lib`. Expected: no hits.
- [ ] **Step 5:** Run the gates. Measure `/` first-load JS with the Task 1 method and report it next to the baseline.
- [ ] **Step 6:** Commit: `Redesign: 3D hero with floating CSS jar; remove pour, stream and splash`

### Task 4: Home sections: how it works, trust, areas, waitlist

**Files:**
- Create: `frontend/components/three-d/IsoAreasMap.tsx`
- Modify: `frontend/app/page.tsx` (sections `#how`, trust, `#areas` (rename the "Where we deliver" section's id to `areas`), the waitlist; remove the old order-heading jar), `frontend/components/LeadForm.tsx` (markup/styles only)

**Interfaces:**
- Consumes `zoneBlocks` (Task 2) and the Task 1 tokens.
- Produces `IsoAreasMap({ blocks }: { blocks: { name: string; live: boolean }[] })`: Main.dc.html lines 197–205, a rotated `rotateX(58deg) rotateZ(-45deg)` plate.
  - Live blocks are raised blue (stacked shadows) and the rest are flat white with a dashed border.
  - Layout by count: 1 centred, 2 side by side, 3 as two plus one, 4 as 2×2. `aria-hidden="true"`; returns null for 0 blocks.

- [ ] **Step 1:** "Three taps to a full jar": three raised tiles with 3D numbers (Main.dc.html lines 108–128), copy verbatim, `.wm-lift` on the tiles.
- [ ] **Step 2:** "Water you can check yourself": four raised cards with the design's icons and copy (lines 163–183).
- [ ] **Step 3:** "Where we deliver" (lines 186–206), streamed via `loadData()`:
  - The list from `catalog.zones`. Live zones get the green "Live" pill; others get a "Notify me" link to `#notify`, with the zone's `areas.join(", ")` as the grey sub-text.
  - The map uses `zoneBlocks`.
  - Hide the whole section when there are no zones.
- [ ] **Step 4:** "Your first jar is free" banner (lines 209–223) with `id="notify"`. Text: "You only pay the ₹{deposit} refundable jar deposit." from the catalog, streamed. No progress bar. Restyle LeadForm's input and button to the banner style (white input, white raised button with blue text), keeping its fields, submit, messages and props.
- [ ] **Step 5:** Run the gates.
- [ ] **Step 6:** Commit: `Redesign: how-it-works tiles, trust cards, iso areas map, waitlist banner`

### Task 5: Dark 3D pricing

**Files:**
- Modify: `frontend/components/Browse.tsx` (markup/styles; keep its `Item` type, chips and pincode filter logic), `frontend/app/page.tsx` (the `#pricing` section wrapper becomes the dark band)

**Interfaces:**
- Consumes `pricingLayout` (Task 2) and the `Item` type (existing; unchanged).

- [ ] **Step 1:** The `#pricing` section becomes the full-width dark band (`background:#0B1F33`, Main.dc.html lines 131–160). Title "Choose how you refill" and sub-text "The pass most homes pick sits forward. Deposit shown separately on every card.", streamed as today with its skeleton restyled for the dark band.
- [ ] **Step 2:** Browse markup:
  - The pincode field and filter chips restyled for the dark band: raised white field, chips as pills, `aria-pressed` kept.
  - Cards from `shown` with `pricingLayout(shown.map(i => i.kind))` worked out from the current `shown` list.
  - The featured card is white, raised (`0 8px 0 #0047B3, 0 30px 60px rgba(0,87,217,.45)`), with the "Most popular" pill and a primary button. Others are `#13304D` with a `#24476B` border and an outlined button.
  - When `tilted` and at `md+`, side cards get `rotateY(±14deg)` inside `perspective:1400px`. Never tilt below `md`.
  - Card content: seller/brand uppercase label, name, price `₹{price}`, note, `+ ₹{deposit} refundable deposit` (Browse needs the deposit: add an optional `deposit?: number` to `Item`, filled in `page.tsx` from `catalog.deposit_per_jar` or the listing's `deposit_per_jar`), and a link to `/order?product={item.pick}` (or the existing link Browse uses today; keep its current target).
  - Empty `shown`: one raised card reading `No partner delivers to {pin} yet`, linking to `#notify`; without a 6-digit pin, `No products match this filter`.
  - Replace any `Jar` import with `CssJar size="sm" float={false}` or drop the image to match the design.
- [ ] **Step 3:** Run the gates.
- [ ] **Step 4:** Commit: `Redesign: dark 3D pricing cards with real prices`

### Task 6: Order form re-skin

**Files:**
- Modify: `frontend/components/OrderForm.tsx` (markup and styles only), `frontend/app/order/page.tsx` (page shell styling; replace its `Jar` with `CssJar`)
- Delete: `frontend/components/water/LivingJar.tsx`, `frontend/components/water/Scooter.tsx`, `frontend/lib/water/orderFill.ts`, `orderFill.test.ts`, `jar.ts`, `jar.test.ts`, `ticker.ts`, and `frontend/components/Jar.tsx` if nothing else uses it. Remove the fill meter, the "N% full" label and their state.

**Interfaces:**
- Consumes `CssJar` (Task 3) and `jarFill` (Task 2).

- [ ] **Step 1:** Product card (Order.dc.html lines 26–43):
  - `CssJar size="sm" level={jarFill(jars)}`.
  - Brand label: `listing.partner` uppercase, or "WaterMart". Product name and `₹{price} per jar · ISI sealed`; a "Verified plant" pill when it's a partner listing.
  - The existing product radio cards restyled as raised selectable cards (selected: `2px solid #0057D9` with `0 4px 0 #0047B3`), radios still `sr-only` inputs.
- [ ] **Step 2:** Quantity card (lines 45–60):
  - "How many jars?" with the −/+ stepper: 44px raised buttons with `.wm-press`, `aria-label` "Fewer jars"/"More jars", the existing `jars` state clamped 1–5, replacing the `<select>`.
  - The has-jars checkbox becomes the design's toggle row: a real `<input type="checkbox">` inside a `<label>` styled like the design, with the same onChange. The verification UI below it is restyled, logic untouched.
- [ ] **Step 3:** "Deliver to" card (lines 62–66): the existing inputs (name, phone, pincode with its messages, society, tower, flat, notes) in the design's input style. Keep the `name=`, `key=`, `defaultValue`, `required` and `pattern` attributes exactly. No "Use my location".
- [ ] **Step 4:** "When?" (lines 68–76): the existing slot radios as raised selectable buttons.
- [ ] **Step 5:** Summary:
  - Below `lg`, a fixed bottom sheet (lines 79–83) with the real `{jars} × ₹{price}` and deposit line, a "Request delivery ₹{amount+deposit}" submit button (`.wm-press`, raised blue) and "No payment now. UPI link arrives on WhatsApp."
  - Add bottom padding to the form so the sheet never covers the last field.
  - At `lg+`, the same content in the existing sticky aside card.
  - The submit button keeps `disabled={busy || wrongArea}` and the error message.
- [ ] **Step 6:** Placed card: design styling with `CssJar size="sm" level="90%" capped`, the existing details list, "Track this order" (raised primary) and "Place another". Keep `scrollIntoView` on the placed card. Remove the scooter, splash and celebration code.
- [ ] **Step 7:** Run the gates. Then `grep -rn "LivingJar\|Scooter\|orderFill\|lib/water/jar\|ticker" app components lib`. Expected: no hits.
- [ ] **Step 8:** Commit: `Redesign: order form in the 3D style; jar fills by jar count`

### Task 7: Track page re-skin

**Files:**
- Create: `frontend/components/three-d/TrackScene.tsx` (`"use client"` only if needed for the tween; CSS animation preferred)
- Modify: `frontend/components/TrackLookup.tsx` (markup/styles; logic untouched), `frontend/app/track/page.tsx` (shell)
- Delete: `frontend/components/water/RiderMap.tsx` and its CSS. Keep `frontend/lib/water/rider.ts` and its test, or move them to `lib/three-d/` with the import paths updated.

**Interfaces:**
- Consumes `riderProgress(status): number | null` (existing), `STATUS_LABEL`, `STEPS`, `SLOTS` (`lib/orders.ts`).
- Produces `TrackScene({ progress }: { progress: number })`: Track.dc.html lines 23–55.
  - The iso city grid, the dashed route with `wmDash`, and the scooter pin moving along `offset-path` to `progress`. Use a CSS custom property `--to: {progress*86}%` with a one-shot keyframe from 0% to `var(--to)`, ending there. If `offset-distance` can't animate to a custom property, set the end value inline and animate with a transition after mount.
  - The home pin with `wmPing`. `aria-hidden="true"`, with a visually hidden status sentence next to it for screen readers.

- [ ] **Step 1:** Restyle the lookup form (code, phone, Track button) as raised inputs and a primary button.
- [ ] **Step 2:** When an order is found and `riderProgress(order.status) !== null`, render `TrackScene`. Below it, the bottom sheet (lines 59–75) sliding up with `wmSheet`, containing:
  - Small label `STATUS_LABEL[status]`, and the big line from the slot's label, matched by text from `order.slot`. Never an ETA.
  - The 4-step raised bar over `STEPS`: done steps blue, the current one orange with `wmBreath` (label text `#0B1F33`, weight 600), the rest grey.
  - The existing order details, total and the Cancel button with the same condition and handler.
  - Cancelled or unknown status: no scene, the sheet shows the existing cancelled message.
  - Phone: full width. `md+`: the scene and sheet centred, max-width about 560px.
- [ ] **Step 3:** Run the gates.
- [ ] **Step 4:** Commit: `Redesign: 3D tracking map with moving scooter and status sheet`

### Task 8: Cleanup, budget and visual check

- [ ] **Step 1:** Remove anything left from the old water work: `frontend/components/water/` should be empty or gone, and `lib/water/` should hold only what's still imported. Check with `grep -rn "components/water\|lib/water" app components lib` and unused CSS selectors in `globals.css`.
- [ ] **Step 2:** Run `npm run build`, then measure `/` first-load JS with the Task 1 method. Expected: ≤ the Task 1 baseline. If larger, find what grew (a server-safe component that became client, a heavy import) and fix it.
- [ ] **Step 3:** Run `npm run dev`. With the Playwright browser tool, open `/` at 1440×900 and 390×844. Screenshot the hero, pricing, areas and waitlist, and compare by eye with `Main.dc.html` (open the mockup HTML in the browser too, or read it). Then `/order` at 390×844 against `Order.dc.html`, and `/track` with a looked-up order (if the local API isn't running, check the empty lookup state and say so) against `Track.dc.html`. Fix visible mismatches in layout, colour or spacing. Check that nothing scrolls sideways at 390 (`document.documentElement.scrollWidth <= 390`).
- [ ] **Step 4:** With the Playwright tool's reduced-motion emulation, confirm the animations are off: computed `animation-name` is `none` on the floating jar.
- [ ] **Step 5:** Run the gates and commit: `Redesign: cleanup, budget check and visual fixes`
