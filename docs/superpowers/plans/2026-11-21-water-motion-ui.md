# Water Motion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the approved water motion (opening pour, living jar, scroll stream, splashes, filling order jar, tracking illustration, ripples) and the Premium blue palette to the WaterMart frontend, without slowing the site down.

**Architecture:** Pure math lives in `frontend/lib/water/*.ts`, with no DOM, and is unit-tested with Node's built-in test runner. Small `"use client"` components in `frontend/components/water/` render static SVG on the server and animate after hydration. One shared `requestAnimationFrame` loop (`ticker.ts`) drives every animated piece, and each piece unsubscribes while it's off screen. Port behaviour from the reference demo: `/private/tmp/claude-501/-Users-vikas-Desktop-water-plan/a3693def-692b-46fc-930d-a88edb057611/scratchpad/jaldrop-motion.html` (copy it into `docs/superpowers/specs/assets/` in Task 1 so it outlives the scratchpad).

**Tech Stack:** Next.js 16.4.6 (App Router; read `frontend/node_modules/next/dist/docs/` before writing code, per `frontend/AGENTS.md`), React 19.3, Tailwind 4, TypeScript. Tests use `node --test` (Node ≥ 22.18, which strips TS types natively).

**Spec:** `docs/superpowers/specs/2026-11-21-water-motion-ui-design.md`

## Global Constraints

- No new npm dependencies, runtime or dev.
- Added client JS stays under about 10 KB gzipped. Check with `npm run build` route sizes, before vs after.
- Text and forms are visible and usable at first paint. Animation never sets content to `opacity:0` and never blocks input.
- `prefers-reduced-motion: reduce` means: jar full and still, no pour, no stream, no splashes, no ripple.
- Each animated piece pauses while off screen (IntersectionObserver), and the shared loop stops when it has no subscribers.
- Premium palette in both light and dark mode. Manrope stays. Brand name stays "WaterMart". Keep all existing copy.
- Requires Node.js on the machine. It is currently missing, so install it before Task 1.

## Review Focus

1. **Streamed sections shifting layout.** Pricing and Order arrive via Suspense after the stream path has been measured. Expect the path to re-measure, never point at stale positions. Test: Task 5, `ScrollStream` re-measures on `ResizeObserver(document.body)`.
2. **Visiting a page mid-scroll** (reload while scrolled, or a `/#order` link). Expect the stream tip to start at the current scroll position, not run down from the top. Test: Task 2, `streamTip` clamps.
3. **Pincode API failure or slow response.** Expect the existing error message, no splash, and no stuck jar. Test: Task 4, `celebrateFor("error")` returns `"none"`.
4. **Order form autofill** (a saved address picked, or `defaultValue` set via `fillKey`). Expect the jar to reflect the filled fields at once, not only after typing. Test: Task 6, `orderFill` is computed from form state on every change.
5. **Cancelled order on the track page.** Expect no rider and no splash, with the cancelled message as today. Test: Task 7, `riderProgress("cancelled")` returns `null`.

---

### Task 1: Premium palette and ripple

**Files:**
- Modify: `frontend/app/globals.css` (`:root` tokens, dark block, `.field:focus` shadow, `.btn`)
- Create: `frontend/components/water/Ripple.tsx`
- Modify: `frontend/app/layout.tsx` (mount `<Ripple />` once in `<body>`)
- Copy: the demo HTML to `docs/superpowers/specs/assets/jaldrop-motion.html`

**Interfaces:**
- Produces: tokens `--brand`, `--brand-dark`, `--brand-soft`, `--accent`, `--line`, `--background`, `--muted`, plus a new `--water-1: #7cc8ff` and `--water-2: #1c6fd0`, used by later tasks.

