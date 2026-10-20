import { useState } from 'react';
import { LEVELS, levelRank } from '../lib/content';
import { AppState, categoryStats, statusOf, streakOf, totals, weakConcepts } from '../lib/engine';
import { Bar, Button, Card, Eyebrow, StatusPill, cx } from '../components/ui';
import { CalendarCard, Stat, WeekCard } from '../components/Widgets';

export default function Progress({ s, onReset }: { s: AppState; onReset: () => void }) {
  const p = s.profile!;
  const [confirming, setConfirming] = useState(false);
  const r = levelRank(p.level);
  const t = totals(s);
  const cats = categoryStats(s);
  const strengths = cats.filter((c) => c.mastery >= 60).slice(0, 4);
  const weaknesses = [...cats].reverse().filter((c) => c.mastery < 75).slice(0, 4);
  const weak = weakConcepts(s, 6);

  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Progreso</Eyebrow>
        <h1 className="mt-1 font-serif text-[34px] md:text-5xl leading-[1.05]">Cómo vas, {p.name}</h1>
      </header>

      <Card className="!p-6 md:!p-8">
        <Eyebrow className="">Nivel</Eyebrow>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {LEVELS.map((l, i) => (
            <div key={l}>
              <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                <div className="h-full bg-terra rounded-full" style={{ width: i < r ? '100%' : i === r ? `${s.levelXp}%` : '0%' }} />
              </div>
              <div className={cx('mt-2 text-sm', i === r ? 'text-ink font-semibold' : 'text-ink-mute')}>{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-ink-soft">
          {p.level === 'C1' ? 'Estás en el nivel más alto. Mantén tu dominio.' : `${Math.round(s.levelXp)}% hacia ${LEVELS[r + 1]}. Sigue sumando aciertos a tu nivel y aprueba los exámenes semanales.`}
        </p>
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-4">
          <Stat v={t.words} l="palabras" />
          <Stat v={t.minutes} l="minutos" />
          <Stat v={t.lessons} l="lecciones" />
          <Stat v={t.quizzes} l="quizzes" />
          <Stat v={t.exams} l="exámenes" />
          <Stat v={streakOf(s)} l="racha" />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <CatList title="Fortalezas" items={strengths} empty="Completa lecciones para descubrir tus fortalezas." good />
        <CatList title="Debilidades" items={weaknesses} empty="Sin debilidades detectadas por ahora." />
      </div>

      <div className="grid md:grid-cols-2 gap-5 xl:hidden">
        <CalendarCard s={s} />
        <WeekCard s={s} />
      </div>

      <Card>
        <Eyebrow>Palabras que más fallas</Eyebrow>
        {weak.length ? (
          <ul className="mt-3 divide-y divide-black/5">
            {weak.map(({ c, cs }) => (
              <li key={c.id} className="py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.term} <span className="text-ink-mute font-normal text-sm">· {c.translation}</span></div>
                  <div className="text-xs text-ink-mute">{cs.w} errores · {cs.a} intentos · dominio {cs.m}/100</div>
                </div>
                <StatusPill s={statusOf(cs)} />
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-ink-soft">Aquí verás los conceptos que más se te dificultan.</p>}
      </Card>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        {confirming ? (
          <>
            <span className="text-sm text-ink-soft">¿Borrar todo tu progreso?</span>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button onClick={onReset}>Sí, borrar</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>Reiniciar progreso</Button>
        )}
      </div>
    </div>
  );
}

function CatList({ title, items, empty, good }: { title: string; items: ReturnType<typeof categoryStats>; empty: string; good?: boolean }) {
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      {items.length ? (
        <ul className="mt-4 space-y-3.5">
          {items.map((c) => (
            <li key={c.name}>
              <div className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className={cx('tabular-nums font-semibold', good ? 'text-ok' : 'text-terra')}>{c.mastery}</span>
              </div>
              <Bar value={c.mastery} className="mt-1.5" fill={good ? 'bg-ok' : 'bg-terra'} />
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-ink-soft">{empty}</p>}
    </Card>
  );
}
