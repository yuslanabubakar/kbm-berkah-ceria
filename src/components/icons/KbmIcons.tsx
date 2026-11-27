import type { SVGProps } from "react";

/**
 * KBM icon set — rounded 2px strokes with a soft duotone fill,
 * drawn to match the tactile "KBM blue" theme. All icons inherit
 * `currentColor`, so they adapt to light/dark and to their parent.
 */
export type KbmIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
  title?: string;
};

function Base({
  size = 16,
  title,
  className,
  children,
  ...rest
}: KbmIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["kbm-icon", className].filter(Boolean).join(" ")}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* Shared duotone fill */
const tone = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" };

export const FuelIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="4" y="3.5" width="10" height="17" rx="2.5" {...tone} />
    <rect x="4" y="3.5" width="10" height="17" rx="2.5" />
    <path d="M7 8h4" />
    <path d="M14 9.5l3 2.5v5.5a1.5 1.5 0 0 0 3 0V9l-2.5-3" />
    <path d="M3 20.5h12" />
  </Base>
);

export const TollRoadIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M8.5 3 5 21h14L15.5 3z" {...tone} />
    <path d="M8.5 3 5 21" />
    <path d="M15.5 3 19 21" />
    <path d="M12 4.5v2.5M12 10.5v3M12 17v3" />
  </Base>
);

export const FoodIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" {...tone} />
    <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" />
    <path d="M9 16.5h6" />
    <path d="M14 3l-3 7M19 4l-5 6.5" />
  </Base>
);

export const ParkingIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...tone} />
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <path d="M9.5 16.5v-9h3.25a2.75 2.75 0 0 1 0 5.5H9.5" />
  </Base>
);

export const HotelIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M3 11.5h13.5A4.5 4.5 0 0 1 21 16v1H3z" {...tone} />
    <path d="M3 5v15M21 20v-4a4.5 4.5 0 0 0-4.5-4.5H11V17" />
    <path d="M3 17h18" />
    <circle cx="7" cy="12.5" r="2" />
  </Base>
);

export const TicketIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path
      d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z"
      {...tone}
    />
    <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z" />
    <path d="M14.5 6.5v1.5M14.5 11v2M14.5 16v1.5" />
  </Base>
);

export const ShoppingIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M5 8h14l-1 12.5H6z" {...tone} />
    <path d="M5 8h14l-1 12.5H6z" />
    <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
  </Base>
);

export const BusIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="4" y="3.5" width="16" height="14" rx="3.5" {...tone} />
    <rect x="4" y="3.5" width="16" height="14" rx="3.5" />
    <path d="M4 10.5h16M8.5 14h.01M15.5 14h.01" />
    <path d="M7 17.5V20M17 17.5V20" />
  </Base>
);

export const BoxIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M3.5 8 12 3.5 20.5 8v8.5L12 21l-8.5-4.5z" {...tone} />
    <path d="M3.5 8 12 3.5 20.5 8v8.5L12 21l-8.5-4.5z" />
    <path d="M3.5 8 12 12.5 20.5 8M12 12.5V21" />
  </Base>
);

export const PinIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path
      d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"
      {...tone}
    />
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Base>
);

export const CarIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path
      d="M3 16.5v-3.2a2 2 0 0 1 1.6-2l1.9-.4L9 7.3A2 2 0 0 1 10.6 6.5h3.6a2 2 0 0 1 1.6.8l2.6 3.5 1.9.4a2 2 0 0 1 1.6 2v3.3z"
      {...tone}
    />
    <path d="M3 16.5v-3.2a2 2 0 0 1 1.6-2l1.9-.4L9 7.3A2 2 0 0 1 10.6 6.5h3.6a2 2 0 0 1 1.6.8l2.6 3.5 1.9.4a2 2 0 0 1 1.6 2v3.3h-2" />
    <path d="M9.5 16.5h5" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Base>
);

