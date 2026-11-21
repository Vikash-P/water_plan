# WaterMart 3D concept redesign: design

Reference design (the user's canvas "WaterMart 3D UI Concept", version 1795275296-0dd3), copied into the repo:
- `docs/superpowers/specs/assets/3d-concept/Main.dc.html`: home page, desktop 1440 wide, fluid
- `docs/superpowers/specs/assets/3d-concept/Order.dc.html`: mobile order flow, 390×844
- `docs/superpowers/specs/assets/3d-concept/Track.dc.html`: mobile live tracking, 390×844

These files are the source of truth for the look: colours, fonts, sizes, spacing, radii, shadows, copy and CSS animations. They are static mockups written as inline-styled HTML. Port them to the Next.js app as components and CSS. Don't embed them.

## Why
The user wants visitors to feel happy and excited when the site opens. They designed this chunky, raised "3D" look with its own CSS motion and chose to use it exactly, replacing the water effects shipped earlier (the pour, scroll stream, tilting jar, splashes, ripples and scooter). Performance-first still holds: every change must keep the site fast.

## Goals
1. **Site-wide look.** Fonts Space Grotesk (headings) and Inter (body), loaded with `next/font/google`, replacing Manrope and Comfortaa. Light palette from the design: ground `#F2F7FB`, ink `#0B1F33`, body text `#3A4F64`/`#4A5B6E`, lines `#DCE6F0`/`#C6D5E4`, brand `#0057D9` with pressed shadow `#003C99`, accent orange `#FF8A2A`/`#C25A00`, dark section `#0B1F33`/`#13304D`, success `#12A150`. Raised buttons (`box-shadow: 0 4px 0 <darker>`), the press effect (`.wm-press:active{translate:0 3px}`) and the hover lift (`.wm-lift:hover{translate:0 -4px}`). These update the shared tokens in `frontend/app/globals.css`, so every page (FAQ, B2B, partner, account, admin) picks up the new colours and fonts without its layout changing.
2. **Header and footer** as in Main.dc.html: water-drop badge plus "WaterMart" in Space Grotesk; nav links How it works, Pricing, Areas, For business, FAQ; Track order (outlined) and Order now (raised primary) buttons. Keep the existing "My account" link, styled like Track order. Footer layout and links as in the design, pointing at the site's existing pages.
3. **Home page** (`frontend/app/page.tsx`), sections in the design's order, with its copy and animations:
   - **Hero:**
     - Live-area badge, H1 (rises on load), lead text.
     - The pincode check in the design's search-bar style, keeping the existing PincodeChecker logic and messages.
     - Three tick points.
     - The 3D scene: isometric platform, ripple rings, floating CSS jar with waving water, three bobbing chips ("About 2 hours", "QR seal on every jar", OTP "4827").
     - The live-area badge text comes from the catalog: the first zone with status "launching", e.g. "Now delivering in Andheri West". With none, the badge is hidden.
   - **How it works ("Three taps to a full jar"):** three raised tiles with 3D numbers; copy from the design.
   - **Pricing (dark section, "Choose how you refill"):**
     - Cards in the design's style (side cards rotated ±14°, the featured card forward with a "Most popular" badge), filled with real data.
     - Partner listings when any exist, otherwise WaterMart's own catalog products, the same rule as today's `Pricing()`.
     - With exactly 3 items, the middle one is featured. Otherwise the featured card is the catalog item marked as a pass, or for partner listings the first, and items wrap into rows with no rotation.
     - Each card shows the real price and the refundable deposit (`deposit_per_jar` from the catalog, or the listing's own), and links to ordering that item. The existing Browse pincode filter keeps working, restyled as a raised search field above the cards.
     - `[PRICE]`/`[DEPOSIT]` placeholders never appear.
   - **Order section:** the existing OrderForm (Goal 4) sits on the home page as today, under a heading in the design's style.
   - **Trust ("Water you can check yourself"):** four raised cards with the design's icons and copy.
   - **Areas ("Where we deliver"):** the list plus the isometric block map, both from `catalog.zones`. Live zones (status "launching") get a "Live" badge and a raised blue block. Others get "Notify me" (links to the waitlist section) and a flat dashed block. The map shows up to 4 blocks in a 2×2 grid, live zones first.
   - **Waitlist ("Your first jar is free"):** blue banner with the existing LeadForm (kind "waitlist") restyled in the design's input and button style. The text uses the real deposit ("You only pay the ₹{deposit} refundable jar deposit"). Drop the progress bar and "33% full", since there's no real number behind them.
4. **Order form** (`frontend/components/OrderForm.tsx`) in the style of Order.dc.html:
   - **Product card:** the floating CSS jar whose water level shows the jar count, `(40 + jars*10)%` with the springy height transition and waving surface. Shows the selected product's partner/brand name, name, price and a "Verified plant" pill for partner listings.
   - **Product choice** (existing radio cards) restyled as raised selectable cards.
   - **Quantity:** "How many jars?" with the −/+ stepper (raised buttons, 1–5, the existing `jars` state, replacing the `<select>`). Below it, the existing "I already have jars to swap" checkbox as the design's toggle row, keeping its verification flow (send code, verify, saved addresses).
   - **"Deliver to" card:** the existing fields (name, WhatsApp number, pincode with its serviceability message, society, tower, flat, notes) in the design's input style.
   - **"When?":** the three existing slots as raised selectable buttons.
   - **Summary:** on phones (<1024px) a sticky bottom sheet in the design's style with the real line items, the Request delivery button showing the real total, and "No payment now. UPI link arrives on WhatsApp." On desktop, the same content in the existing sticky side card.
   - Submission, validation, errors, autofill, the reorder reset and the placed card keep their current behaviour. The placed card is restyled in the design language with a full, capped CSS jar, and keeps the order details and the "Track this order" link.
5. **Track page** (`frontend/app/track` and `frontend/components/TrackLookup.tsx`): the lookup form restyled. Once an order is found, the result shows the Track.dc.html composition:
   - The isometric city map with the animated dashed route.
   - The scooter moving along the route, positioned by status (requested 0%, confirmed 15%, out_for_delivery 60%, delivered 100%; the existing `riderProgress` mapping). It animates from 0 to the status position, then idles.
   - The pulsing home pin, and a bottom sheet that slides up.
   - Status line: "Out for delivery" and similar from `STATUS_LABEL`, with the slot as the big line, e.g. "ASAP (within ~2 hours)", instead of an ETA.
   - The 4-step raised progress bar, current step orange and glowing.
   - The order details and the cancel button as today.
   - Cancelled orders show the cancelled message with no map. On phones it's full width; on desktop the map sits above the sheet card, centred, max width about 560px.
6. **Reduced motion:** every design animation is off under `prefers-reduced-motion: reduce`, as in the design's own CSS.

## Non-goals
- Rider name, ETA minutes, delivery OTP, pass credits, empties count, the "Scan jar seal QR" button and "Use my location". There's no backend data or feature behind them yet. Leave them out; don't show placeholders.
- Dark mode. The design is light only, and the site becomes light only.
- Redesigning the layouts of the FAQ, B2B, partner, account and admin pages beyond the token change.
- Any backend or API change.

## Anti-goals (a failure even if it works)
- Slower first load. No new npm dependencies; animations are CSS; client JS for the home page must not grow. Removing the water-motion components should shrink it.
- Content hidden at first paint. Rise-in animations start from a visible state or finish within 0.8 s, and nothing waits on JS to become visible.
- Broken flows: pincode check, order submit (all required fields), autofill and OTP verification, tracking lookup and cancel, waitlist sign-up must all still work.
- `[PRICE]`-style placeholders, fake numbers (33% full) or fake people/rider names on the live site.

## Constraints
- Next.js 16 (read `frontend/node_modules/next/dist/docs/` before Next-specific code), React 19, Tailwind 4, server components for data; client components only where interactive.
- Node is at `~/.local/node/bin`. Tests: `npm test` (`node --test "lib/**/*.test.ts"`).
- Lint: no new errors beyond the 3 already on `main`.
- Accessibility as in the design: real buttons, labels and inputs, 44px touch targets, `aria-hidden` on decorative scenes, text contrast 4.5:1.
- Phone width: everything stacks, nothing scrolls sideways.

## Approaches considered
- **A. Port the design into the existing components and data (chosen).** Real prices, zones and orders keep flowing, and every existing flow stays intact.
- B. Embed the design's HTML pages as they are. It looks identical, but it's static and disconnected from orders, the pincode check and the database. Rejected.
- C. Keep the earlier water effects on top of the design. The user chose "exactly your design" instead.

## Decided by the user
- Use the 3D concept design exactly. Remove the opening pour, scroll stream, tilting LivingJar, splash canvas, button ripple, scooter and the earlier jar-fills-with-form behaviour. The order jar now fills by jar count, as in the design.
- The calls in Goals 3–5 (real data in pricing, extra real fields in the order form, tracking without rider/OTP/credits, light only, live-area badge from zones) were proposed and approved.

## Calls made after the builder check (marked as the designer's calls, not the user's)
1. **Mockup vs existing flow:** existing behaviour wins. The job is a re-skin: copy the mockups' look, motion and copy, but keep every existing step, field and data flow. Don't restructure OrderForm's logic (submit, OTP verification, autofill, saved addresses); change its markup and styles only. The home page keeps its PincodeChecker and OrderForm.
2. **Budget:** measure the home page's first-load client JS (the chunks the `/` route loads, as Task 8 of the previous plan did) before and after. After must not be larger than before. The removed water components pay for the new bits. Keep the hero scene, chips, platform and areas map as server-rendered markup with CSS animation. Only interactive pieces are client components.
3. **Pricing filter:** this is the existing `Browse` component (`frontend/components/Browse.tsx`), which filters items by pincode. Work out the featured card and the layout from the list currently shown, so it updates when the filter changes. An empty result shows one raised card: "No partner delivers to {pincode} yet", with a link to the waitlist section.
4. **Areas:** zero zones means the Areas section is hidden. Fewer than 4 zones means only those blocks are drawn: 1 centred, 2 side by side, 3 as two plus one. With no live zone, every block is flat and dashed and the list shows "Notify me" for each.
5. **Tokens and dark mode:**
   - Replace the Manrope and Comfortaa font variables with Space Grotesk and Inter; nothing should still reference the old ones.
   - Remove the `@media (prefers-color-scheme: dark)` block from `globals.css`, and the `dark:` classes in `components/Browse.tsx` and `components/PartnerPortal.tsx`.
   - The only hard-coded font is in `components/Logo.tsx`. Replace the Logo with the design's drop badge plus Space Grotesk "WaterMart".
6. **Contrast:** follow the mockup colours, except where text fails 4.5:1 (3:1 for 24px+). Then use the nearest passing shade from the design's own palette: orange text becomes `#B85300`, and grey text on blue-tinted grounds becomes `#3A4F64`. The orange `#FF8A2A` stays for fills, pins and bars, which aren't text.
7. **Tracking statuses:** the backend only has `requested`, `confirmed`, `out_for_delivery`, `delivered` and `cancelled` (`lib/orders.ts`). Any unknown status shows the sheet without the map, as `riderProgress` already returns null for it.
8. **Visual acceptance:** at the end, open the site in the Playwright browser tool (now installed) at 1440 and 390 widths. Compare `/`, the order flow and a tracked order against the mockups by eye, and check reduced motion. Screenshots are for review only and aren't committed. Unit tests cover pure logic only: featured-card choice, zone layout and the jar fill level.

## Left to the builder
- How to split components: e.g. `components/three-d/` for `CssJar`, `IsoPlatform`, `FloatingChip`, `IsoMap`, `RaisedButton`. Shared CSS classes and keyframes go in `globals.css`, prefixed `wm-` as in the design.
- Which old water files and tests to delete versus keep. `lib/water/orderFill.ts` and `rider.ts` may still be useful. Delete what is unused; no dead code.
- Exact responsive breakpoints for the hero scene and the pricing rotation. Drop the rotation on narrow screens.
