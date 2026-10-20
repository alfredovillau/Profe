// Motor adaptativo: estado, repetición espaciada, generación y selección de preguntas.
import { CONCEPTS, Concept, Goal, Level, LEVELS, UNITS, Unit, conceptById, levelRank } from './content';

export function registerConcept(c: Concept) {
  if (conceptById[c.id]) return;
  CONCEPTS.push(c);
  conceptById[c.id] = c;
}

export const DAY = 86_400_000;

// ---------- Tipos de estado ----------
export interface ConceptState {
  m: number; // mastery 0–100
  c: number; // aciertos
  w: number; // errores
  a: number; // intentos
  last: number; // última vez visto
  due: number; // próxima revisión
  iv: number; // intervalo en días
  lv?: string; // última variante mostrada
  lw?: number; // último error
  src?: 'speaking'; // añadido desde Speaking (entra a repasos aunque no tenga intentos)
}

export interface Profile {
  name: string;
  goal: Goal;
  minutes: number;
  interests: string[];
  level: Level;
  createdAt: number;
}

export interface DayActivity { min: number; q: number; ok: number; sessions: number }

export interface HistoryEntry {
  kind: 'lesson' | 'quiz' | 'exam';
  title: string;
  at: number;
  score: number;
  total: number;
  minutes: number;
  wrong: string[]; // conceptIds fallados
}

export interface AppState {
  v: 1;
  profile: Profile | null;
  levelXp: number; // 0–100 hacia el siguiente nivel
  concepts: Record<string, ConceptState>;
  activity: Record<string, DayActivity>;
  bestStreak: number;
  history: HistoryEntry[];
  lastExamAt?: number;
  demo?: boolean;
  speaking?: import('./speaking').SpeakingSession[];
  custom?: Record<string, Concept>; // palabras nuevas detectadas en Speaking
}

export const emptyState = (): AppState => ({
  v: 1, profile: null, levelXp: 0, concepts: {}, activity: {}, bestStreak: 0, history: [],
});

// ---------- Utilidades ----------
export const dateKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' -]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Estados de dominio ----------
export type Status = 'Nueva' | 'Aprendiendo' | 'Repasar' | 'Dominada';
export function statusOf(cs?: ConceptState, now = Date.now()): Status {
  if (!cs || cs.a === 0) return 'Nueva';
  if (cs.m >= 85 && cs.iv >= 4) return 'Dominada';
  if (cs.m < 45) return 'Aprendiendo';
  return cs.due <= now || cs.m < 85 ? 'Repasar' : 'Dominada';
}

// Prioridad de repaso: errores recientes y baja maestría primero.
function priority(cs: ConceptState, now: number) {
  const recentWrong = cs.lw && now - cs.lw < 3 * DAY ? 40 : 0;
  const overdue = Math.max(0, (now - cs.due) / DAY) * 5;
  return 100 - cs.m + recentWrong + overdue + cs.w * 3;
}

// ---------- Preguntas ----------
export type QType = 'meaning' | 'word' | 'fill' | 'type' | 'typefill' | 'grammar';
export interface Question {
  conceptId: string;
  variant: string;
  type: QType;
  label: string; // tipo visible
  prompt: string;
  hint?: string;
  options?: string[];
  answer: string;
  explanation: string;
  example: string;
  difficulty: 1 | 2 | 3;
}

const clean = (s: string) => s.replace(/[[\]]/g, '');
const blankOf = (s: string) => {
  const m = s.match(/\[(.+?)\]/);
  return { text: s.replace(/\[.+?\]/, '___'), answer: m ? m[1] : '' };
};

function distractors(c: Concept, field: 'term' | 'translation', n = 3) {
  const others = CONCEPTS.filter((o) => o.kind === 'word' && o.id !== c.id);
  const sameUnit = shuffle(others.filter((o) => o.unit === c.unit));
  const sameLevel = shuffle(others.filter((o) => o.unit !== c.unit && o.level === c.level));
  const rest = shuffle(others);
  const out: string[] = [];
  for (const o of [...sameUnit, ...sameLevel, ...rest]) {
    const v = o[field];
    if (!out.includes(v) && v !== c[field]) out.push(v);
    if (out.length === n) break;
  }
  return out;
}

