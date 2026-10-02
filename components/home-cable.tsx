import Image from "next/image";

export function WhySensorCable() {
  // Proportions traced from the signal arcs in Header.png: bands thicken outward and the gaps match their width.
  const signalArcs = [
    { d: "M33.4 -35.8 A49 49 0 0 1 33.4 35.8", width: 17 },
    { d: "M51.2 -67.9 A85 85 0 0 1 51.2 67.9", width: 19 },
    { d: "M72.9 -100.3 A124 124 0 0 1 72.9 100.3", width: 21 },
  ];

  return (
    <div className="why-sensor-cable" aria-hidden="true">
      <div className="why-sensor">
        <svg className="why-sensor-signal" viewBox="-540 -80 260 260">
          <g transform="translate(-396 50) rotate(152) scale(.8)">
            {signalArcs.map((arc) => <path key={arc.d} d={arc.d} strokeWidth={arc.width} />)}
          </g>
        </svg>
        <div className="why-sensor-body">
          <Image className="why-distance-sensor" src="/images/home-distance-sensor-body.png" alt="" width={535} height={1025} sizes="160px" />
          <span className="why-sensor-anchor" aria-hidden="true"><span className="why-sensor-anchor-point" /></span>
        </div>
      </div>
    </div>
  );
}