export const SteeringIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" {...tone} />
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M3.8 10.5c5.5-1.5 10.9-1.5 16.4 0M10.3 13.5 8 20M13.7 13.5 16 20" />
  </Base>
);

export const BankIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M3.5 9 12 4l8.5 5z" {...tone} />
    <path d="M3.5 9 12 4l8.5 5z" />
    <path d="M6 12v5M10 12v5M14 12v5M18 12v5M3.5 20.5h17" />
  </Base>
);

export const WalletIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="14" rx="3.5" {...tone} />
    <path d="M17.5 6V4.8a1.3 1.3 0 0 0-1.6-1.3L5 6" />
    <rect x="3" y="6" width="18" height="14" rx="3.5" />
    <path d="M21 11h-4a2 2 0 0 0 0 4h4" />
  </Base>
);

export const CashIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="3" {...tone} />
    <rect x="2.5" y="6" width="19" height="12" rx="3" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9.5v.01M18 14.5v.01" />
  </Base>
);

export const QrIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...tone} />
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h2.5M19 17.5v3h1.5" />
  </Base>
);

export const CardIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="3" {...tone} />
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <path d="M2.5 10h19M6.5 15h3" />
  </Base>
);

export const UsersIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" {...tone} />
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
  </Base>
);

export const LightbulbIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M8.5 15.5a6.5 6.5 0 1 1 7 0V17h-7z" {...tone} />
    <path d="M8.5 15.5a6.5 6.5 0 1 1 7 0V17h-7z" />
    <path d="M9.5 20.5h5M12 9v3" />
  </Base>
);

export const BoltIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M13.5 2.5 4.5 13.5H12l-1.5 8 9-11H12z" {...tone} />
    <path d="M13.5 2.5 4.5 13.5H12l-1.5 8 9-11H12z" />
  </Base>
);

export const CalendarIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" {...tone} />
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
  </Base>
);

export const RoundTripIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M4 8.5h14.5M15 5l3.5 3.5L15 12" />
    <path d="M20 15.5H5.5M9 12l-3.5 3.5L9 19" />
  </Base>
);

export const RouteArrowIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M4 12h14" strokeDasharray="2.5 3" />
    <path d="M14 7l5 5-5 5" />
  </Base>
);

export const MapIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z" {...tone} />
    <path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Base>
);

export const LinkIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L11.5 6.8" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.6-1.6" />
  </Base>
);

export const CloseIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const CheckIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M5 12.5 10 17.5 19 7" />
  </Base>
);

export const ChevronDownIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <path d="M6.5 9.5 12 15l5.5-5.5" />
  </Base>
);

export const InfoIcon = (p: KbmIconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" {...tone} />
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </Base>
);

/* ── Lookup helpers ───────────────────────────────── */

const CATEGORY_ICONS: Record<string, (p: KbmIconProps) => JSX.Element> = {
  bbm: FuelIcon,
  tol: TollRoadIcon,
  makan: FoodIcon,
  parkir: ParkingIcon,
  hotel: HotelIcon,
  tiket: TicketIcon,
  belanja: ShoppingIcon,
  transport: BusIcon,
  lainnya: BoxIcon,
};

/** Icon for an expense category id (bbm, tol, makan, …). Falls back to a box. */
export function CategoryIcon({
  id,
  ...props
}: KbmIconProps & { id?: string | null }) {
  const Icon = (id && CATEGORY_ICONS[id]) || BoxIcon;
  return <Icon {...props} />;
}

const CHANNEL_ICONS: Record<string, (p: KbmIconProps) => JSX.Element> = {
  bank: BankIcon,
  ewallet: WalletIcon,
  cash: CashIcon,
  other: QrIcon,
};

/** Icon for a payment channel (bank, ewallet, cash, other). */
export function PaymentChannelIcon({
  channel,
  ...props
}: KbmIconProps & { channel?: string | null }) {
  const Icon = (channel && CHANNEL_ICONS[channel]) || CardIcon;
  return <Icon {...props} />;
}
