import { useEffect, useState } from 'react';
import { Unit } from './lib/content';
import {
  AppState, Question, applyAnswer, buildExam, buildLesson, buildQuiz, demoState, emptyState,
  finishSession, load, save, streakOf, todayUnit,
} from './lib/engine';
import { applySpeaking } from './lib/speaking';
import Session from './components/Session';
import { Icon, cx } from './components/ui';
import { CalendarCard, ExamCard, StreakCard, WeekCard } from './components/Widgets';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import Lessons from './screens/Lessons';
import Exams from './screens/Exams';
import Vocab from './screens/Vocab';
import Progress from './screens/Progress';
import Speaking from './screens/Speaking';

type Tab = 'today' | 'lessons' | 'speaking' | 'exams' | 'vocab' | 'progress';
const TABS: { id: Tab; label: string; short: string; mobile: boolean }[] = [
  { id: 'today', label: 'Hoy', short: 'Hoy', mobile: true },
  { id: 'lessons', label: 'Lecciones', short: 'Lecciones', mobile: true },
  { id: 'speaking', label: 'Speaking', short: 'Speaking', mobile: true },
  { id: 'exams', label: 'Exámenes', short: 'Exámenes', mobile: false },
  { id: 'vocab', label: 'Vocabulario', short: 'Palabras', mobile: true },
  { id: 'progress', label: 'Progreso', short: 'Progreso', mobile: true },
];

interface Active { kind: 'lesson' | 'quiz' | 'exam'; title: string; questions: Question[] }

export default function App() {
  const [s, setS] = useState<AppState>(load);
  const [tab, setTab] = useState<Tab>('today');
  const [active, setActive] = useState<Active | null>(null);
  const [immersive, setImmersive] = useState(false);

  useEffect(() => save(s), [s]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, active]);

  if (!s.profile) {
    return <Onboarding onDemo={() => setS(demoState())} onDone={(profile) => setS({ ...emptyState(), profile })} />;
  }

  const exitDemo = () => { setS(emptyState()); setTab('today'); };
  const startLesson = (u: Unit = todayUnit(s)) => setActive({ kind: 'lesson', title: u.title, questions: buildLesson(s, u) });
  const startQuiz = () => setActive({ kind: 'quiz', title: 'Quiz de repaso', questions: buildQuiz(s) });
  const startExam = () => setActive({ kind: 'exam', title: 'Examen semanal', questions: buildExam(s) });

  if (active) {
    return (
      <div className="min-h-[100dvh] px-4 py-6 md:py-12 safe-pb">
        <Session
          key={active.title + active.questions.length}
          title={active.title} kind={active.kind} questions={active.questions} state={s}
          onAnswer={(q, ok) => setS((st) => applyAnswer(st, q, ok))}
          onClose={() => setActive(null)}
          onFinish={(res, minutes) => {
            setS((st) => finishSession(st, {
              kind: active.kind, title: active.title, at: Date.now(), minutes,
              score: res.filter((r) => r.ok).length, total: res.length,
              wrong: res.filter((r) => !r.ok).map((r) => r.q.conceptId),
            }));
            setActive(null);
          }}
        />
      </div>
    );
  }

  const speaking = <Speaking s={s} onImmersive={setImmersive} onSave={(sess, words) => setS((st) => applySpeaking(st, sess, words))} />;

  const screen = {
    today: <Today s={s} onLesson={() => startLesson()} onQuiz={startQuiz} onExam={startExam} onSpeaking={() => setTab('speaking')} />,
    lessons: <Lessons s={s} onUnit={startLesson} onQuiz={startQuiz} onExams={() => setTab('exams')} />,
    speaking,
    exams: <Exams s={s} onExam={startExam} onQuiz={startQuiz} />,
    vocab: <Vocab s={s} />,
    progress: <Progress s={s} onReset={() => { setS(emptyState()); setTab('today'); }} />,
  }[tab];

  const streak = streakOf(s);

  return (
    <div className={cx('min-h-[100dvh]', !immersive && 'lg:grid lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_320px]')}>
      {/* Sidebar desktop */}
      <aside className={cx('hidden flex-col gap-1 sticky top-0 h-[100dvh] px-4 py-8', !immersive && 'lg:flex')}>
        <div className="flex items-center gap-2.5 px-3 mb-10">
          <img src="icon-192.png" alt="" className="w-8 h-8 rounded-[10px] ring-1 ring-black/10" />
          <span className="text-[19px] font-semibold tracking-tight">Profe</span>
        </div>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx('flex items-center gap-3 rounded-xl px-3 h-10 text-[15px] transition',
              tab === t.id ? 'bg-white text-ink font-medium' : 'text-ink-soft hover:text-ink')}>
            <Icon name={t.id} className={cx('w-[18px] h-[18px]', tab === t.id && t.id === 'speaking' && 'text-terra')} />{t.label}
          </button>
        ))}
        <div className="mt-auto px-3 text-[13px] text-ink-mute leading-relaxed">
          <div className="text-ink font-medium">{s.profile.name}</div>
          Nivel {s.profile.level} · {streak} días de racha
        </div>
      </aside>

      <main className={immersive ? 'w-full' : 'px-4 sm:px-6 lg:px-12 pt-6 lg:pt-12 pb-28 lg:pb-12 max-w-3xl w-full mx-auto'}>
        {!immersive && <div className="lg:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="icon-192.png" alt="" className="w-7 h-7 rounded-[9px] ring-1 ring-black/10" />
            <span className="text-[17px] font-semibold tracking-tight">Profe</span>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
            <Icon name="flame" className="w-4 h-4 text-terra" />{streak}
          </span>
        </div>}
        {s.demo && !immersive && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-white/70 pl-4 pr-2 py-2">
            <span className="text-sm text-ink-soft">Estás viendo el demo de Juan</span>
            <button onClick={exitDemo} className="rounded-full bg-ink text-cream px-4 h-9 text-[13px] font-medium">Salir del demo</button>
          </div>
        )}
        <div key={tab}>{screen}</div>
      </main>

      {/* Columna derecha desktop */}
      <aside className={cx('hidden flex-col gap-4 px-6 py-12 sticky top-0 h-[100dvh] overflow-y-auto', !immersive && 'xl:flex')}>
        <StreakCard s={s} />
        <ExamCard s={s} onStart={startExam} />
        <CalendarCard s={s} />
        <WeekCard s={s} />
      </aside>

      {/* Bottom nav móvil */}
      <nav className={cx('lg:hidden fixed bottom-0 inset-x-0 z-20 bg-cream/85 backdrop-blur-md safe-pb', immersive && '!hidden')}>
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {TABS.filter((t) => t.mobile).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx('flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition', tab === t.id ? 'text-ink' : 'text-ink-mute')}>
              {t.id === 'speaking' ? (
                <span className={cx('w-11 h-8 -my-0.5 rounded-full grid place-items-center transition', tab === t.id ? 'bg-terra text-white' : 'bg-terra/10 text-terra')}>
                  <Icon name="speaking" className="w-[19px] h-[19px]" />
                </span>
              ) : (
                <Icon name={t.id} className={cx('w-[22px] h-[22px]', tab === t.id && 'text-terra')} />
              )}
              {t.short}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
