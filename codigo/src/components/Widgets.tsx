import { AppState, DAY, dateKey, last7, nextExamAt, streakOf } from '../lib/engine';
import { Button, Card, Eyebrow, Icon, cx } from './ui';

const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function StreakCard({ s }: { s: AppState }) {
  const streak = streakOf(s);
  const today = (s.activity[dateKey(Date.now())]?.q ?? 0) > 0;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow className="">Racha</Eyebrow>
        <Icon name="flame" className="w-5 h-5 text-terra" />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-6xl leading-none">{streak}</span>
        <span className="text-ink-soft">{streak === 1 ? 'día' : 'días'}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
        <span>Mejor racha: <b className="text-ink font-semibold">{Math.max(s.bestStreak, streak)}</b></span>
        <span className={today ? 'text-terra' : ''}>{today ? 'Hoy ✓' : 'Estudia hoy'}</span>
      </div>
    </Card>
  );
}

export function CalendarCard({ s }: { s: AppState }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Actividad</Eyebrow>
        <span className="text-sm text-ink-soft capitalize">{MONTHS[now.getMonth()]}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WD.map((d, i) => <div key={i} className="text-[10px] font-semibold text-ink-mute">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const t = new Date(now.getFullYear(), now.getMonth(), d).getTime();
          const a = s.activity[dateKey(t)];
          const lvl = !a?.q ? 0 : a.q < 8 ? 1 : a.q < 14 ? 2 : 3;
          const isToday = d === now.getDate();
          return (
            <div key={i} title={a ? `${a.q} respuestas · ${a.min} min` : ''}
              className={cx('aspect-square rounded-lg grid place-items-center text-[11px] tabular-nums',
                lvl === 0 && 'bg-black/[0.04] text-ink-mute',
                lvl === 1 && 'bg-terra-pale text-terra',
                lvl === 2 && 'bg-terra-light text-white',
                lvl === 3 && 'bg-terra text-white',
                isToday && 'ring-2 ring-ink ring-offset-1 ring-offset-cream-3')}>
              {d}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ExamCard({ s, onStart }: { s: AppState; onStart: () => void }) {
  const at = nextExamAt(s);
  const days = Math.ceil((at - Date.now()) / DAY);
  const ready = days <= 0;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Próximo examen</Eyebrow>
        <Icon name="calendar" className="w-4 h-4 text-ink-mute" />
      </div>
      <div className="mt-3 font-serif text-2xl leading-tight">Examen semanal</div>
      <div className="mt-1 text-sm text-ink-soft">
        {ready ? 'Disponible ahora · 20 preguntas' : `En ${days} ${days === 1 ? 'día' : 'días'} · ${new Date(at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}`}
      </div>
      <Button variant={ready ? 'primary' : 'ghost'} className="mt-4 w-full" onClick={onStart}>
        {ready ? 'Empezar examen' : 'Adelantar examen'}
      </Button>
    </Card>
  );
}

export function WeekCard({ s }: { s: AppState }) {
  const week = last7(s);
  const max = Math.max(10, ...week.map((d) => d.min));
  const min = week.reduce((a, d) => a + d.min, 0);
  const q = week.reduce((a, d) => a + d.q, 0);
  const ok = week.reduce((a, d) => a + d.ok, 0);
  return (
    <Card>
      <Eyebrow>Últimos 7 días</Eyebrow>
      <div className="mt-4 flex items-end justify-between gap-2 h-24">
        {week.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className={cx('w-full max-w-[22px] rounded-md', i === 6 ? 'bg-terra' : 'bg-ink/15')}
              style={{ height: `${Math.max(4, (d.min / max) * 100)}%`, opacity: d.min ? 1 : 0.15 }} />
            <span className="text-[10px] text-ink-mute">{WD[(new Date(d.t).getDay() + 6) % 7]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat v={min} l="min" />
        <Stat v={q} l="respuestas" />
        <Stat v={q ? `${Math.round((ok / q) * 100)}%` : '—'} l="precisión" />
      </div>
    </Card>
  );
}

export function Stat({ v, l, dark }: { v: string | number; l: string; dark?: boolean }) {
  return (
    <div>
      <div className="font-serif text-2xl leading-none tabular-nums">{v}</div>
      <div className={cx('mt-1 text-[11px]', dark ? 'text-ink-mute' : 'text-ink-mute')}>{l}</div>
    </div>
  );
}
