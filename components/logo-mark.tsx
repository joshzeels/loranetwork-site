import Image from "next/image";

export function LogoMark() {
  return (
    <Image
      className="logo-mark"
      src="/images/logo.png"
      alt=""
      width={34}
      height={34}
      aria-hidden="true"
    />
  );
}