function wordVariants(c: Concept, cs?: ConceptState): string[] {
  const m = cs?.m ?? 0;
  const idx = c.sentences.map((s, i) => (s.includes('[') ? i : -1)).filter((i) => i >= 0);
  const fills = idx.map((i) => `fill:${i}`);
  const typed = idx.map((i) => `typefill:${i}`);
  if (!cs || cs.a === 0) return ['meaning', 'word'];
  if (m < 30) return ['meaning', 'word', ...fills];
  if (m < 65) return ['word', ...fills, 'type'];
  return [...typed, 'type', ...fills];
}

export function makeQuestion(c: Concept, cs?: ConceptState, avoid: string[] = []): Question {
  if (c.kind === 'grammar') {
    let idxs = c.items.map((_, i) => i).filter((i) => !avoid.includes(`item:${i}`) && `item:${i}` !== cs?.lv);
    if (!idxs.length) idxs = c.items.map((_, i) => i);
    const i = pick(idxs);
    const it = c.items[i];
    const correct = it.options[0];
    return {
      conceptId: c.id, variant: `item:${i}`, type: 'grammar',
      label: c.category === 'Situaciones' ? 'Situación' : `Gramática · ${c.term}`,
      prompt: it.q, options: shuffle(it.options), answer: correct,
      explanation: it.ex,
      example: it.q.includes('___') ? it.q.replace('___', correct) : correct,
      difficulty: (levelRank(c.level) >= 3 ? 3 : levelRank(c.level) >= 2 ? 2 : 1) as 1 | 2 | 3,
    };
  }

  let vars = wordVariants(c, cs).filter((v) => !avoid.includes(v) && v !== cs?.lv);
  if (!vars.length) vars = wordVariants(c, cs);
  const variant = pick(vars);
  const [kind, idxStr] = variant.split(':');
  const idx = Number(idxStr ?? 0);
  const exampleIdx = c.sentences.length > 1 ? (idx + 1) % c.sentences.length : 0;
  const base = {
    conceptId: c.id, variant,
    explanation: `“${c.term}” = ${c.translation}. ${c.definition}`,
    example: clean(c.sentences[kind === 'fill' || kind === 'typefill' ? exampleIdx : 0] ?? ''),
  };

  switch (kind) {
    case 'meaning':
      return { ...base, type: 'meaning', label: 'Vocabulario', difficulty: 1,
        prompt: `¿Qué significa “${c.term}”?`, answer: c.translation,
        options: shuffle([c.translation, ...distractors(c, 'translation')]) };
    case 'word':
      return { ...base, type: 'word', label: 'Traducción', difficulty: 1,
        prompt: `¿Cómo se dice “${c.translation}” en inglés?`, answer: c.term,
        options: shuffle([c.term, ...distractors(c, 'term')]) };
    case 'fill': {
      const { text, answer } = blankOf(c.sentences[idx]);
      const ans = answer.toLowerCase();
      return { ...base, type: 'fill', label: 'Completa la frase', difficulty: 2,
        prompt: text, answer: ans,
        options: shuffle([ans, ...distractors(c, 'term').map((d) => d.toLowerCase())]) };
    }
    case 'typefill': {
      const { text, answer } = blankOf(c.sentences[idx]);
      return { ...base, type: 'typefill', label: 'Escribe la palabra', difficulty: 3,
        prompt: text, hint: `Pista: ${c.translation}`, answer };
    }
    default:
      return { ...base, type: 'type', label: 'Traducción', difficulty: 3,
        prompt: `Escribe en inglés: “${c.translation}”`, hint: `${c.term.length} letras · empieza con “${c.term[0]}”`, answer: c.term };
  }
}

export const isCorrect = (q: Question, given: string) => normalize(given) === normalize(q.answer);

