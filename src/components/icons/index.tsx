/**
 * Eigene Symbole fuer Fuhrpark und Maschinenpark.
 *
 * lucide 1.7 hat weder einen Bagger noch eine Pritsche noch einen schlichten
 * offenen Anhaenger. Diese SVGs halten lucides Zeichenvertrag exakt ein
 * (24er-Raster, fill none, strokeWidth 2, runde Enden), damit sie in einer
 * Reihe mit echten lucide-Symbolen nicht aus dem Rahmen fallen.
 * Bei 14 px verschwindet alles Feinere als Strichstaerke 2 – deshalb wenige,
 * grosse Formen statt Details.
 */
import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  size?: number;
  color?: string;
}

function Svg({ size = 14, color = 'currentColor', children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Pritsche: Fahrerhaus + offene Ladeflaeche mit niedrigen Bordwaenden */
export function PritscheIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 16V9h4l2 3h12v4" />
      <path d="M2 16h20" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Svg>
  );
}

/** Planwagen: gleiches Fahrgestell, aber mit gewoelbter Plane ueber der Ladeflaeche */
export function PlanwagenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 16V10h4l2 3" />
      <path d="M8 16v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3" />
      <path d="M2 16h20" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Svg>
  );
}

/** Anhaenger: Deichsel + offene Wanne auf zwei Achsen, kein Fahrerhaus */
export function AnhaengerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 14h4" />
      <path d="M6 11v5h16v-5" />
      <circle cx="11" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Svg>
  );
}

/** Bagger: Kettenfahrwerk + Oberwagen + Ausleger mit Loeffel */
export function BaggerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="15" width="11" height="5" rx="2.5" />
      <path d="M5 15v-4h5v4" />
      <path d="M10 11l4-4 4 5" />
      <path d="M18 12l-2 3h4z" />
    </Svg>
  );
}

/** Radlader: Radfahrzeug mit kurzem Hubarm und nach vorn gekippter Schaufel */
export function RadladerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 16v-6h9v6" />
      <path d="M9 12L5 11" />
      <path d="M5 9H2v4h3" />
      <circle cx="11" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Svg>
  );
}
