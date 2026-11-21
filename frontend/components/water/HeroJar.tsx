"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LivingJar, { type JarApi } from "./LivingJar";
import PourIntro from "./PourIntro";
import { burst } from "./Splash";
import { celebrateFor, type PincodeStatus } from "@/lib/water/celebrate.ts";

let poured = false; // play the opening pour once per page load

export default function HeroJar() {
  const apiRef = useRef<JarApi | null>(null);
  const pouring = useRef<boolean | null>(null);
  const [pourJar, setPourJar] = useState<JarApi | null>(null);

  const onReady = useCallback((api: JarApi) => {
    apiRef.current = api;
    if (pouring.current === null) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // hidden below md: width 0 means the jar is not on screen
      pouring.current = !poured && !reduce && api.el.getBoundingClientRect().width > 0;
      if (pouring.current) poured = true;
    }
    if (pouring.current) {
      api.setLevel(0); api.setCapped(false);
      setPourJar(api);
    }
  }, []);

  useEffect(() => {
    const on = (e: Event) => {
      const jar = apiRef.current;
      const d = (e as CustomEvent<{ status: PincodeStatus; origin?: { x: number; y: number } }>).detail;
      const status = d?.status;
      if (!jar || !status || celebrateFor(status) !== "splash") return;
      jar.hop(); jar.kick(0.06);
      const r = jar.el.getBoundingClientRect();
      if (r.width > 0) burst(r.left + r.width / 2, r.top + r.height * 0.25, 60);
      else if (d?.origin) burst(d.origin.x, d.origin.y, 40);
    };
    const slosh = (e: Event) => apiRef.current?.kick((e as CustomEvent<{ k: number }>).detail.k);
    window.addEventListener("watermart:pincode", on);
    window.addEventListener("watermart:slosh", slosh);
    return () => {
      window.removeEventListener("watermart:pincode", on);
      window.removeEventListener("watermart:slosh", slosh);
    };
  }, []);

  return (
    <>
      <LivingJar tilt className="hidden w-56 shrink-0 md:block" onReady={onReady} />
      <PourIntro jar={pourJar} />
    </>
  );
}
