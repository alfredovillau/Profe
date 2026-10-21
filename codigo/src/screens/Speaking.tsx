import { useEffect, useRef, useState } from 'react';
import { LEVELS, Level } from '../lib/content';
import { AppState } from '../lib/engine';
import {
  NewWord, SpeakingSession, TOPICS, TopicId, Turn, TutorSettings, avgScore, buildReview, claudeTutor, demoTutor,
  fmtDuration, isIOS, learnerContext, listen, loadTutor, saveTutor, speak, sttSupported, stopSpeaking, unlockAudio,
} from '../lib/speaking';
import { Bar, Button, Card, Chip, Icon, cx } from '../components/ui';

type View = { v: 'setup' } | { v: 'call' } | { v: 'review'; sess: SpeakingSession; fresh: boolean };

export default function Speaking({ s, onSave, onImmersive }: {
  s: AppState;
  onSave: (sess: SpeakingSession, words: NewWord[]) => void;
  onImmersive: (on: boolean) => void;
}) {
  const [view, setView] = useState<View>({ v: 'setup' });
  const [topic, setTopic] = useState<TopicId>('free');
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState<Level>(s.profile!.level);
  const [tutor, setTutor] = useState<TutorSettings>(loadTutor);

  useEffect(() => { onImmersive(view.v === 'call'); return () => onImmersive(false); }, [view.v]); // eslint-disable-line
  useEffect(() => saveTutor(tutor), [tutor]);
  useEffect(() => { window.scrollTo(0, 0); }, [view.v]);

  if (view.v === 'call') {
    return (
      <Call s={s} topic={topic} custom={custom.trim()} level={level} tutor={tutor}
        setAutoSend={(autoSend) => setTutor((t) => ({ ...t, autoSend }))}
        onExit={() => setView({ v: 'setup' })}
        onDone={(sess, words) => {
          try { onSave(sess, words); } catch { /* el review se muestra igual */ }
          setView({ v: 'review', sess, fresh: true });
        }} />
    );
  }
  if (view.v === 'review') {
    const saved = s.speaking?.find((x) => x.id === view.sess.id) ?? view.sess;
    return <ReviewView sess={saved} fresh={view.fresh} onBack={() => setView({ v: 'setup' })} />;
  }

  const ctx = learnerContext(s);
  const history = s.speaking ?? [];
  const canStart = topic !== 'custom' || custom.trim().length > 1;

  return (
    <div className="space-y-8 fade-up">
      <header>
        <h1 className="font-serif text-[34px] md:text-5xl leading-[1.05]">Practice speaking</h1>
        <p className="mt-2 text-[15px] text-ink-soft">Have a conversation in English with your AI tutor.</p>
      </header>

      <section>
        <h3 className="text-sm text-ink-mute mb-3">Tema</h3>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)}>{t.label}</Chip>)}
        </div>
        {topic === 'custom' && (
          <input id="custom-topic" autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ej. fútbol, fotografía, coches…"
            className="mt-3 w-full h-12 rounded-2xl bg-white/80 px-4 text-[16px] outline-none focus:ring-2 focus:ring-terra/30" />
        )}
      </section>

      <section>
        <h3 className="text-sm text-ink-mute mb-3">Dificultad</h3>
        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={cx('h-11 rounded-2xl text-[15px] font-medium transition', level === l ? 'bg-ink text-cream' : 'bg-white/70 hover:bg-white')}>{l}</button>
          ))}
        </div>
      </section>

      <div>
        <Button className="w-full" disabled={!canStart} onClick={() => { unlockAudio(); setView({ v: 'call' }); }}>
          <Icon name="mic" className="w-[18px] h-[18px]" /> Start conversation
        </Button>
        <p className="mt-3 text-[13px] text-ink-mute text-center">
          Tu tutor conoce tu nivel, {ctx.learned} palabras aprendidas
          {ctx.weakTopics.length > 0 && <> y que te cuesta {ctx.weakTopics.slice(0, 2).join(', ')}</>}.
        </p>
      </div>

      <TutorSettingsPanel tutor={tutor} setTutor={setTutor} />

      <section>
        <h3 className="text-sm text-ink-mute mb-3">Historial</h3>
        {history.length ? (
          <Card className="!p-0 overflow-hidden divide-y divide-black/[0.05]">
            {history.slice(0, 12).map((h) => (
              <button key={h.id} onClick={() => setView({ v: 'review', sess: h, fresh: false })}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02]">
                <span className="w-11 h-11 rounded-full grid place-items-center bg-black/[0.04] text-[15px] font-semibold tabular-nums">{avgScore(h.review)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium truncate">{h.topicLabel}</span>
                  <span className="block text-[13px] text-ink-mute">
                    {new Date(h.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {h.level} · {fmtDuration(h.seconds)} · {h.review.errors.length} correcciones
                  </span>
                </span>
                <Icon name="chevron" className="w-4 h-4 text-ink-mute" />
              </button>
            ))}
          </Card>
        ) : <p className="text-sm text-ink-soft">Aquí verás tus conversaciones y cómo evolucionas.</p>}
      </section>
    </div>
  );
}

