"use client";

import { useCallback, useEffect, useRef } from "react";
import LivingJar, { type JarApi } from "./LivingJar";

/** Order-heading jar: the scroll stream anchor ("jar"); kicked when the stream lands and by scroll slosh. */
export default function OrderHeadingJar() {
  const apiRef = useRef<JarApi | null>(null);
  const onReady = useCallback((api: JarApi) => { apiRef.current = api; }, []);

  useEffect(() => {
    const hit = (e: Event) => {
      if ((e as CustomEvent<{ anchor: string }>).detail?.anchor === "jar") apiRef.current?.kick(0.07);
    };
    const slosh = (e: Event) => apiRef.current?.kick((e as CustomEvent<{ k: number }>).detail.k);
    window.addEventListener("watermart:stream-hit", hit);
    window.addEventListener("watermart:slosh", slosh);
    return () => {
      window.removeEventListener("watermart:stream-hit", hit);
      window.removeEventListener("watermart:slosh", slosh);
    };
  }, []);

  return (
    <div data-stream="jar" className="hidden w-16 shrink-0 sm:block">
      <LivingJar onReady={onReady} />
    </div>
  );
}
