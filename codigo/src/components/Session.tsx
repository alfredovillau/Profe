import { FormEvent, useEffect, useRef, useState } from 'react';
import { CONCEPTS, conceptById } from '../lib/content';
import { AppState, Question, isCorrect, makeQuestion } from '../lib/engine';
import { Bar, Button, Card, Eyebrow, Icon, Ring, cx } from './ui';

export interface Result { q: Question; ok: boolean; given: string }

interface Props {
  title: string;
  kind: 'lesson' | 'quiz' | 'exam' | 'placement';
  questions: Question[];
  state?: AppState; // para re-generar preguntas de repaso
  onAnswer?: (q: Question, ok: boolean) => void;
  onFinish: (results: Result[], minutes: number) => void;
  onClose: () => void;
}

export default function Session({ title, kind, questions, state, onAnswer, onFinish, onClose }: Props) {
  const [queue, setQueue] = useState(questions);
  const [i, setI] = useState(0);
  const [given, setGiven] = useState('');
  const [checked, setChecked] = useState<null | boolean>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const [requeued, setRequeued] = useState<string[]>([]);
  const start = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const q = queue[i];
  const typed = q && !q.options;
  const showFeedback = kind !== 'placement';

  useEffect(() => { if (typed && checked === null) inputRef.current?.focus(); }, [i, typed, checked]);

  function check(value = given) {
    if (checked !== null || !value.trim()) return;
    const ok = isCorrect(q, value);
    setGiven(value);
    setChecked(ok);
    setResults((r) => [...r, { q, ok, given: value }]);
    onAnswer?.(q, ok);
    // Error en lección/quiz: el concepto vuelve más adelante con otra pregunta.
    if (!ok && (kind === 'lesson' || kind === 'quiz') && !requeued.includes(q.conceptId)) {
      const again = makeQuestion(conceptById[q.conceptId], state?.concepts[q.conceptId], [q.variant]);
      setQueue((qs) => {
        const at = Math.min(qs.length, i + 3);
        return [...qs.slice(0, at), again, ...qs.slice(at)];
      });
      setRequeued((r) => [...r, q.conceptId]);
    }
    if (!showFeedback) setTimeout(() => next(), 150);
  }

  function next() {
    if (i + 1 >= queue.length) {
      setDone(true);
      return;
    }
    setI((n) => n + 1);
    setGiven('');
    setChecked(null);
  }

  useEffect(() => {
    if (!done) return;
    if (kind === 'placement') onFinish(results, minutes());
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = () => Math.max(1, Math.round((Date.now() - start.current) / 60000));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && checked !== null && showFeedback) next();
      if (q?.options && checked === null && /^[1-4]$/.test(e.key)) check(q.options[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    if (kind === 'placement') return null;
    return <Summary title={title} kind={kind} results={results} onClose={() => onFinish(results, minutes())} />;
  }

  const progress = (i / queue.length) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onClose} aria-label="Salir" className="w-10 h-10 grid place-items-center rounded-full hover:bg-black/5 shrink-0">
          <Icon name="close" />
        </button>
        <Bar value={progress} className="h-2" />
        <span className="text-sm tabular-nums text-ink-soft shrink-0">{i + 1}/{queue.length}</span>
      </div>

      <Card className="!p-6 md:!p-8">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow className="!text-terra">{q.label}</Eyebrow>
          <Eyebrow>{title}</Eyebrow>
        </div>
        <h2 className="mt-4 font-serif text-[28px] md:text-[34px] leading-tight text-ink">
          {q.prompt.split('___').map((part, k, arr) => (
            <span key={k}>
              {part}
              {k < arr.length - 1 && (
                <span className={cx('inline-block min-w-[3.5rem] border-b-2 mx-1 text-center',
                  checked === null ? 'border-terra/60 text-transparent' : checked ? 'border-ok text-ok' : 'border-terra text-terra')}>
                  {checked === null ? ' ' : q.answer}
                </span>
              )}
            </span>
          ))}
        </h2>
        {q.hint && <p className="mt-2 text-sm text-ink-mute">{q.hint}</p>}

        {q.options ? (
          <div className="mt-6 grid gap-2.5">
            {q.options.map((o, k) => {
              const isAns = o === q.answer;
              const picked = o === given;
              const state = checked === null || !showFeedback ? 'idle' : isAns ? 'right' : picked ? 'wrong' : 'dim';
              return (
                <button key={o} disabled={checked !== null} onClick={() => check(o)}
                  className={cx('flex items-center gap-3 text-left rounded-2xl border px-4 py-3.5 text-[15px] transition',
                    state === 'idle' && 'border-black/10 bg-white hover:border-ink/40',
                    state === 'right' && 'border-ok bg-[#E8F0EA] text-ok font-medium',
                    state === 'wrong' && 'border-terra bg-terra-pale text-terra',
                    state === 'dim' && 'border-black/5 bg-white/60 text-ink-mute')}>
                  <span className={cx('w-6 h-6 shrink-0 grid place-items-center rounded-full text-[11px] font-semibold',
                    state === 'idle' ? 'bg-black/[0.06] text-ink-soft' : 'bg-white/70')}>
                    {state === 'right' ? <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.5} /> : state === 'wrong' ? <Icon name="x" className="w-3.5 h-3.5" strokeWidth={2.5} /> : k + 1}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="mt-6 flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); check(); }}>
            <input ref={inputRef} value={given} onChange={(e) => setGiven(e.target.value)} disabled={checked !== null}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Escribe tu respuesta…"
              className={cx('flex-1 h-12 rounded-2xl border bg-white px-4 text-[16px] outline-none focus:border-ink/50',
                checked === null ? 'border-black/10' : checked ? 'border-ok text-ok' : 'border-terra text-terra')} />
            {checked === null && <Button type="submit" variant="dark" disabled={!given.trim()}>Revisar</Button>}
          </form>
        )}
      </Card>

      {checked !== null && showFeedback && (
        <div className={cx('mt-4 rounded-xl3 p-5 md:p-6 border', checked ? 'bg-[#E8F0EA] border-ok/20' : 'bg-terra-pale border-terra/20')}>
          <div className="flex items-start gap-3">
            <span className={cx('w-8 h-8 shrink-0 grid place-items-center rounded-full text-white', checked ? 'bg-ok' : 'bg-terra')}>
              <Icon name={checked ? 'check' : 'x'} className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className={cx('font-semibold', checked ? 'text-ok' : 'text-terra')}>
                {checked ? 'Correcto' : `Incorrecto · respuesta: ${q.answer}`}
              </div>
              <p className="mt-1 text-[15px] text-ink-2">{q.explanation}</p>
              <p className="mt-2 text-sm text-ink-soft"><span className="font-semibold text-ink">Ejemplo:</span> <i>{q.example}</i></p>
              {!checked && kind !== 'exam' && <p className="mt-2 text-xs text-ink-mute">Lo repasarás más adelante con otra pregunta.</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="dark" onClick={next}>
              {i + 1 >= queue.length ? 'Ver resultados' : 'Siguiente'} <Icon name="arrow" className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function catOf(id: string) {
  const c = conceptById[id];
  return c.kind === 'grammar' && c.category === 'Gramática' ? c.term : `${c.category}`;
}

function Summary({ title, kind, results, onClose }: { title: string; kind: string; results: Result[]; onClose: () => void }) {
  const ok = results.filter((r) => r.ok).length;
  const pct = Math.round((ok / Math.max(1, results.length)) * 100);
  const wrong = results.filter((r) => !r.ok);
  const byCat: Record<string, { ok: number; n: number }> = {};
  results.forEach((r) => {
    const k = catOf(r.q.conceptId);
    const e = (byCat[k] ??= { ok: 0, n: 0 });
    e.n++; if (r.ok) e.ok++;
  });
  const cats = Object.entries(byCat).map(([k, e]) => ({ k, pct: Math.round((e.ok / e.n) * 100) }));
  const strengths = cats.filter((c) => c.pct >= 80);
  const review = cats.filter((c) => c.pct < 70);
  const uniqueWrong = Array.from(new Map(wrong.map((r) => [r.q.conceptId, r])).values());
  const msg = pct >= 90 ? 'Excelente trabajo.' : pct >= 70 ? 'Buen avance.' : 'Vas construyendo la base.';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Card className="!p-7 md:!p-9">
        <Eyebrow className="">{kind === 'exam' ? 'Resultado del examen' : 'Sesión completada'}</Eyebrow>
        <div className="mt-4 flex items-center gap-6">
          <Ring value={pct} size={104} stroke={8}>
            <div className="font-serif text-3xl">{pct}%</div>
          </Ring>
          <div>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">{msg}</h2>
            <p className="mt-1 text-ink-soft">{title} · {ok} de {results.length} correctas</p>
          </div>
        </div>
      </Card>

      {(kind === 'exam' || cats.length > 1) && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <Eyebrow>Fortalezas</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              {strengths.length ? strengths.map((c) => (
                <li key={c.k} className="flex justify-between"><span>{c.k}</span><span className="text-ok font-semibold">{c.pct}%</span></li>
              )) : <li className="text-ink-mute">Aún sin áreas por encima de 80 %.</li>}
            </ul>
          </Card>
          <Card>
            <Eyebrow>Temas a repasar</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              {review.length ? review.map((c) => (
                <li key={c.k} className="flex justify-between"><span>{c.k}</span><span className="text-terra font-semibold">{c.pct}%</span></li>
              )) : <li className="text-ink-mute">Nada pendiente. Sigue así.</li>}
            </ul>
          </Card>
        </div>
      )}

      {uniqueWrong.length > 0 && (
        <Card>
          <Eyebrow>Errores ({wrong.length})</Eyebrow>
          <ul className="mt-3 divide-y divide-black/5">
            {uniqueWrong.map((r) => (
              <li key={r.q.conceptId} className="py-3">
                <div className="text-[15px]">
                  <span className="font-semibold">{conceptById[r.q.conceptId].term}</span>
                  <span className="text-ink-mute"> — {conceptById[r.q.conceptId].translation}</span>
                </div>
                <div className="text-sm text-ink-soft mt-0.5">
                  Respondiste <span className="text-terra">“{r.given}”</span> · correcta: <span className="text-ok">“{r.q.answer}”</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-mute">Estos conceptos tendrán prioridad en tus próximas lecciones.</p>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={onClose}>Terminar <Icon name="arrow" className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

export const totalConcepts = CONCEPTS.length;