function TutorSettingsPanel({ tutor, setTutor }: { tutor: TutorSettings; setTutor: (f: (t: TutorSettings) => TutorSettings) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-sm text-ink-mute">
        <span className="inline-flex items-center gap-2"><Icon name="settings" className="w-4 h-4" />
          Tutor: {tutor.provider === 'claude' && tutor.apiKey ? 'Claude (IA)' : 'Demo sin conexión'}</span>
        <Icon name="chevron" className={cx('w-4 h-4 transition', open && 'rotate-90')} />
      </button>
      {open && (
        <Card className="mt-3 space-y-4 text-sm">
          <div className="flex gap-2">
            <Chip active={tutor.provider === 'demo'} onClick={() => setTutor((t) => ({ ...t, provider: 'demo' }))}>Demo</Chip>
            <Chip active={tutor.provider === 'claude'} onClick={() => setTutor((t) => ({ ...t, provider: 'claude' }))}>Claude (API)</Chip>
          </div>
          {tutor.provider === 'demo' ? (
            <p className="text-ink-soft">El tutor demo funciona sin internet ni cuenta: reacciona, hace preguntas de seguimiento y detecta errores frecuentes, pero no es una IA real. Para conversaciones abiertas de verdad, usa Claude con tu API key.</p>
          ) : (
            <>
              <label className="block">
                <span className="text-ink-mute">API key de Anthropic</span>
                <input id="api-key" type="password" value={tutor.apiKey} onChange={(e) => setTutor((t) => ({ ...t, apiKey: e.target.value.trim() }))}
                  placeholder="sk-ant-…" autoComplete="off"
                  className="mt-1 w-full h-11 rounded-xl bg-cream px-3 text-[16px] outline-none focus:ring-2 focus:ring-terra/30" />
              </label>
              <label className="block">
                <span className="text-ink-mute">Modelo</span>
                <input id="api-model" value={tutor.model} onChange={(e) => setTutor((t) => ({ ...t, model: e.target.value.trim() }))}
                  className="mt-1 w-full h-11 rounded-xl bg-cream px-3 text-[16px] outline-none focus:ring-2 focus:ring-terra/30" />
              </label>
              <p className="text-ink-mute text-[13px]">La key se guarda solo en este dispositivo y se envía únicamente a api.anthropic.com. Úsala solo en tu teléfono o PC personal. Se obtiene en console.anthropic.com y el uso se cobra por consumo.</p>
            </>
          )}
        </Card>
      )}
    </section>
  );
}

// ---------------- Llamada ----------------
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
const PHASE_LABEL: Record<Phase, string> = { idle: 'Toca el micrófono para responder', listening: 'Listening… toca el micrófono para enviar', thinking: 'Thinking…', speaking: 'Speaking…' };

