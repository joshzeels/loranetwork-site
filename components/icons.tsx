type IconProps = React.SVGProps<SVGSVGElement>;

export function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M11 4h5v5M9 11l7-7M16 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function NoImageIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <rect x="8" y="11" width="48" height="42" rx="9" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="22" cy="25" r="4" stroke="currentColor" strokeWidth="2.4" />
      <path d="m15 45 11-11 8 8 6-6 9 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13 8 38 48" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="m13 8 38 48" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ApplicationIcon({ application, ...props }: IconProps & { application: string }) {
  const common = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const thermometer = <><path d="M13 18.5V7a3 3 0 0 1 6 0v11.5a6 6 0 1 1-6 0Z" {...common} /><path d="M16 10v11" {...common} /><circle cx="16" cy="23" r="2.2" fill="currentColor" /></>;

  let artwork: React.ReactNode;
  switch (application) {
    case "Distance Sensor":
      artwork = <><path d="M5 8v16M27 8v16M9 16h14M12 13l-3 3 3 3M20 13l3 3-3 3" {...common} /></>;
      break;
    case "Temperature Sensor":
      artwork = thermometer;
      break;
    case "Smart Agriculture":
      artwork = <><path d="M16 26V14M16 19c-5.5 0-9-3.3-9-9 5.8 0 9 3.3 9 9Zm0-4c5.5 0 9-3.3 9-9-5.8 0-9 3.3-9 9Z" {...common} /></>;
      break;
    case "Water Flow Sensor":
      artwork = <><path d="M16 4C13 9 9 13.2 9 18a7 7 0 0 0 14 0c0-4.8-4-9-7-14Z" {...common} /><path d="M4 25h6M22 25h6" {...common} /></>;
      break;
    case "Temperature & Humidity Sensor":
      artwork = <><g transform="translate(-5 0) scale(.88 1)">{thermometer}</g><path d="M24 8c-2 3-4 5.4-4 8.2a4 4 0 0 0 8 0C28 13.4 26 11 24 8Z" {...common} /></>;
      break;
    case "Pressure Sensor":
      artwork = <>
        <circle cx="16" cy="17" r="9" {...common} />
        <path d="M7.5 13.9 5.4 13.1M10.8 9.6 9.5 7.7M16 8V5.7M21.2 9.6 22.5 7.7M24.5 13.9 26.6 13.1" {...common} />
        <path d="M16 17 18.6 10" {...common} />
        <circle cx="16" cy="17" r="1.6" fill="currentColor" />
        <path d="M16 26v2.5M13.5 28.5h5" {...common} />
      </>;
      break;
    default:
      artwork = <><circle cx="16" cy="16" r="4" {...common} /><path d="M16 4v5M16 23v5M4 16h5M23 16h5" {...common} /></>;
  }

  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>{artwork}</svg>;
}
