import { Fragment } from "react";
import Image from "next/image";

function CablePath({ d }: { d: string }) {
  return (
    <>
      <path className="home-cable-shadow" d={d} />
      <path className="home-cable-line" d={d} />
      <path className="home-cable-highlight" d={d} />
    </>
  );
}

export function HomeCable() {
  const desktopPath = "M1058 606 C1058 690 1058 742 1125 782 C1245 854 1325 880 1278 1050 S900 1260 982 1515 S1390 1740 1260 2050 S890 2310 1055 2580 C1210 2730 1370 2800 1370 3040 V4200";
  const mobilePath = "M360 1000 C360 1100 360 1190 420 1250 C540 1370 630 1450 570 1750 S120 2110 245 2520 S680 2920 545 3330 S245 3710 405 4070 C535 4250 650 4420 650 4660 V6000";

  return (
    <>
      <svg className="home-cable home-cable-desktop" viewBox="0 0 1440 4200" preserveAspectRatio="none" aria-hidden="true">
        <CablePath d={desktopPath} />
      </svg>
      <svg className="home-cable home-cable-mobile" viewBox="0 0 720 6000" preserveAspectRatio="none" aria-hidden="true">
        <CablePath d={mobilePath} />
      </svg>
    </>
  );
}

// The run enters at the same x as HomeCable's final vertical drop and ends level at the
// sensor anchor, so the join stays seamless when the section stretches.
export function WhySensorCable() {
  const desktopRun = "M1370 0 C1370 170 1190 190 1160 320 C1130 450 1040 600 633.6 600";
  const mobileRun = "M650 0 C650 190 580 200 575 340 C570 480 660 600 504 600";
  const sensorLead = "M-195 -57 C-150 -81 -130 0 0 0";
  const cableLayers = ["shadow", "line", "highlight"];
  // Proportions traced from the signal arcs in Header.png: bands thicken outward and the gaps match their width.
  const signalArcs = [
    { d: "M33.4 -35.8 A49 49 0 0 1 33.4 35.8", width: 17 },
    { d: "M51.2 -67.9 A85 85 0 0 1 51.2 67.9", width: 19 },
    { d: "M72.9 -100.3 A124 124 0 0 1 72.9 100.3", width: 21 },
  ];

  return (
    <div className="why-sensor-cable" aria-hidden="true">
      {/* Paint every piece's shadow, then line, then highlight, so no cap covers the other piece at the join. */}
      {cableLayers.map((layer) => (
        <Fragment key={layer}>
          <svg className="why-cable-run why-cable-run-desktop" viewBox="0 0 1440 600" preserveAspectRatio="none">
            <path className={`home-cable-${layer}`} d={desktopRun} />
          </svg>
          <svg className="why-cable-run why-cable-run-mobile" viewBox="0 0 720 600" preserveAspectRatio="none">
            <path className={`home-cable-${layer}`} d={mobileRun} />
          </svg>
          <div className="why-sensor">
            <svg className="why-sensor-lead" viewBox="-240 -120 260 160">
              <path className={`home-cable-${layer}`} d={sensorLead} />
            </svg>
          </div>
        </Fragment>
      ))}
      <div className="why-sensor">
        <svg className="why-sensor-signal" viewBox="-540 -80 260 260">
          <g transform="translate(-396 50) rotate(152) scale(.8)">
            {signalArcs.map((arc) => <path key={arc.d} d={arc.d} strokeWidth={arc.width} />)}
          </g>
        </svg>
        <div className="why-sensor-body">
          <Image className="why-distance-sensor" src="/images/home-distance-sensor-body.png" alt="" width={535} height={1025} sizes="160px" />
        </div>
      </div>
    </div>
  );
}
