import { AppState } from '../lib/engine';
import { Button, Card, Eyebrow, Icon, cx } from '../components/ui';
import { ExamCard } from '../components/Widgets';
import { conceptById } from '../lib/content';

export default function Exams({ s, onExam, onQuiz }: { s: AppState; onExam: () => void; onQuiz: () => void }) {
  const exams = s.history.filter((h) => h.kind === 'exam');
  const quizzes = s.history.filter((h) => h.kind === 'quiz');
  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Exámenes y quizzes</Eyebrow>
        <h1 className="mt-1 font-serif text-[34px] md:text-5xl leading-[1.05]">Mide tu avance</h1>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <ExamCard s={s} onStart={onExam} />
        <Card>
          <Eyebrow>Quiz rápido</Eyebrow>
          <div className="mt-3 font-serif text-2xl leading-tight">Repaso adaptativo</div>
          <p className="mt-1 text-sm text-ink-soft">8 preguntas sobre lo aprendido, priorizando tus errores.</p>
          <Button variant="dark" className="mt-4 w-full" onClick={onQuiz}>Empezar quiz</Button>
        </Card>
      </div>

      <HistoryList title="Exámenes semanales" items={exams} empty="Aún no has hecho un examen semanal." />
      <HistoryList title="Quizzes" items={quizzes} empty="Aún no has hecho quizzes." />
    </div>
  );
}

function HistoryList({ title, items, empty }: { title: string; items: AppState['history']; empty: string }) {
  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      {items.length ? (
        <ul className="mt-3 divide-y divide-black/5">
          {items.slice(0, 8).map((h, i) => {
            const pct = Math.round((h.score / h.total) * 100);
            const wrong = Array.from(new Set(h.wrong)).map((id) => conceptById[id]?.term).filter(Boolean);
            return (
              <li key={i} className="py-3 flex items-center gap-4">
                <span className={cx('w-12 h-12 shrink-0 rounded-2xl grid place-items-center font-serif text-lg',
                  pct >= 80 ? 'bg-[#E8F0EA] text-ok' : pct >= 60 ? 'bg-[#F1E6C8] text-[#8A6A1F]' : 'bg-terra-pale text-terra')}>{pct}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{h.score}/{h.total} correctas</div>
                  <div className="text-xs text-ink-mute truncate">
                    {new Date(h.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {h.minutes} min
                    {wrong.length > 0 && <> · repasar: {wrong.slice(0, 4).join(', ')}</>}
                  </div>
                </div>
                <Icon name="check" className={cx('w-4 h-4', pct >= 80 ? 'text-ok' : 'text-transparent')} />
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-3 text-sm text-ink-soft">{empty}</p>}
    </Card>
  );
}