// ---------- Actualización tras responder ----------
export function applyAnswer(s: AppState, q: Question, ok: boolean, now = Date.now()): AppState {
  const prev = s.concepts[q.conceptId] ?? { m: 0, c: 0, w: 0, a: 0, last: 0, due: 0, iv: 0 };
  const cs: ConceptState = { ...prev, a: prev.a + 1, last: now, lv: q.variant };
  if (ok) {
    cs.c++;
    cs.m = Math.min(100, prev.m + 8 + q.difficulty * 5);
    cs.iv = prev.iv < 1 ? 1 : Math.min(60, Math.round(prev.iv * 2.3));
    cs.due = now + cs.iv * DAY;
  } else {
    cs.w++;
    cs.m = Math.max(0, prev.m - (prev.m > 70 ? 25 : 15));
    cs.iv = 0;
    cs.lw = now;
    cs.due = now + 10 * 60_000; // vuelve más tarde, no inmediatamente
  }

  // XP hacia el siguiente nivel
  let { levelXp } = s;
  let profile = s.profile;
  const c = conceptById[q.conceptId];
  if (ok && profile) {
    const atLevel = levelRank(c.level) >= levelRank(profile.level);
    levelXp += (atLevel ? 0.9 : 0.3) * q.difficulty;
    if (levelXp >= 100 && profile.level !== 'C1') {
      profile = { ...profile, level: LEVELS[levelRank(profile.level) + 1] };
      levelXp = 0;
    }
    levelXp = Math.min(100, levelXp);
  }

  const k = dateKey(now);
  const day = s.activity[k] ?? { min: 0, q: 0, ok: 0, sessions: 0 };
  return {
    ...s, profile, levelXp,
    concepts: { ...s.concepts, [q.conceptId]: cs },
    activity: { ...s.activity, [k]: { ...day, q: day.q + 1, ok: day.ok + (ok ? 1 : 0) } },
  };
}

export function finishSession(s: AppState, e: HistoryEntry): AppState {
  const k = dateKey(e.at);
  const day = s.activity[k] ?? { min: 0, q: 0, ok: 0, sessions: 0 };
  const next: AppState = {
    ...s,
    history: [e, ...s.history].slice(0, 200),
    activity: { ...s.activity, [k]: { ...day, min: day.min + e.minutes, sessions: day.sessions + 1 } },
    lastExamAt: e.kind === 'exam' ? e.at : s.lastExamAt,
  };
  if (e.kind === 'exam' && next.profile) next.levelXp = Math.min(99, next.levelXp + Math.round((e.score / e.total) * 8));
  next.bestStreak = Math.max(next.bestStreak, streakOf(next));
  return next;
}

// ---------- Racha ----------
export function streakOf(s: AppState, now = Date.now()) {
  const active = (t: number) => (s.activity[dateKey(t)]?.q ?? 0) > 0;
  let t = active(now) ? now : now - DAY;
  let n = 0;
  while (active(t)) { n++; t -= DAY; }
  return n;
}

// ---------- Selección de contenido ----------
const eligible = (p: Profile) => CONCEPTS.filter((c) => levelRank(c.level) <= levelRank(p.level) + 0);

export function todayUnit(s: AppState): Unit {
  const p = s.profile!;
  const r = levelRank(p.level);
  const units = UNITS.filter((u) => levelRank(u.level) <= r)
    .sort((a, b) =>
      Number(b.goal === p.goal) - Number(a.goal === p.goal) || levelRank(b.level) - levelRank(a.level));
  const progressOf = (u: Unit) => {
    const cs = CONCEPTS.filter((c) => c.unit === u.id);
    return cs.reduce((acc, c) => acc + (s.concepts[c.id]?.m ?? 0), 0) / cs.length;
  };
  return units.find((u) => progressOf(u) < 70) ?? units.sort((a, b) => progressOf(a) - progressOf(b))[0] ?? UNITS[0];
}

export function unitProgress(s: AppState, u: Unit) {
  const cs = CONCEPTS.filter((c) => c.unit === u.id);
  return Math.round(cs.reduce((acc, c) => acc + Math.min(100, (s.concepts[c.id]?.m ?? 0) / 0.7), 0) / cs.length);
}

const inPlay = (cs: ConceptState) => cs.a > 0 || !!cs.src;

function dueReviews(s: AppState, now: number, exclude: Set<string>) {
  return Object.entries(s.concepts)
    .filter(([id, cs]) => !exclude.has(id) && inPlay(cs) && conceptById[id] && (cs.due <= now || cs.m < 60))
    .sort((a, b) => priority(b[1], now) - priority(a[1], now))
    .map(([id]) => id);
}

function interleave(a: string[], b: string[]) {
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (b[i]) out.push(b[i]);
    if (a[i]) out.push(a[i]);
  }
  return out;
}

const toQuestions = (s: AppState, ids: string[]) => {
  const used: Record<string, string[]> = {};
  return ids.map((id) => {
    const q = makeQuestion(conceptById[id], s.concepts[id], used[id] ?? []);
    (used[id] ??= []).push(q.variant);
    return q;
  });
};