function Call({ s, topic, custom, level, tutor, setAutoSend, onExit, onDone }: {
  s: AppState; topic: TopicId; custom: string; level: Level; tutor: TutorSettings;
  setAutoSend: (v: boolean) => void; onExit: () => void; onDone: (sess: SpeakingSession, words: NewWord[]) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [interim, setInterim] = useState('');
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(!sttSupported());
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [secs, setSecs] = useState(0);
  const turnsRef = useRef<Turn[]>([]);
  const words = useRef<NewWord[]>([]);
  const stopRef = useRef<() => void>(() => {});
  const alive = useRef(true);
  const start = useRef(Date.now());
  const useClaude = tutor.provider === 'claude' && !!tutor.apiKey;
  const engine = useClaude ? claudeTutor(tutor.apiKey, tutor.model) : demoTutor;
  const learner = useRef(learnerContext(s)).current;
  const topicLabel = topic === 'custom' ? custom : TOPICS.find((t) => t.id === topic)!.label;

  const typingRef = useRef(typing);
  const autoRef = useRef(tutor.autoSend);
  useEffect(() => { typingRef.current = typing; }, [typing]);
  useEffect(() => { autoRef.current = tutor.autoSend; }, [tutor.autoSend]);
  const commit = (t: Turn[]) => { turnsRef.current = t; setTurns(t); };

  useEffect(() => {
    const id = setInterval(() => setSecs(Math.round((Date.now() - start.current) / 1000)), 1000);
    // Cualquier error inesperado se muestra y libera los botones en vez de trabar la llamada
    const onErr = (ev: ErrorEvent | PromiseRejectionEvent) => {
      const msg = 'reason' in ev ? String((ev.reason && ev.reason.message) || ev.reason) : ev.message;
      setError(`Algo falló: ${msg}. Puedes seguir o terminar la conversación.`);
      setPhase('idle');
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    ask([]);
    return () => {
      alive.current = false; clearInterval(id); stopSpeaking();
      window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr);
    };
  }, []); // eslint-disable-line

  async function ask(history: Turn[]) {
    setPhase('thinking');
    setError('');
    try {
      const r = await Promise.race([
        engine.reply({ topic, customTopic: custom, level, learner, turns: history }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('El tutor tardó demasiado en responder. Intenta de nuevo.')), 25_000)),
      ]);
      if (!alive.current) return;
      let t = [...history];
      if (r.corrections.length) {
        const i = t.map((x) => x.role).lastIndexOf('user');
        if (i >= 0) t[i] = { ...t[i], corrections: r.corrections };
      }
      words.current.push(...r.newWords);
      t = [...t, { role: 'tutor', text: r.reply }];
      commit(t);
      setPhase('speaking');
      await speak(r.reply, level);
      if (!alive.current) return;
      // En iPhone el micrófono solo se puede abrir con un toque: no se abre solo
      if (sttSupported() && !typingRef.current && !isIOS()) startListening(); else setPhase('idle');
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : 'No se pudo obtener respuesta.');
      setPhase('idle');
    }
  }

  function startListening() {
    if (!sttSupported()) { setTyping(true); return; }
    stopSpeaking();
    setInterim('');
    setPhase('listening');
    stopRef.current = listen({
      onInterim: setInterim,
      onFinal: (text, conf) => {
        stopRef.current = () => {};
        setInterim('');
        if (!alive.current) return;
        if (!text) return setPhase('idle');
        if (autoRef.current) send(text, conf, false);
        else { setDraft(text); setPhase('idle'); }
      },
      onEnd: () => { stopRef.current = () => {}; setInterim(''); if (alive.current) setPhase((p) => (p === 'listening' ? 'idle' : p)); },
      onError: (e) => {
        stopRef.current = () => {};
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          setError('El micrófono está bloqueado. Permítelo en el navegador o escribe tus respuestas.');
          setTyping(true);
        } else setError('No se pudo usar el micrófono. Tócalo de nuevo o escribe tu respuesta.');
        setPhase('idle');
      },
    });
  }

  function send(text: string, conf?: number, typed = true) {
    const clean = text.trim();
    if (!clean) return;
    setDraft('');
    const t: Turn[] = [...turnsRef.current, { role: 'user', text: clean, conf, typed }];
    commit(t);
    ask(t);
  }

  function micTap() {
    if (phase === 'listening') { stopRef.current(); return; } // envía lo escuchado
    if (phase === 'thinking') return;
    startListening();
  }

  function end() {
    alive.current = false;
    const stop = stopRef.current; stopRef.current = () => {};
    try { stop(); } catch { /* */ }
    stopSpeaking();
    const t = turnsRef.current;
    if (!t.some((x) => x.role === 'user')) return onExit();
    try {
      const seconds = Math.max(1, Math.round((Date.now() - start.current) / 1000));
      const review = buildReview(s, t, topic, level, words.current);
      onDone({
        id: String(Date.now()), at: Date.now(), seconds, topic, topicLabel, level,
        tutor: useClaude ? 'claude' : 'demo', turns: t, review,
      }, words.current);
    } catch {
      onExit(); // nunca dejar al usuario atrapado en la llamada
    }
  }

  const lastTutor = [...turns].reverse().find((x) => x.role === 'tutor');
  const lastUser = [...turns].reverse().find((x) => x.role === 'user');
  const fix = lastUser?.corrections?.[0];

  return (
    <div className="min-h-[100dvh] flex flex-col px-5 pt-5 pb-6 safe-pb max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate">{topicLabel}</div>
          <div className="text-ink-mute tabular-nums">{level} · {fmtDuration(secs)}{!useClaude && ' · tutor demo'}</div>
        </div>
        <button onClick={() => setShowLog(true)} className="rounded-full px-3.5 h-9 bg-black/[0.05] text-[13px] font-medium">Transcripción</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
        <Avatar phase={phase} />
        <div className="mt-6 text-sm text-ink-mute h-5">{PHASE_LABEL[phase]}</div>
        <p className="mt-4 text-[19px] md:text-[21px] leading-snug max-w-md min-h-[3.5em] fade-up" key={lastTutor?.text}>
          {lastTutor?.text ?? ''}
        </p>
        {phase === 'listening' && interim && <p className="mt-3 text-[15px] text-ink-soft italic max-w-md">“{interim}”</p>}
        {fix && phase !== 'listening' && (
          <div className="mt-5 max-w-md rounded-2xl bg-white/70 px-4 py-3 text-left text-[13px] fade-up" key={fix.better}>
            <div className="text-ink-mute">You said: <span className="text-ink-soft">“{fix.said}”</span></div>
            <div className="mt-0.5 text-terra">Better: “{fix.better}”</div>
          </div>
        )}
        {error && <p className="mt-4 text-[13px] text-terra max-w-sm">{error}</p>}
      </div>

      {(typing || draft) && (
        <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); send(draft, undefined, true); }}>
          <input id="speak-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe en inglés…" autoComplete="off"
            className="flex-1 h-12 rounded-full bg-white/80 px-5 text-[16px] outline-none focus:ring-2 focus:ring-terra/30" />
          <button type="submit" disabled={!draft.trim() || phase === 'thinking'} aria-label="Enviar"
            className="w-12 h-12 rounded-full grid place-items-center bg-ink text-cream disabled:opacity-30"><Icon name="send" className="w-5 h-5" /></button>
        </form>
      )}

      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          {sttSupported() && (
            <button onClick={() => setTyping((v) => !v)} aria-label="Escribir"
              className={cx('w-12 h-12 rounded-full grid place-items-center transition', typing ? 'bg-ink text-cream' : 'bg-black/[0.05]')}>
              <Icon name="keyboard" className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex justify-center">
          <button onClick={micTap} disabled={!sttSupported() || phase === 'thinking'} aria-label="Micrófono"
            className={cx('w-20 h-20 rounded-full grid place-items-center text-white transition active:scale-95 disabled:opacity-35',
              phase === 'listening' ? 'bg-ink' : 'bg-terra')}>
            {phase === 'listening' ? <span className="w-6 h-6 rounded-md bg-white" /> : <Icon name="mic" className="w-8 h-8" />}
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={end} className="h-12 px-5 rounded-full bg-black/[0.05] text-[14px] font-medium hover:bg-terra-pale hover:text-terra transition">Terminar</button>
        </div>
      </div>
      {sttSupported() ? (
        <label className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-mute">
          <input id="auto-send" type="checkbox" checked={tutor.autoSend} onChange={(e) => setAutoSend(e.target.checked)} className="accent-[#C65F3A]" />
          Enviar automáticamente al terminar de hablar
        </label>
      ) : (
        <p className="mt-4 text-center text-[12px] text-ink-mute">Este navegador no permite reconocimiento de voz; escribe tus respuestas. El tutor sí te responde con voz.</p>
      )}

      {showLog && <Transcript turns={turns} onClose={() => setShowLog(false)} />}
    </div>
  );
}

