"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function HomeCable() {
  const svgRef = useRef<SVGSVGElement>(null);
  // Render a visible cable in the server HTML as well. Measurements refine it
  // after hydration; delayed scripts must never leave an empty illustration.
  const [geometry, setGeometry] = useState({
    width: 1440,
    height: 4200,
    d: "M1097 560 C1097 850 1296 900 1296 1150 S979 1500 979 1700 S1296 2100 1296 2300 S979 2700 979 2800 C979 2940 1296 2960 1296 3100 C1296 3450 1000 3600 634 3600 C504 3600 484 3519 439 3543",
  });

  useLayoutEffect(() => {
    const page = svgRef.current?.closest<HTMLElement>(".home-page");
    if (!page) return;
    let disposed = false;
    const observed = new Set<Element>();
    const measure = () => {
      // Next can hydrate this component before later sections have streamed in.
      // Discover anchors on each measurement instead of permanently giving up.
      const image = page.querySelector<HTMLElement>(".hero-device-art");
      const section = page.querySelector<HTMLElement>(".why-section");
      const anchor = section?.querySelector<HTMLElement>(".why-sensor-anchor-point");
      if (!image || !section || !anchor) return;
      [page, image, section, anchor].forEach((element) => {
        if (!observed.has(element)) {
          observer.observe(element);
          observed.add(element);
        }
      });
      const root = page.getBoundingClientRect();
      const art = image.getBoundingClientRect();
      const why = section.getBoundingClientRect();
      const width = root.width;
      const x = art.left - root.left + art.width * .626;
      const y = art.top - root.top + art.height * .845;
      const boundary = why.top - root.top;
      const target = anchor.getBoundingClientRect();
      const endX = target.left - root.left + target.width / 2;
      const endY = target.top - root.top + target.height / 2;
      if (root.width <= 0 || root.height <= 0) return;
      const span = boundary - y;
      const right = width * .9;
      const left = width * .68;
      const bend = width * .075;
      // This is one cable, from the hero device to a point transformed with the
      // lower device image. There is no independently positioned second lead.
      const d = `M${x} ${y}
        C${x} ${y + span * .14} ${right - bend} ${y + span * .13} ${right} ${y + span * .25}
        C${right + bend} ${y + span * .37} ${left + bend} ${y + span * .39} ${left} ${y + span * .5}
        C${left - bend} ${y + span * .61} ${right - bend} ${y + span * .64} ${right} ${y + span * .75}
        C${right + bend} ${y + span * .86} ${left + bend} ${y + span * .88} ${left} ${y + span * .94}
        C${left - bend} ${boundary - span * .02} ${right - bend} ${boundary - span * .05} ${right} ${boundary + 24}
        C${right + bend} ${boundary + (endY - boundary) * .65} ${endX + width * .3} ${endY} ${endX} ${endY}`;
      setGeometry({ width, height: root.height, d });
    };
    const schedule = () => {
      if (disposed) return;
      measure();
    };
    const observer = new ResizeObserver(schedule);
    const mutations = new MutationObserver(schedule);
    mutations.observe(page, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      mutations.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <svg ref={svgRef} className="home-cable" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
      <path className="home-cable-shadow" d={geometry.d} />
      <path className="home-cable-line" d={geometry.d} />
      <path className="home-cable-highlight" d={geometry.d} />
    </svg>
  );
}