- [ ] **Step 1:** Replace the green tokens. Light: `--background:#F2F8FD; --foreground:#0B2540; --brand:#1570D6; --brand-dark:#0F5BB0; --brand-soft:#DDEFFD; --accent:#3D93EA; --muted:#52708B; --line:#D6E7F4`. Dark: `--background:#061626; --foreground:#E5F1FB; --card:#0D2136; --brand:#4DA3FF; --brand-dark:#8CC4FF; --brand-soft:#0F2D4A; --accent:#3A8FDB; --muted:#94B1CA; --line:#1C3853`. Change `.field:focus` to `rgba(21,112,214,.2)`. In dark mode, change `.btn-primary` text to `#04121F`.
- [ ] **Step 2:** Implement `Ripple(): null`. It adds one document `pointerdown` listener that appends a `.ripple` span inside the nearest enabled `.btn`, and does nothing under reduced motion. Add `.btn{position:relative;overflow:hidden}` and the demo's `.ripple`/`@keyframes rip` CSS.
- [ ] **Step 3:** Run `cd frontend && npm run build && npm run lint`. Expected: both succeed. Note the "First Load JS" for `/` as the baseline.
- [ ] **Step 4:** Run `npm run dev`. Open `/`, `/order`, `/track` in light and dark mode. Expected: no green anywhere (also check `text-green-600` on the order pincode line; leave it, since it's a semantic success colour), and buttons ripple.
- [ ] **Step 5:** Commit: `git commit -m "Premium blue palette and water ripple on buttons"`

### Task 2: Water math and the shared ticker

**Files:**
- Create: `frontend/lib/water/jar.ts`, `frontend/lib/water/stream.ts`, `frontend/lib/water/ticker.ts`
- Test: `frontend/lib/water/jar.test.ts`, `frontend/lib/water/stream.test.ts`
- Modify: `frontend/package.json` (script `"test": "node --test lib/**/*.test.ts"`)

**Interfaces:**
- Produces:
  - `type JarState = { level: number; target: number; phi: number; v: number }`
  - `stepJar(s: JarState, angleDeg: number, dt: number): JarState`: spring from the demo (`v += ((-angle·π/180 − phi)·0.05 − v·0.07)·dt·60`), with level easing at `dt·2.5`
  - `surfaceY(s: JarState, x: number, t: number): number`: `252 − level·172 + tan(phi)·(x−80) + amp·(sin(.07x+2.3t) + .5 sin(.16x−1.7t))`, where `amp = 1.4 + min(7, |v|·140)`
  - `waterPath(s: JarState, t: number): { fill: string; surface: string }`: x from −10 to 170, step 10
  - `cubicSeg(x0, y0, x1, y1): { d: string; pts: [number, number][]; y0: number; y1: number }`: 61 samples
  - `xAtY(seg, y): number`
  - `streamTip(scrollY: number, viewportH: number, top: number, bottom: number): number`: clamp(`scrollY + 0.6·viewportH`, top, bottom)
  - `subscribe(fn: (t: number, dt: number) => void): () => void`: one rAF loop that starts on the first subscriber and stops on the last; `dt` capped at 0.05

- [ ] **Step 1: Write failing tests**

```ts
// jar.test.ts
test("level eases toward target", () => { const s = stepJar({level:0,target:1,phi:0,v:0}, 0, 0.1); assert.ok(s.level > 0 && s.level < 1); });
test("full jar surface near y=80 when still", () => assert.ok(Math.abs(surfaceY({level:1,target:1,phi:0,v:0}, 80, 0) - 80) < 3));
test("water stays level in world: tilting jar +9deg drives phi negative", () => { let s={level:.5,target:.5,phi:0,v:0}; for(let i=0;i<300;i++) s=stepJar(s,9,1/60); assert.ok(Math.abs(s.phi + 9*Math.PI/180) < 0.01); });
test("waterPath closes the fill", () => assert.match(waterPath({level:.5,target:.5,phi:0,v:0},0).fill, /L170 270L-10 270Z$/));
// stream.test.ts
test("tip clamps to top", () => assert.equal(streamTip(0, 800, 900, 3000), 900));
test("tip clamps to bottom when reloaded far down", () => assert.equal(streamTip(5000, 800, 900, 3000), 3000));
test("tip follows 60% of viewport", () => assert.equal(streamTip(1000, 800, 900, 3000), 1480));
test("xAtY interpolates an S-curve endpoint", () => { const s = cubicSeg(100,0,300,400); assert.equal(Math.round(xAtY(s,400)), 300); assert.equal(Math.round(xAtY(s,0)), 100); });
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules with the signatures above.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit: `git commit -m "Water math helpers and shared animation ticker"`

### Task 3: LivingJar component (replaces Jar)

**Files:**
- Create: `frontend/components/water/LivingJar.tsx`
- Modify: `frontend/components/Jar.tsx`. Keep it as the static server SVG (same body path), adding `capped?: boolean`, `face?: false`, and exported `JAR_BODY` path, plus slots for `.water`, `.surf` and `.bub`, with a default level of 0.78.

**Interfaces:**
- Consumes: `stepJar`, `waterPath`, `surfaceY`, `subscribe`
- Produces: `LivingJar({ className, level = 0.78, capped = true, tilt = false, onReady }: { className?: string; level?: number; capped?: boolean; tilt?: boolean; onReady?: (api: JarApi) => void })` with `type JarApi = { kick(a: number): void; setTarget(level: number): void; setLevel(level: number): void; setCapped(c: boolean): void; hop(): void; el: SVGSVGElement }`

- [ ] **Step 1:** Implement. The server renders `<Jar>` with the water path at `level` (still). After mount, subscribe to the ticker while intersecting. 8 bubbles. `tilt` turns on the pointer/drag tilt plus idle sway on a wrapper (`rotateX(−cy·14) rotateY(cx·26) rotateZ(−cx·9)`, perspective 900px), and passes that `rotateZ` into `stepJar`. Port the `.cap` transition, `.uncapped`, `.hop` keyframes and floating drops from the demo into `globals.css`. Under reduced motion, don't subscribe.
- [ ] **Step 2:** Use it in the `page.tsx` hero (`tilt`) and in the `#order` heading (small, no tilt).
- [ ] **Step 3:** Run `npm run build && npm run lint`. Expected: success. In `npm run dev`, the jar waves, tilts toward the mouse, and shows still and full with reduced motion on (macOS: Accessibility › Display › Reduce motion).
- [ ] **Step 4:** Commit: `git commit -m "Living hero jar with waves, bubbles and tilt"`

### Task 4: Opening pour, splash canvas and pincode celebration

**Files:**
- Create: `frontend/components/water/Splash.tsx` (fixed canvas; exports `burst(x: number, y: number, n = 46, scale = 1): void` through a module-level emitter, Premium blue colours only)
- Create: `frontend/components/water/PourIntro.tsx`
- Create: `frontend/lib/water/celebrate.ts`, Test: `frontend/lib/water/celebrate.test.ts`
- Modify: `frontend/components/PincodeChecker.tsx`, `frontend/app/page.tsx`, `frontend/app/layout.tsx` (mount `<Splash />`)

**Interfaces:**
- Consumes: `JarApi` (hero jar via `onReady`), `subscribe`
- Produces: `celebrateFor(status: "launching" | "waitlist" | "unserved" | "invalid" | "error"): "splash" | "shake" | "none"`, and a `window` event `"watermart:pincode"` with `detail: { status }`, which the hero listens for to call `jar.hop()`, `jar.kick(.06)` and `burst`

- [ ] **Step 1:** Write a failing test: `launching→splash`, `waitlist→shake`, `unserved→shake`, `invalid→shake`, `error→none`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `celebrateFor`. In `PincodeChecker`, dispatch the event after a result or an error, and shake the input on `"shake"`. Copy stays unchanged.
- [ ] **Step 4:** Implement `PourIntro({ jar }: { jar: JarApi | null })`, with the timeline taken from the demo: head falls 0.3–0.75 s, filling 0.75–2.55 s to 0.78, tail falls 2.5–2.9 s, cap at 3.05 s, removed at 3.6 s. Stream half-width is `11 − 3f`, plus wobble. Under reduced motion, render nothing. Mount it in the hero. The hero jar starts at `level 0` and `capped=false` only on the client and only when motion is allowed. The server HTML keeps the full, capped jar, so first paint looks finished.
- [ ] **Step 5:** Run `npm test && npm run build`. Expected: PASS. In dev, reload `/` and watch the pour. Pincode 400053 (or any `launching` pincode from the API) splashes, and an unserved one shakes.
- [ ] **Step 6:** Commit: `git commit -m "Opening water pour and splash on serviceable pincode"`

### Task 5: Scroll stream

**Files:**
- Create: `frontend/components/water/ScrollStream.tsx`
- Modify: `frontend/app/page.tsx` (mount once; mark anchors with `data-stream="source"` on the hero section, `data-stream="jar"` on the order jar, `data-stream="end"` on the "How it works" grid, since the home page has no tracking map)

**Interfaces:**
- Consumes: `cubicSeg`, `xAtY`, `streamTip`, `subscribe`, `burst`, `JarApi.kick` (via the `"watermart:stream-hit"` event with `detail: { anchor: "jar" | "end" }`)

- [ ] **Step 1:** Implement it as an absolutely positioned SVG over the document (`pointer-events:none`, `z-index:5`): segment A runs from the source bottom to the jar neck, segment B from below the jar to the end anchor's top-centre. Use the three strokes `.fb` 38px/18%, `.fc` 16px `#5fb4f5`, `.fs` 4px white dashed 14/30 flowing, revealed by a clip rect of height `tip`, with the tip eased at `dt·4.5`. The head drop is scaled 1.7. Re-measure on `ResizeObserver(document.body)`, `document.fonts.ready`, and `resize`. Under reduced motion, render nothing.
- [ ] **Step 2:** Run `npm run build`. Expected: success. In dev: scroll down, and the stream follows, splashes into the order jar, and ends at "How it works". Reload while scrolled to the bottom, and the tip starts at the bottom. While the Pricing skeleton is replaced, the path re-measures (it doesn't cut through cards).
- [ ] **Step 3:** Commit: `git commit -m "Scroll-following water stream on the home page"`

### Task 6: Order form fills the jar

**Files:**
- Create: `frontend/lib/water/orderFill.ts`, Test: `frontend/lib/water/orderFill.test.ts`
- Create: `frontend/components/water/Scooter.tsx` (demo scooter SVG plus the `ride` keyframes)
- Modify: `frontend/components/OrderForm.tsx` (summary `<aside>`: a small `LivingJar` and meter above "Summary"; `Scooter` on the `placed` card)

**Interfaces:**
- Produces: `orderFill(f: { product: boolean; name: string; phone: string; pincode: string; society: string; flat: string; slot: boolean }): { done: number; total: 7; level: number; missing: string | null }`, where `level = 0.1 + done/7·0.8`. `missing` is the friendly label of the first gap: "your name", "your WhatsApp number", "your pincode", "your building", "your flat number".

- [ ] **Step 1:** Write failing tests: everything empty gives `done:2` (product and slot have defaults) and `missing:"your name"`. A phone with 9 digits doesn't count, and 10 does (spaces ignored). Name length ≥ 2. Pincode is 6 digits. A complete form gives `level:0.9` and `missing:null`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. In `OrderForm`, track the uncontrolled inputs with one `onInput` handler on the `<form>` that reads `FormData`, and recompute after `fillKey` changes (autofill). Kick the jar when `done` rises. Show `"{pct}% full · add {missing}"` or "Full! Ready to go". The jar's cap drops and a splash fires when `placed` is set, and the placed card shows `<Scooter />`.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS. In dev: fill the form and the jar rises. Picking a saved address fills it at once. Submitting shows the capped jar and the scooter ride.
- [ ] **Step 5:** Commit: `git commit -m "Order jar fills as the form is completed; scooter on confirmation"`

### Task 7: Tracking illustration

**Files:**
- Create: `frontend/lib/water/rider.ts`, Test: `frontend/lib/water/rider.test.ts`
- Create: `frontend/components/water/RiderMap.tsx`
- Modify: `frontend/components/TrackLookup.tsx` (render `<RiderMap status={order.status} />` above the step bar when not cancelled)

**Interfaces:**
- Consumes: `STEPS` from `@/lib/orders`, `burst`
- Produces: `riderProgress(status: string): number | null`, with `requested→0`, `confirmed→0.15`, `out_for_delivery→0.6`, `delivered→1`, `cancelled→null`. Read the actual `STEPS` values in `lib/orders.ts` and map every one of them.

- [ ] **Step 1:** Write failing tests for every value in `STEPS`, plus `cancelled→null` and unknown→`null`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. `RiderMap` uses the demo SVG (plant, dotted route, pulsing rider, house). It animates the rider from 0 to `riderProgress` over 1.2 s, then idles with the pulse. At 1 it fires one `burst` on the house. Under reduced motion, it places the rider directly with no burst.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS. In dev, look up an order. The rider stops at the right point, and a cancelled order shows no map.
- [ ] **Step 5:** Commit: `git commit -m "Animated rider map on the track page"`

### Task 8: Budget and reduced-motion check

- [ ] **Step 1:** Run `npm run build`. Expected: "First Load JS" for `/` is at most about 10 KB gzipped above the Task 1 baseline. If it's over, lazy-load `PourIntro`/`ScrollStream` with `next/dynamic` (`ssr:false`).
- [ ] **Step 2:** With Reduce motion on, check `/`, `/order`, `/track`. Expected: full still jar, no pour, no stream, no splashes, no ripple.
- [ ] **Step 3:** In Chrome DevTools Performance, with 4× CPU throttling on `/`, scroll top to bottom. Expected: no long tasks over 50 ms from the water code, and the loop stops (no rAF) once everything is off screen and the pour has ended.
- [ ] **Step 4:** Commit any fixes: `git commit -m "Keep water motion within the performance budget"`
