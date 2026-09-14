function CablePath({ d }: { d: string }) {
  return (
    <>
      <path className="home-cable-shadow" d={d} />
      <path className="home-cable-line" d={d} />
      <path className="home-cable-highlight" d={d} />
    </>
  );
}

function WallPlug({ x, y }: { x: number; y: number }) {
  return (
    <g className="home-cable-socket" transform={`translate(${x} ${y})`}>
      <rect className="socket-wall" x="108" y="-160" width="14" height="320" />
      <rect className="socket-side-plate" x="98" y="-104" width="12" height="208" rx="6" />
      <path className="cable-plug" d="M22-72Q22-88 38-94H80Q96-88 98-72V72Q96 88 80 94H38Q22 88 22 72Z" />
      <rect className="cable-plug-neck" x="41" y="72" width="24" height="32" rx="12" />
      <path className="cable-plug-detail" d="M34-66V66M84-70V70" />
    </g>
  );
}

export function HomeCable() {
  const desktopPath = "M1058 606 C1058 690 1058 742 1125 782 C1245 854 1325 880 1278 1050 S900 1260 982 1515 S1390 1740 1260 2050 S890 2310 1055 2580 C1210 2730 1390 2820 1370 3040 C1355 3210 1180 3270 1160 3420 C1140 3600 1280 3720 1350 3650 C1370 3620 1371 3600 1371 3584";
  const mobilePath = "M360 1000 C360 1100 360 1190 420 1250 C540 1370 630 1450 570 1750 S120 2110 245 2520 S680 2920 545 3330 S245 3710 405 4070 C535 4250 680 4420 650 4660 C625 4860 460 4930 470 5070 C480 5230 590 5280 635 5235 C650 5220 653 5190 653 5104";

  return (
    <>
      <svg className="home-cable home-cable-desktop" viewBox="0 0 1440 4200" preserveAspectRatio="none" aria-hidden="true">
        <CablePath d={desktopPath} />
        <WallPlug x={1318} y={3480} />
      </svg>
      <svg className="home-cable home-cable-mobile" viewBox="0 0 720 6000" preserveAspectRatio="none" aria-hidden="true">
        <CablePath d={mobilePath} />
        <WallPlug x={600} y={5000} />
      </svg>
    </>
  );
}
