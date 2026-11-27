type LogoMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * "Rute K" — a K drawn as one road that splits into two destinations.
 * One trip, shared by many: the core idea of KBM Berkah Ceria.
 */
export function LogoMark({ size = 36, className, title }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="64" height="64" rx="16" fill="#2E5AAC" />
      <path
        d="M19 13v38"
        stroke="#fff"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M19 32.5c8 0 12.5-1.5 16-7l5.5-8.5"
        stroke="#fff"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M19 32.5c8 0 12.5 1.5 16 7l5.5 8.5"
        stroke="#9DC1FF"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M19 16.5v31"
        stroke="#2E5AAC"
        strokeWidth="1.4"
        strokeDasharray="3 3"
      />
      <circle cx="45" cy="12.5" r="6" fill="#FFC94D" />
      <circle cx="45" cy="12.5" r="2.2" fill="#2E5AAC" />
      <circle cx="45" cy="52" r="6" fill="#FFC94D" />
      <circle cx="45" cy="52" r="2.2" fill="#2E5AAC" />
    </svg>
  );
}

type LogoProps = {
  size?: number;
  compactOnMobile?: boolean;
};

export function Logo({ size = 36, compactOnMobile = true }: LogoProps) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="logo-mark-shell">
        <LogoMark size={size} />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-base font-black tracking-tight md:text-lg ${
            compactOnMobile ? "hidden sm:inline" : ""
          }`}
          style={{ color: "var(--brand-ink)" }}
        >
          KBM Berkah Ceria
        </span>
        {compactOnMobile && (
          <span
            className="font-display text-base font-black tracking-tight sm:hidden"
            style={{ color: "var(--brand-ink)" }}
          >
            KBM
          </span>
        )}
        <span
          className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:block"
          style={{ color: "var(--text-muted)" }}
        >
          Catatan perjalanan bersama
        </span>
      </span>
    </span>
  );
}
