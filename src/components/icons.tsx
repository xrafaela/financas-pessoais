import type { ReactElement, ReactNode } from 'react';

interface IconProps {
  size?: number;
}

function base(size: number | undefined, children: ReactNode): ReactElement {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ size }: IconProps): ReactElement {
  return base(
    size,
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </>,
  );
}

export function ListIcon({ size }: IconProps): ReactElement {
  return base(
    size,
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>,
  );
}

export function TargetIcon({ size }: IconProps): ReactElement {
  return base(
    size,
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>,
  );
}

export function ChartIcon({ size }: IconProps): ReactElement {
  return base(
    size,
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v-4" />
      <path d="M12 15V7" />
      <path d="M17 15v-6" />
    </>,
  );
}

export function PlusIcon({ size }: IconProps): ReactElement {
  return base(size, <path d="M12 5v14M5 12h14" />);
}

export function ChevronLeftIcon({ size }: IconProps): ReactElement {
  return base(size, <path d="m15 18-6-6 6-6" />);
}

export function ChevronRightIcon({ size }: IconProps): ReactElement {
  return base(size, <path d="m9 18 6-6-6-6" />);
}

export function CloseIcon({ size }: IconProps): ReactElement {
  return base(size, <path d="M18 6 6 18M6 6l12 12" />);
}

export function TrashIcon({ size }: IconProps): ReactElement {
  return base(
    size,
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>,
  );
}
