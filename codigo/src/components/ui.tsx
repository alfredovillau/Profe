import { ReactNode } from 'react';
import type { Status } from '../lib/engine';

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

export function Card({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cx('rounded-[24px] p-5 md:p-6', dark ? 'bg-ink text-cream' : 'bg-white/75', className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-[13px] font-medium text-ink-mute', className)}>{children}</div>;
}

export function Button({
  children, onClick, variant = 'primary', className, disabled, type = 'button',
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'dark' | 'ghost' | 'light';
  className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const v = {
    primary: 'bg-terra text-white hover:bg-[#b4532f] active:scale-[0.98]',
    dark: 'bg-ink text-cream hover:bg-ink-2 active:scale-[0.98]',
    light: 'bg-cream text-ink hover:bg-white',
    ghost: 'bg-black/[0.05] text-ink hover:bg-black/[0.08]',
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={cx('inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 text-[15px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/50', v, className)}>
      {children}
    </button>
  );
}

export function Bar({ value, className, track = 'bg-black/[0.07]', fill = 'bg-terra' }: { value: number; className?: string; track?: string; fill?: string }) {
  return (
    <div className={cx('h-1 w-full rounded-full overflow-hidden', track, className)}>
      <div className={cx('h-full rounded-full transition-all duration-500', fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 88, stroke = 7, children, color = '#C65F3A', track = 'rgba(0,0,0,0.08)' }: {
  value: number; size?: number; stroke?: number; children?: ReactNode; color?: string; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} className="transition-all duration-700" />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  Nueva: 'text-ink-mute',
  Aprendiendo: 'text-terra',
  Repasar: 'text-[#9A7420]',
  Dominada: 'text-ok',
};
export function StatusPill({ s }: { s: Status }) {
  return <span className={cx('inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap', STATUS_STYLE[s])}><span className="w-1.5 h-1.5 rounded-full bg-current" />{s}</span>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={cx('rounded-full px-4 h-9 text-sm font-medium border transition',
        active ? 'bg-ink text-cream border-ink' : 'bg-white/70 border-transparent text-ink hover:bg-white')}>
      {children}
    </button>
  );
}

// Iconos lineales mínimos
const P: Record<string, string> = {
  today: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  lessons: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  exams: 'M9 3h6v3H9zM6 5h12v16H6zM9 11l2 2 4-4M9 17h6',
  vocab: 'M4 4h7v16H4zM13 4h7v16h-7zM7 8h1M16 8h1',
  progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  flame: 'M12 22c4 0 7-3 7-7 0-5-4-6-5-11-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 9 0 4 3 7 7 7z',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6 6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.5-4.5',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  speaking: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  send: 'M5 12h14M13 6l6 6-6 6',
  phone: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
};
export function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.7 }: { name: keyof typeof P | string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name]} />
    </svg>
  );
}
