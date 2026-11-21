# Water motion UI for JalDrop: design

Approved demo: https://claude.ai/artifact/U2UJXVsYmTWZew2yfo31bc (Premium look)

## Why
Visitors should feel happy and excited when the site opens. Water motion makes the product feel fresh and alive, and the site must stay as fast as it is today (see the performance-first rule).

## Goals
- **Opening pour.** On the home page, a thick stream falls from the top of the screen into the open hero jar. The jar fills, then the cap drops on. Takes about 3.5 seconds and plays once per page load.
- **Living hero jar.** Fake 3D jar built from SVG and CSS. It tilts toward the mouse or a finger drag, sways when idle, and its water has waves, bubbles and slosh. Water drops float around it at different depths.
- **Scroll stream.** A thick water stream starts at the hero's wavy bottom edge and follows the scroll position down the page, led by a drop. It splashes into the order jar, comes out below it, and ends with a splash on the "You" house in the tracking illustration. Scrolling also makes the water in the jars slosh.
- **Splash on delivery check.** When the pincode is served (`launching`), the jar hops and water splashes out. For `waitlist` or `unserved`, the input shakes gently and a friendly message shows.
- **Order jar fills.** In `OrderForm`, a small jar fills in steps as the required fields are completed. Placing the order caps the jar, splashes, and a scooter carrying the jar rides across.
- **Tracking illustration.** On the track page, a rider dot moves along a route to match the order status. Steps light up, and there's a splash on delivery. It shows status only, not real GPS.
- **Ripple** on every `.btn`.
- **Premium blue look across the whole site.** Replace the green brand tokens in `globals.css` with the demo's Premium palette in both light and dark mode. Manrope stays.

## Non-goals
- The WebGL 3D jar (about 150 KB) and the Playful look.
- Real-time rider GPS.

## Anti-goals (a failure even if it works)
- Slower first load. No new npm dependencies; the added client JS stays under about 10 KB gzipped.
- Hiding or delaying content. Text and forms are visible and usable from the first paint, and the pour never blocks input.
- Motion for people who asked for none. With `prefers-reduced-motion`, the jar shows full and still, the pour and stream are skipped, and there are no splashes.

## Constraints
- Next.js 16 app with server components and Tailwind 4. The animated pieces are small client components; page data loading stays as it is.
- One shared `requestAnimationFrame` loop. Each piece pauses when it's off screen (IntersectionObserver).
- The static SVG jar renders on the server, so the first paint looks finished before the JS loads.
- The logo colours may need a check against the blue palette.

## Approaches considered
- **A. SVG + CSS + small canvas (chosen).** Close to 0 KB of libraries, works everywhere, matches the approved demo.
- B. WebGL (three.js / react-three-fiber). Most realistic, but about 150 KB+ and heavy on phones. Deferred.
- C. Spline or Lottie embeds. Easy to design, but large runtimes and less control. Rejected.

## Left to the builder
- How the components are split (e.g. `LivingJar`, `PourIntro`, `ScrollStream`, `Splash`, `Ripple`), and how they share the animation loop.
- Exact mapping from `OrderForm`'s required fields to fill steps.
- Recomputing the stream path when the layout changes (resize, streamed sections arriving, form state changes).
- Tuning the palette hex values for contrast (AA) in both themes.
