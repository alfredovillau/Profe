import { useMemo, useState } from 'react';
import { CONCEPTS, levelRank } from '../lib/content';
import { AppState, Status, statusOf } from '../lib/engine';
import { Bar, Card, Chip, Eyebrow, Icon, StatusPill } from '../components/ui';

const FILTERS: (Status | 'Todas')[] = ['Todas', 'Nueva', 'Aprendiendo', 'Repasar', 'Dominada'];

export default function Vocab({ s }: { s: AppState }) {
  const [f, setF] = useState<Status | 'Todas'>('Todas');
  const [qry, setQry] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const r = levelRank(s.profile!.level);

  const words = useMemo(() => CONCEPTS
    .filter((c) => c.kind === 'word' && (levelRank(c.level) <= r + 1 || s.concepts[c.id]))
    .map((c) => ({ c, cs: s.concepts[c.id], st: statusOf(s.concepts[c.id]) }))
    .sort((a, b) => (b.cs?.last ?? 0) - (a.cs?.last ?? 0) || levelRank(a.c.level) - levelRank(b.c.level)), [s, r]);

  const counts = Object.fromEntries(FILTERS.map((k) => [k, k === 'Todas' ? words.length : words.filter((w) => w.st === k).length]));
  const list = words.filter((w) => (f === 'Todas' || w.st === f) &&
    (!qry || (w.c.term + ' ' + w.c.translation).toLowerCase().includes(qry.toLowerCase())));

  return (
    <div className="space-y-6">
      <header>
        <Eyebrow>Vocabulario</Eyebrow>
        <h1 className="mt-1 font-serif text-[34px] md:text-5xl leading-[1.05]">Tus palabras</h1>
      </header>

      <div className="relative">
        <Icon name="search" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input value={qry} onChange={(e) => setQry(e.target.value)} placeholder="Buscar palabra o traducción"
          className="w-full h-12 rounded-full bg-cream-3 border border-black/10 pl-11 pr-4 text-[16px] outline-none focus:border-ink/40" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((k) => <Chip key={k} active={f === k} onClick={() => setF(k)}>{k} <span className="opacity-50 ml-1">{counts[k]}</span></Chip>)}
      </div>

      <Card className="!p-0 overflow-hidden">
        <ul className="divide-y divide-black/5">
          {list.map(({ c, cs, st }) => (
            <li key={c.id}>
              <button onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-black/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-[16px]">{c.term}</span>
                    <span className="text-sm text-ink-soft">{c.translation}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 max-w-xs">
                    <Bar value={cs?.m ?? 0} />
                    <span className="text-[11px] tabular-nums text-ink-mute w-7">{cs?.m ?? 0}</span>
                  </div>
                </div>
                <StatusPill s={st} />
              </button>
              {open === c.id && (
                <div className="px-5 pb-5 -mt-1 text-sm space-y-1.5 text-ink-2">
                  <p>{c.definition}</p>
                  {c.sentences[0] && <p className="italic text-ink-soft">“{c.sentences[0].replace(/[[\]]/g, '')}”</p>}
                  <p className="text-xs text-ink-mute pt-1">
                    {c.category} · {c.level} · {cs ? `${cs.c} aciertos, ${cs.w} errores · próximo repaso: ${cs.due <= Date.now() ? 'ahora' : new Date(cs.due).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : 'Aún no estudiada'}
                  </p>
                </div>
              )}
            </li>
          ))}
          {!list.length && <li className="px-5 py-8 text-center text-sm text-ink-mute">Sin palabras en este filtro.</li>}
        </ul>
      </Card>
    </div>
  );
}
