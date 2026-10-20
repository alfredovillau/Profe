import { ReactNode, useMemo, useState } from 'react';
import { Goal, Level } from '../lib/content';
import { Profile, buildPlacement, placementLevel } from '../lib/engine';
import { Button, Card, Chip, Eyebrow, Icon, cx } from '../components/ui';
import Session from '../components/Session';

const GOALS: { id: Goal; d: string }[] = [
  { id: 'conversación', d: 'Hablar con fluidez en el día a día' },
  { id: 'trabajo', d: 'Emails, reuniones y negociación' },
  { id: 'viajes', d: 'Aeropuertos, hoteles y restaurantes' },
  { id: 'escuela', d: 'Clases, tareas y exámenes' },
  { id: 'general', d: 'Un poco de todo' },
];
const INTERESTS = ['Tecnología', 'Negocios', 'Viajes', 'Deportes', 'Música', 'Cine y series', 'Ciencia', 'Comida', 'Videojuegos'];

export default function Onboarding({ onDone, onDemo }: { onDone: (p: Profile) => void; onDemo: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('general');
  const [minutes, setMinutes] = useState(10);
  const [interests, setInterests] = useState<string[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [score, setScore] = useState(0);
  const placement = useMemo(buildPlacement, []);

  if (step === 5) {
    return (
      <Shell>
        <Session title="Test de nivel" kind="placement" questions={placement}
          onClose={() => setStep(4)}
          onFinish={(res) => {
            const ok = res.filter((r) => r.ok).length;
            setScore(ok);
            setLevel(placementLevel(ok));
            setStep(6);
          }} />
      </Shell>
    );
  }

  const steps = [
    <div key={0} className="text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-ink text-cream grid place-items-center font-serif text-4xl">P</div>
      <h1 className="mt-6 font-serif text-5xl md:text-6xl leading-none">Profe</h1>
      <p className="mt-3 text-ink-soft max-w-sm mx-auto">Inglés diario, personalizado y adaptativo. Unos minutos al día, con repasos inteligentes de lo que más te cuesta.</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => setStep(1)}>Comenzar <Icon name="arrow" className="w-4 h-4" /></Button>
        <Button variant="ghost" onClick={onDemo}>Ver demo</Button>
      </div>
    </div>,

    <Step key={1} n={1} title="¿Cómo te llamas?" next={() => setStep(2)} canNext={!!name.trim()} back={() => setStep(0)}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre"
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
        className="w-full h-14 rounded-2xl border border-black/10 bg-white px-5 text-lg outline-none focus:border-ink/40" />
    </Step>,

    <Step key={2} n={2} title="¿Cuál es tu objetivo?" next={() => setStep(3)} back={() => setStep(1)}>
      <div className="grid gap-2.5">
        {GOALS.map((g) => (
          <button key={g.id} onClick={() => setGoal(g.id)}
            className={cx('text-left rounded-2xl border px-5 py-4 transition', goal === g.id ? 'border-ink bg-ink text-cream' : 'border-black/10 bg-white hover:border-ink/30')}>
            <div className="font-semibold capitalize">{g.id}</div>
            <div className={cx('text-sm', goal === g.id ? 'text-cream/60' : 'text-ink-soft')}>{g.d}</div>
          </button>
        ))}
      </div>
    </Step>,

    <Step key={3} n={3} title="¿Cuántos minutos al día?" next={() => setStep(4)} back={() => setStep(2)}>
      <div className="grid grid-cols-4 gap-2.5">
        {[5, 10, 15, 20].map((m) => (
          <button key={m} onClick={() => setMinutes(m)}
            className={cx('rounded-2xl border py-5 transition', minutes === m ? 'border-ink bg-ink text-cream' : 'border-black/10 bg-white hover:border-ink/30')}>
            <div className="font-serif text-3xl">{m}</div><div className="text-xs opacity-60">min</div>
          </button>
        ))}
      </div>
    </Step>,

    <Step key={4} n={4} title="¿Qué te interesa?" next={() => setStep(5)} back={() => setStep(3)} nextLabel="Hacer test de nivel">
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((i) => (
          <Chip key={i} active={interests.includes(i)} onClick={() => setInterests((xs) => xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i])}>{i}</Chip>
        ))}
      </div>
      <p className="mt-5 text-sm text-ink-soft">Después harás un test corto de 10 preguntas para asignarte un nivel (A1–C1).</p>
    </Step>,
  ];

  if (step === 6 && level) {
    return (
      <Shell>
        <Card dark className="!p-8 text-center">
          <Eyebrow className="!text-cream/50">Tu nivel</Eyebrow>
          <div className="mt-4 font-serif text-8xl leading-none text-terra-light">{level}</div>
          <p className="mt-4 text-cream/70">{score} de {placement.length} correctas. Tus lecciones se ajustarán a medida que avances.</p>
          <Button className="mt-8" onClick={() => onDone({ name: name.trim(), goal, minutes, interests, level, createdAt: Date.now() })}>
            Empezar a aprender <Icon name="arrow" className="w-4 h-4" />
          </Button>
        </Card>
      </Shell>
    );
  }

  return <Shell>{steps[step]}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] grid place-items-center px-4 py-10"><div className="w-full max-w-lg">{children}</div></div>;
}

function Step({ n, title, children, next, back, canNext = true, nextLabel = 'Continuar' }: {
  n: number; title: string; children: ReactNode; next: () => void; back: () => void; canNext?: boolean; nextLabel?: string;
}) {
  return (
    <div>
      <div className="flex gap-1.5 mb-8">{[1, 2, 3, 4].map((i) => <div key={i} className={cx('h-1 flex-1 rounded-full', i <= n ? 'bg-terra' : 'bg-black/10')} />)}</div>
      <Eyebrow>Paso {n} de 4</Eyebrow>
      <h1 className="mt-2 mb-6 font-serif text-4xl leading-tight">{title}</h1>
      {children}
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={back}>Atrás</Button>
        <Button variant="dark" onClick={next} disabled={!canNext}>{nextLabel} <Icon name="arrow" className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
