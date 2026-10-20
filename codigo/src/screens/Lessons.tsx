import { CONCEPTS, LEVELS, UNITS, Unit, levelRank } from '../lib/content';
import { AppState, todayUnit, unitProgress } from '../lib/engine';
import { Bar, Button, Card, Eyebrow, Icon, cx } from '../components/ui';

export default function Lessons({ s, onUnit, onQuiz, onExams }: { s: AppState; onUnit: (u: Unit) => void; onQuiz: () => void; onExams: () => void }) {
  const p = s.profile!;
  const today = todayUnit(s);
  const seen = Object.values(s.concepts).filter((c) => c.a > 0).length;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Lecciones</Eyebrow>
          <h1 className="mt-1 font-serif text-[34px] md:text-5xl leading-[1.05]">Tu ruta</h1>
        </div>
        <button onClick={onExams} className="lg:hidden text-sm font-medium text-terra pb-1">Exámenes →</button>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow className="!text-terra">Quiz adaptativo</Eyebrow>
          <div className="mt-1 font-serif text-2xl">8 preguntas de lo que más te cuesta</div>
          <p className="text-sm text-ink-soft mt-1">{seen ? `Basado en ${seen} conceptos estudiados y tus errores recientes.` : 'Empieza una lección para personalizarlo.'}</p>
        </div>
        <Button onClick={onQuiz}>Hacer quiz <Icon name="arrow" className="w-4 h-4" /></Button>
      </Card>

      {LEVELS.map((lv) => {
        const units = UNITS.filter((u) => u.level === lv);
        const ahead = levelRank(lv) > levelRank(p.level);
        return (
          <section key={lv}>
            <div className="flex items-center gap-3 mb-3">
              <span className={cx('rounded-full px-3 h-7 inline-flex items-center text-xs font-bold', lv === p.level ? 'bg-terra text-white' : 'bg-black/[0.06]')}>{lv}</span>
              {ahead && <span className="text-xs text-ink-mute">Nivel superior · disponible como reto</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {units.map((u) => {
                const prog = unitProgress(s, u);
                const n = CONCEPTS.filter((c) => c.unit === u.id).length;
                const isToday = u.id === today.id;
                return (
                  <button key={u.id} onClick={() => onUnit(u)}
                    className={cx('text-left rounded-xl3 p-5 border transition hover:bg-white',
                      isToday ? 'bg-white/75 border-terra/40' : 'bg-white/75 border-transparent', ahead && 'opacity-75')}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-mute capitalize">{u.goal} · {u.minutes} min · {n} conceptos</span>
                      {isToday && <span className="text-[11px] font-semibold text-terra">HOY</span>}
                    </div>
                    <div className="mt-2 font-serif text-2xl leading-tight">{u.title}</div>
                    <div className="mt-4 flex items-center gap-3">
                      <Bar value={prog} />
                      <span className="text-xs tabular-nums text-ink-soft w-9 text-right">{prog}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
