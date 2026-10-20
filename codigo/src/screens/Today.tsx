import { LEVELS, conceptById, levelRank } from '../lib/content';
import { AppState, DAY, buildLesson, dateKey, lessonSize, nextExamAt, streakOf, todayUnit, unitProgress, weakConcepts, statusOf } from '../lib/engine';
import { Bar, Button, Card, Icon, StatusPill } from '../components/ui';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

export default function Today({ s, onLesson, onQuiz, onExam, onSpeaking }: {
  s: AppState; onLesson: () => void; onQuiz: () => void; onExam: () => void; onSpeaking: () => void;
}) {
  const p = s.profile!;
  const unit = todayUnit(s);
  const prog = unitProgress(s, unit);
  const n = lessonSize(p);
  const preview = buildLesson(s, unit);
  const reviews = preview.filter((q) => conceptById[q.conceptId].unit !== unit.id).length;
  const doneToday = s.history.some((h) => h.kind === 'lesson' && dateKey(h.at) === dateKey(Date.now()));
  const next = LEVELS[Math.min(4, levelRank(p.level) + 1)];
  const weak = weakConcepts(s, 3);
  const examDays = Math.ceil((nextExamAt(s) - Date.now()) / DAY);
  const streak = streakOf(s);
  const lastTalk = s.speaking?.[0];

  return (
    <div className="space-y-8 fade-up">
      <header>
        <div className="text-sm text-ink-mute first-letter:uppercase">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 className="mt-1 font-serif text-[34px] md:text-5xl leading-[1.05]">{greet()}, {p.name}</h1>
      </header>

      {/* Lo único importante: la lección de hoy */}
      <section className="rounded-[28px] bg-white/80 p-6 md:p-8">
        <div className="flex items-center justify-between text-sm">
          <span className="text-terra font-medium">Tu lección de hoy</span>
          {doneToday && <span className="text-ok font-medium inline-flex items-center gap-1"><Icon name="check" className="w-4 h-4" />Hecha</span>}
        </div>
        <h2 className="mt-2 font-serif text-[30px] md:text-[40px] leading-[1.08]">{unit.title}</h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          {p.minutes} min · {n} ejercicios{reviews > 0 && ` · ${reviews} repasos`}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Bar value={prog} />
          <span className="text-xs tabular-nums text-ink-mute w-9 text-right">{prog}%</span>
        </div>
        <Button className="mt-6 w-full sm:w-auto" onClick={onLesson}>
          {doneToday ? 'Practicar otra vez' : prog > 0 ? 'Continuar' : 'Empezar'} <Icon name="arrow" className="w-4 h-4" />
        </Button>
      </section>

      {/* Resumen en una línea */}
      <div className="grid grid-cols-3 text-center">
        <Mini v={String(streak)} l={streak === 1 ? 'día de racha' : 'días de racha'} icon />
        <Mini v={p.level} l={`${Math.round(s.levelXp)}% hacia ${p.level === 'C1' ? 'maestría' : next}`} />
        <button onClick={onExam} className="rounded-2xl hover:bg-black/[0.03] transition">
          <Mini v={examDays <= 0 ? 'Hoy' : `${examDays} d`} l="examen semanal" />
        </button>
      </div>

      {/* Otras prácticas */}
      <Card className="!p-0 overflow-hidden divide-y divide-black/[0.05]">
        <Row icon="speaking" title="Practicar speaking" sub={lastTalk ? `Última: ${lastTalk.topicLabel}` : 'Conversa con tu tutor por voz'} onClick={onSpeaking} accent />
        <Row icon="lessons" title="Quiz de repaso" sub="8 preguntas sobre lo que más te cuesta" onClick={onQuiz} />
      </Card>

      {weak.length > 0 && (
        <section>
          <h3 className="text-sm text-ink-mute mb-3">Para repasar</h3>
          <ul className="space-y-3">
            {weak.map(({ c, cs }) => (
              <li key={c.id} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] truncate">{c.term} <span className="text-ink-mute">· {c.translation}</span></div>
                  <Bar value={cs.m} className="mt-1.5" />
                </div>
                <StatusPill s={statusOf(cs)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Mini({ v, l, icon }: { v: string; l: string; icon?: boolean }) {
  return (
    <div className="py-2">
      <div className="text-2xl font-semibold tracking-tight tabular-nums inline-flex items-center gap-1">
        {icon && <Icon name="flame" className="w-[18px] h-[18px] text-terra" />}{v}
      </div>
      <div className="mt-0.5 text-[12px] text-ink-mute leading-tight px-1">{l}</div>
    </div>
  );
}

function Row({ icon, title, sub, onClick, accent }: { icon: string; title: string; sub: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] transition">
      <span className={accent ? 'w-10 h-10 rounded-full grid place-items-center bg-terra text-white' : 'w-10 h-10 rounded-full grid place-items-center bg-black/[0.05] text-ink'}>
        <Icon name={icon} className="w-[18px] h-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        <span className="block text-[13px] text-ink-mute truncate">{sub}</span>
      </span>
      <Icon name="chevron" className="w-4 h-4 text-ink-mute" />
    </button>
  );
}