function Avatar({ phase }: { phase: Phase }) {
  return (
    <div className="relative w-40 h-40 grid place-items-center">
      {phase === 'listening' && [0, 0.6].map((d) => (
        <span key={d} className="absolute inset-0 rounded-full bg-terra/40" style={{ animation: `pulseRing 1.6s ease-out ${d}s infinite` }} />
      ))}
      <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-terra-light to-terra grid place-items-center text-white shadow-[0_20px_50px_-20px_rgba(198,95,58,0.6)]"
        style={{ animation: phase === 'speaking' ? 'breathe 1.4s ease-in-out infinite' : undefined }}>
        {phase === 'thinking'
          ? <span className="flex gap-1.5">{[0, 0.2, 0.4].map((d) => <span key={d} className="w-2.5 h-2.5 rounded-full bg-white" style={{ animation: `dot 1.2s ${d}s infinite` }} />)}</span>
          : <span className="text-5xl font-semibold tracking-tight">P</span>}
      </div>
    </div>
  );
}

function Transcript({ turns, onClose }: { turns: Turn[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 bg-cream/95 backdrop-blur-sm flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-5 h-14 max-w-xl mx-auto w-full">
        <span className="font-medium">Transcripción</span>
        <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 grid place-items-center rounded-full hover:bg-black/5"><Icon name="close" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6 max-w-xl mx-auto w-full space-y-4">
        <TurnList turns={turns} />
      </div>
    </div>
  );
}

function TurnList({ turns }: { turns: Turn[] }) {
  return (
    <>
      {turns.map((t, i) => (
        <div key={i} className={cx('flex flex-col', t.role === 'user' ? 'items-end' : 'items-start')}>
          <div className={cx('max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug', t.role === 'user' ? 'bg-ink text-cream' : 'bg-white/80')}>{t.text}</div>
          {t.corrections?.map((c, k) => (
            <div key={k} className="max-w-[85%] mt-1 text-[12.5px] text-terra text-right">Better: “{c.better}”{c.note && <span className="text-ink-mute"> · {c.note}</span>}</div>
          ))}
        </div>
      ))}
    </>
  );
}

// ---------------- Speaking Review ----------------
function ReviewView({ sess, fresh, onBack }: { sess: SpeakingSession; fresh: boolean; onBack: () => void }) {
  const r = sess.review;
  const [log, setLog] = useState(false);
  const metrics: [string, number | null][] = [
    ['Fluency', r.scores.fluency], ['Vocabulary', r.scores.vocabulary], ['Grammar', r.scores.grammar], ['Pronunciation', r.scores.pronunciation],
  ];
  return (
    <div className="space-y-8 fade-up max-w-2xl">
      <header>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-mute mb-4 hover:text-ink">
          <Icon name="back" className="w-4 h-4" /> Speaking
        </button>
        <h1 className="font-serif text-[34px] md:text-5xl leading-[1.05]">Speaking Review</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          {sess.topicLabel} · {sess.level} · {new Date(sess.at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
          {sess.tutor === 'demo' && ' · tutor demo'}
        </p>
      </header>

      <div className="grid grid-cols-3 text-center">
        <Big v={fmtDuration(sess.seconds)} l="duración" />
        <Big v={String(r.userTurns)} l="intervenciones" />
        <Big v={String(r.newWords.length)} l="palabras nuevas" />
      </div>

      <Card className="space-y-4">
        {metrics.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-[15px]">
              <span>{k}</span>
              <span className="tabular-nums font-medium">{v ?? '—'}</span>
            </div>
            <Bar value={v ?? 0} className="mt-2" />
            {v === null && <p className="mt-1 text-[12px] text-ink-mute">Disponible cuando hablas con el micrófono.</p>}
          </div>
        ))}
      </Card>

      {fresh && r.conceptsAdded > 0 && (
        <p className="text-[14px] text-ink-soft">
          <span className="text-terra font-medium">{r.conceptsAdded} conceptos</span> se agregaron a tus repasos, lecciones y quizzes.
        </p>
      )}

      <Section title="Errores principales">
        {r.weakTopics.length ? <List items={r.weakTopics} /> : <Empty>Sin errores importantes detectados.</Empty>}
      </Section>

      {r.errors.length > 0 && (
        <Section title="Frases que puedes decir mejor">
          <ul className="space-y-3">
            {r.errors.map((e, i) => (
              <li key={i} className="text-[15px]">
                <div className="text-ink-mute line-through decoration-ink-mute/40">{e.said}</div>
                <div className="text-ink">{e.better}</div>
                {e.note && <div className="text-[13px] text-terra mt-0.5">{e.note}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Vocabulario">
        {r.newWords.length > 0 && (
          <div className="mb-4">
            <div className="text-[13px] text-ink-mute mb-2">Palabras nuevas</div>
            <div className="flex flex-wrap gap-2">{r.newWords.map((w) => <span key={w} className="rounded-full bg-white/80 px-3 h-8 inline-flex items-center text-sm">{w}</span>)}</div>
          </div>
        )}
        <div className="text-[13px] text-ink-mute mb-2">Recomendado para ti</div>
        {r.recommended.length ? (
          <ul className="space-y-1.5 text-[15px]">
            {r.recommended.map((w) => <li key={w.id}>{w.term} <span className="text-ink-mute">· {w.translation}</span></li>)}
          </ul>
        ) : <Empty>Ya dominas el vocabulario principal de este tema.</Empty>}
      </Section>

      <div className="grid md:grid-cols-2 gap-8">
        <Section title="Fortalezas"><List items={r.strengths} /></Section>
        <Section title="Áreas de mejora"><List items={r.improve} /></Section>
      </div>

      <Section title="Para tu próxima sesión"><List items={r.recs} accent /></Section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={onBack}>Listo</Button>
        <Button variant="ghost" onClick={() => setLog((v) => !v)}>{log ? 'Ocultar' : 'Ver'} transcripción</Button>
      </div>
      {log && <div className="space-y-4"><TurnList turns={sess.turns} /></div>}
    </div>
  );
}

const Big = ({ v, l }: { v: string; l: string }) => (
  <div><div className="text-2xl font-semibold tracking-tight tabular-nums">{v}</div><div className="mt-0.5 text-[12px] text-ink-mute">{l}</div></div>
);
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section><h3 className="text-sm text-ink-mute mb-3">{title}</h3>{children}</section>
);
const List = ({ items, accent }: { items: string[]; accent?: boolean }) => (
  <ul className="space-y-2.5 text-[15px] leading-snug">
    {items.map((x) => <li key={x} className="flex gap-3"><span className={cx('mt-2 w-1.5 h-1.5 rounded-full shrink-0', accent ? 'bg-terra' : 'bg-ink/30')} />{x}</li>)}
  </ul>
);
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[15px] text-ink-soft">{children}</p>;