export const lessonSize = (p: Profile) => Math.max(6, Math.min(20, Math.round(p.minutes * 1.1)));

export function buildLesson(s: AppState, unit = todayUnit(s), now = Date.now()): Question[] {
  const n = lessonSize(s.profile!);
  const unitIds = CONCEPTS.filter((c) => c.unit === unit.id)
    .sort((a, b) => (s.concepts[a.id]?.m ?? 0) - (s.concepts[b.id]?.m ?? 0))
    .map((c) => c.id);
  const reviews = dueReviews(s, now, new Set(unitIds)).slice(0, Math.ceil(n * 0.4));
  let fresh = unitIds.slice(0, n - reviews.length);
  // si la unidad tiene pocas, repetir los más débiles con otra variante
  while (fresh.length + reviews.length < n && unitIds.length) fresh = [...fresh, unitIds[fresh.length % unitIds.length]];
  return toQuestions(s, interleave(shuffle(reviews), fresh).slice(0, n));
}

export function buildQuiz(s: AppState, n = 8, now = Date.now()): Question[] {
  const seen = Object.entries(s.concepts).filter(([id, cs]) => inPlay(cs) && conceptById[id]);
  const weighted = seen
    .map(([id, cs]) => ({ id, p: priority(cs, now) + Math.random() * 30 }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.id);
  let ids = weighted.slice(0, n);
  if (ids.length < n) {
    const extra = CONCEPTS.filter((c) => c.unit === todayUnit(s).id && !ids.includes(c.id)).map((c) => c.id);
    ids = [...ids, ...extra].slice(0, n);
  }
  return toQuestions(s, shuffle(ids));
}

export function buildExam(s: AppState, now = Date.now()): Question[] {
  const N = 20;
  const week = Object.entries(s.concepts)
    .filter(([id, cs]) => conceptById[id] && inPlay(cs) && now - cs.last < 7 * DAY)
    .map(([id]) => id);
  const seen = Object.entries(s.concepts)
    .filter(([id, cs]) => conceptById[id] && cs.a > 0 && !week.includes(id))
    .sort((a, b) => priority(b[1], now) - priority(a[1], now))
    .map(([id]) => id);
  const level = eligible(s.profile!).map((c) => c.id).filter((id) => !week.includes(id) && !seen.includes(id));
  let ids = shuffle(week).slice(0, N);
  if (ids.length < N) ids = [...ids, ...seen.slice(0, N - ids.length)];
  if (ids.length < N) ids = [...ids, ...shuffle(level).slice(0, N - ids.length)];
  return toQuestions(s, shuffle(ids));
}

// Test de nivel: 2 preguntas por nivel, de menor a mayor dificultad.
export function buildPlacement(): Question[] {
  return LEVELS.flatMap((l) => {
    const g = shuffle(CONCEPTS.filter((c) => c.level === l && c.kind === 'grammar' && c.category === 'Gramática'))[0];
    const w = shuffle(CONCEPTS.filter((c) => c.level === l && c.kind === 'word'))[0];
    const wq = makeQuestion(w, { m: 40, c: 1, w: 0, a: 1, last: 0, due: 0, iv: 1 }, ['type', 'word', ...w.sentences.map((_, i) => `typefill:${i}`)]);
    return [makeQuestion(g), wq];
  });
}

export function placementLevel(correct: number): Level {
  return correct <= 2 ? 'A1' : correct <= 4 ? 'A2' : correct <= 6 ? 'B1' : correct <= 8 ? 'B2' : 'C1';
}

// ---------- Estadísticas ----------
export function categoryStats(s: AppState) {
  const map: Record<string, { c: number; w: number; m: number; n: number }> = {};
  for (const [id, cs] of Object.entries(s.concepts)) {
    const c = conceptById[id];
    if (!c || !cs.a) continue;
    const key = c.kind === 'grammar' && c.category === 'Gramática' ? `Gramática: ${c.translation}` : c.category;
    const e = (map[key] ??= { c: 0, w: 0, m: 0, n: 0 });
    e.c += cs.c; e.w += cs.w; e.m += cs.m; e.n++;
  }
  return Object.entries(map)
    .map(([name, e]) => ({ name, acc: Math.round((e.c / Math.max(1, e.c + e.w)) * 100), mastery: Math.round(e.m / e.n), n: e.n }))
    .sort((a, b) => b.mastery - a.mastery);
}

export function weakConcepts(s: AppState, n = 5) {
  return Object.entries(s.concepts)
    .filter(([id, cs]) => conceptById[id] && cs.w > 0)
    .sort((a, b) => priority(b[1], Date.now()) - priority(a[1], Date.now()))
    .slice(0, n)
    .map(([id, cs]) => ({ c: conceptById[id], cs }));
}

export function last7(s: AppState, now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * DAY;
    const a = s.activity[dateKey(t)];
    return { t, min: a?.min ?? 0, q: a?.q ?? 0, ok: a?.ok ?? 0 };
  });
}

export function nextExamAt(s: AppState) {
  const base = s.lastExamAt ?? s.profile?.createdAt ?? Date.now();
  return base + 7 * DAY;
}

export function totals(s: AppState) {
  const words = Object.entries(s.concepts).filter(([id, cs]) => conceptById[id]?.kind === 'word' && cs.m >= 45).length;
  const minutes = Object.values(s.activity).reduce((a, d) => a + d.min, 0);
  const count = (k: HistoryEntry['kind']) => s.history.filter((h) => h.kind === k).length;
  return { words, minutes, lessons: count('lesson'), quizzes: count('quiz'), exams: count('exam') };
}

// ---------- Datos demo (Juan, B1, 62 %, racha 34) ----------
export function demoState(now = Date.now()): AppState {
  const s = emptyState();
  s.demo = true;
  s.profile = { name: 'Juan', goal: 'trabajo', minutes: 12, interests: ['Tecnología', 'Viajes'], level: 'B1', createdAt: now - 60 * DAY };
  s.levelXp = 62;
  s.bestStreak = 41;
  for (let i = 1; i <= 34; i++) {
    const q = 10 + ((i * 7) % 9);
    s.activity[dateKey(now - i * DAY)] = { min: 8 + ((i * 5) % 11), q, ok: Math.round(q * 0.78), sessions: 1 };
  }
  const set = (id: string, m: number, extra: Partial<ConceptState> = {}) => {
    const a = 3 + Math.round(m / 20);
    const w = m < 50 ? 2 : m < 80 ? 1 : 0;
    s.concepts[id] = { m, a, c: a - w, w, last: now - 2 * DAY, due: now + (m > 80 ? 6 : -1) * DAY, iv: m > 80 ? 8 : 1, ...extra };
  };
  CONCEPTS.filter((c) => ['A1', 'A2'].includes(c.level)).forEach((c, i) => set(c.id, 80 + (i % 4) * 5));
  ['w_agenda', 'w_attend', 'w_book', 'w_available', 'w_actually', 'w_hang_out'].forEach((id) => set(id, 72));
  set('w_deadline', 22, { lw: now - DAY, due: now - 3600_000, w: 3 });
  set('w_follow_up', 48);
  set('w_attach', 70);
  set('w_draft', 35, { lw: now - 2 * DAY });
  set('g_presperf', 55);
  set('w_postpone', 40, { lw: now - 3 * DAY });
  s.lastExamAt = now - 5 * DAY;
  s.history = [
    { kind: 'exam', title: 'Examen semanal', at: now - 5 * DAY, score: 16, total: 20, minutes: 14, wrong: ['w_deadline', 'w_draft', 'w_postpone', 'w_follow_up'] },
    { kind: 'quiz', title: 'Quiz de repaso', at: now - 2 * DAY, score: 6, total: 8, minutes: 5, wrong: ['w_deadline', 'w_draft'] },
    { kind: 'lesson', title: 'Reuniones de trabajo', at: now - DAY, score: 11, total: 13, minutes: 12, wrong: ['w_postpone'] },
  ];
  for (let i = 0; i < 38; i++) s.history.push({ kind: 'lesson', title: 'Lección', at: now - (i + 2) * DAY, score: 10, total: 12, minutes: 10, wrong: [] });
  return s;
}

// ---------- Persistencia ----------
const KEY = 'profe:v1';
export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s: AppState = { ...emptyState(), ...JSON.parse(raw) };
      Object.values(s.custom ?? {}).forEach(registerConcept);
      return s;
    }
  } catch { /* sin almacenamiento */ }
  return emptyState();
}
export function save(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignorar */ }
}
