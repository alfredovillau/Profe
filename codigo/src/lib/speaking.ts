// Speaking: voz (Web Speech API), tutor (demo local o Claude API), correcciones,
// evaluación final y conexión con el motor adaptativo.
import { CONCEPTS, Concept, Goal, Level, conceptById, levelRank } from './content';
import { AppState, ConceptState, DAY, dateKey, registerConcept, streakOf, totals, weakConcepts } from './engine';

// ---------- Tipos ----------
export type TopicId = 'free' | 'work' | 'travel' | 'daily' | 'interviews' | 'school' | 'custom';
export const TOPICS: { id: TopicId; label: string; es: string }[] = [
  { id: 'free', label: 'Free conversation', es: 'Conversación libre' },
  { id: 'work', label: 'Work', es: 'Trabajo' },
  { id: 'travel', label: 'Travel', es: 'Viajes' },
  { id: 'daily', label: 'Daily life', es: 'Vida diaria' },
  { id: 'interviews', label: 'Interviews', es: 'Entrevistas' },
  { id: 'school', label: 'School', es: 'Escuela' },
  { id: 'custom', label: 'Custom topic', es: 'Tema propio' },
];
const TOPIC_GOAL: Record<TopicId, Goal | null> = {
  free: 'conversación', work: 'trabajo', travel: 'viajes', daily: 'general', interviews: 'trabajo', school: 'escuela', custom: null,
};

export interface Correction { said: string; better: string; concept?: string | null; note?: string }
export interface NewWord { term: string; translation: string; definition?: string; example?: string }
export interface Turn { role: 'tutor' | 'user'; text: string; corrections?: Correction[]; conf?: number; typed?: boolean }

export interface Review {
  scores: { fluency: number; vocabulary: number; grammar: number; pronunciation: number | null };
  userTurns: number;
  words: number;
  newWords: string[];
  usedStudied: string[];
  recommended: { id: string; term: string; translation: string }[];
  errors: Correction[];
  weakTopics: string[];
  strengths: string[];
  improve: string[];
  recs: string[];
  conceptsAdded: number;
}

export interface SpeakingSession {
  id: string;
  at: number;
  seconds: number;
  topic: TopicId;
  topicLabel: string;
  level: Level;
  tutor: 'demo' | 'claude';
  turns: Turn[];
  review: Review;
}

export interface TutorSettings { provider: 'demo' | 'claude'; apiKey: string; model: string; autoSend: boolean }
const TKEY = 'profe:tutor';
export function loadTutor(): TutorSettings {
  const d: TutorSettings = { provider: 'demo', apiKey: '', model: 'claude-haiku-5-5', autoSend: true };
  try { return { ...d, ...JSON.parse(localStorage.getItem(TKEY) || '{}') }; } catch { return d; }
}
export function saveTutor(t: TutorSettings) { try { localStorage.setItem(TKEY, JSON.stringify(t)); } catch { /* */ } }

// ---------- Voz ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const sttSupported = () => !!SR;
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function listen(h: {
  onInterim: (t: string) => void; onFinal: (t: string, conf: number) => void; onEnd: () => void; onError: (e: string) => void;
}) {
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let done = false;
  r.onresult = (e: any) => {
    let text = '';
    let final = false;
    let conf = 0;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) { final = true; conf = e.results[i][0].confidence || 0; }
    }
    if (final && !done) { done = true; h.onFinal(text.trim(), conf); } else h.onInterim(text);
  };
  r.onerror = (e: any) => h.onError(e.error || 'error');
  r.onend = () => h.onEnd();
  try { r.start(); } catch (e) { h.onError(String(e)); }
  return () => { try { r.stop(); } catch { /* */ } };
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  const pref = /natural|neural|premium|enhanced|samantha|aria|jenny|ava|google us/i;
  voice = vs.find((v) => v.lang === 'en-US' && pref.test(v.name)) || vs.find((v) => v.lang === 'en-US') || vs[0] || null;
}
if (ttsSupported()) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

/** Desbloquea el audio en iOS: llamar dentro de un toque del usuario. */
export function unlockAudio() {
  if (!ttsSupported()) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

export function speak(text: string, level: Level): Promise<void> {
  return new Promise((res) => {
    if (!ttsSupported()) return res();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = 'en-US';
    u.rate = [0.85, 0.9, 0.95, 1, 1.03][levelRank(level)];
    u.onend = () => res();
    u.onerror = () => res();
    speechSynthesis.speak(u);
    // Respaldo por si el navegador no dispara onend
    setTimeout(res, 1500 + text.length * 90);
  });
}
export const stopSpeaking = () => { if (ttsSupported()) speechSynthesis.cancel(); };

// ---------- Detección local de errores frecuentes ----------
const IRREG: Record<string, string> = {
  go: 'went', eat: 'ate', have: 'had', see: 'saw', buy: 'bought', do: 'did', make: 'made', take: 'took',
  get: 'got', come: 'came', meet: 'met', drink: 'drank', play: 'played', watch: 'watched', visit: 'visited',
  study: 'studied', work: 'worked', is: 'was', are: 'were',
};
const BASE: Record<string, string> = {
  went: 'go', ate: 'eat', saw: 'see', had: 'have', bought: 'buy', made: 'make', took: 'take', got: 'get', came: 'come',
  liked: 'like', wanted: 'want', played: 'play', watched: 'watch', worked: 'work', visited: 'visit', studied: 'study',
  arrived: 'arrive', decided: 'decide', used: 'use', tried: 'try', stayed: 'stay', loved: 'love',
};
const COMP: Record<string, string> = {
  big: 'bigger', small: 'smaller', cheap: 'cheaper', fast: 'faster', good: 'better', bad: 'worse', tall: 'taller',
  old: 'older', young: 'younger', easy: 'easier', hard: 'harder', nice: 'nicer', long: 'longer', short: 'shorter',
};
const third = (v: string) => ({ have: 'has', do: 'does', go: 'goes' } as Record<string, string>)[v] ??
  (/(ch|sh|s|x|o)$/.test(v) ? v + 'es' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v + 's');
const keepCase = (orig: string, rep: string) => (orig[0] === orig[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);

type Rule = { re: RegExp; fix: (...m: string[]) => string; concept: string | null; note: string; when?: RegExp; noAux?: boolean };
// Sin lookbehind (no funciona en Safari antiguo): se revisa la palabra anterior a mano.
const AUX = /\b(did|does|do|didn't|doesn't|will|can|could|should|would|might|must|to|let)\s+$/i;
const RULES: Rule[] = [
  { re: /\b(went|go|goes|going|came|come|get|got)\s+in\s+(a|an|the)\s+(restaurant|store|shop|park|school|office|beach|party|mall|cinema|movies|gym|church|hospital|museum|concert|bar)\b/i,
    fix: (_, v, d, n) => `${v} to ${d} ${n}`, concept: 'g_prep', note: 'Movimiento hacia un lugar: go/went to.' },
  { re: /\bin\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i, fix: (m) => m.replace(/^in/i, (x) => keepCase(x, 'on')), concept: 'g_prep', note: 'Con días usamos “on”.' },
  { re: /\bdepends?\s+of\b/i, fix: (m) => m.replace(/of$/i, 'on'), concept: 'g_prep', note: 'Se dice “depend on”.' },
  { re: /\bexplain\s+me\b/i, fix: (m) => m.replace(/me$/i, 'to me'), concept: 'g_prep', note: '“Explain” necesita “to”: explain to me.' },
  { re: /\bi\s+am\s+agree\b/i, fix: (m) => keepCase(m, 'I agree'), concept: 'g_be', note: '“Agree” es verbo: I agree.' },
  { re: /\bi\s+(is|are)\b/i, fix: (m) => keepCase(m, 'I am'), concept: 'g_be', note: 'Con “I” usamos “am”.' },
  { re: /\b(he|she|it)\s+(are|am)\b/i, fix: (_, p) => `${p} is`, concept: 'g_be', note: 'He/she/it van con “is”.' },
  { re: /\b(they|we|you|people)\s+is\b/i, fix: (_, p) => `${p} are`, concept: 'g_be', note: 'Plural: “are”.' },
  { re: /\bi\s+have\s+(\d+)\s+years(\s+old)?\b/i, fix: (_, n) => `I am ${n} years old`, concept: 'g_be', note: 'La edad va con “be”.' },
  { re: /\b(he|she|it|my (?:mom|dad|brother|sister|friend|boss|teacher|wife|husband|son|daughter))\s+don't\b/i,
    fix: (_, p) => `${p} doesn't`, concept: 'g_present', note: 'Tercera persona: doesn’t.' },
  { noAux: true, re: new RegExp('\\b(he|she|my (?:mom|dad|brother|sister|friend|boss|teacher|wife|husband))\\s+(go|have|do|like|want|work|live|play|watch|study|need|eat|drink|make|get|know|think|love)\\b', 'i'),
    fix: (_, p, v) => `${p} ${third(v.toLowerCase())}`, concept: 'g_present', note: 'He/she + verbo con -s.' },
  { noAux: true, re: new RegExp('\\b(i|we|they|he|she|you)\\s+(go|eat|have|see|buy|do|make|take|get|come|meet|drink|play|watch|visit|study|work)\\b', 'i'),
    when: /\b(yesterday|last\s+(?:night|week|weekend|month|year|summer|friday|saturday|sunday)|ago)\b/i,
    fix: (_, p, v) => `${p} ${IRREG[v.toLowerCase()]}`, concept: 'g_past', note: 'Pasado simple con “yesterday / last …”.' },
  { re: /\bdid(n't|\s+not)?\s+(went|ate|saw|had|bought|made|took|got|came|liked|wanted|played|watched|worked|visited|studied|arrived|decided|used|tried|stayed|loved)\b/i,
    fix: (m, neg, v) => `did${neg ?? ''} ${BASE[v.toLowerCase()]}`, concept: 'g_past', note: 'Después de “did” va el verbo base.' },
  { re: /\bmore\s+(big|small|cheap|fast|good|bad|tall|old|young|easy|hard|nice|long|short)\b/i,
    fix: (_, a) => COMP[a.toLowerCase()], concept: 'g_compar', note: 'Adjetivos cortos: -er (bigger), no “more big”.' },
  { re: /\bpeoples\b/i, fix: () => 'people', concept: null, note: '“People” ya es plural.' },
  { re: /\b(a|an)\s+(advice|information|homework|news)\b/i, fix: (_, __, n) => `some ${n}`, concept: null, note: 'Sustantivo incontable: sin “a”.' },
];

export function detectErrors(text: string): Correction[] {
  const out: Correction[] = [];
  for (const r of RULES) {
    if (r.when && !r.when.test(text)) continue;
    const m = text.match(r.re);
    if (!m) continue;
    if (r.noAux && AUX.test(text.slice(0, m.index))) continue;
    const better = text.replace(r.re, (...args) => r.fix(...(args.slice(0, -2) as string[]).map((x) => x ?? '')));
    if (better.trim().toLowerCase() === text.trim().toLowerCase()) continue;
    out.push({ said: text.trim(), better: better.trim(), concept: r.concept, note: r.note });
  }
  return out;
}

// ---------- Contexto del alumno (para personalizar) ----------
export function learnerContext(s: AppState) {
  const p = s.profile!;
  const known = Object.entries(s.concepts)
    .filter(([id, cs]) => conceptById[id]?.kind === 'word' && cs.m >= 60).map(([id]) => conceptById[id].term).slice(0, 25);
  const weak = weakConcepts(s, 6).map(({ c }) => c);
  const weakWords = weak.filter((c) => c.kind === 'word');
  const weakTopics = weak.filter((c) => c.kind === 'grammar').map((c) => c.term);
  const prev = (s.speaking ?? []).slice(0, 3).flatMap((x) => x.review.errors.map((e) => e.better)).slice(0, 4);
  return { level: p.level, goal: p.goal, name: p.name, interests: p.interests, known, weakWords, weakTopics, prev, learned: totals(s).words };
}
export type LearnerContext = ReturnType<typeof learnerContext>;

// ---------- Tutores ----------
export interface TutorReply { reply: string; corrections: Correction[]; newWords: NewWord[] }
export interface TutorCtx { topic: TopicId; customTopic: string; level: Level; learner: LearnerContext; turns: Turn[] }

const basic = (l: Level) => levelRank(l) <= 1;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// Preguntas por tema: [básica, intermedia]
const QS: Record<Exclude<TopicId, 'custom'>, [string, string][]> = {
  free: [
    ['What do you like to do on weekends?', 'What did you do this weekend?'],
    ['What is your favorite food?', 'What’s a dish you could eat every week?'],
    ['Do you like music? What kind?', 'What have you been listening to lately?'],
    ['Do you have a pet?', 'If you could have any pet, what would it be and why?'],
    ['What do you do in the evening?', 'What does a good evening look like for you?'],
    ['Do you like movies or series?', 'Have you watched anything good recently?'],
  ],
  work: [
    ['What is your job?', 'What do you do for work, and what does a normal day look like?'],
    ['Do you like your job?', 'What’s the most interesting part of your work?'],
    ['How do you go to work?', 'How do you usually organize your week at work?'],
    ['Do you write emails in English?', 'How do you handle deadlines when you have a lot of work?'],
    ['Do you work with a team?', 'Tell me about a project you’re proud of.'],
    ['What time do you start work?', 'What would you change about your workplace if you could?'],
  ],
  travel: [
    ['Do you like to travel?', 'What’s the best trip you’ve ever taken?'],
    ['Where do you want to go?', 'If you could fly anywhere tomorrow, where would you go?'],
    ['Do you like the beach or the mountains?', 'Do you prefer planning every detail or being spontaneous when you travel?'],
    ['What do you pack in your bag?', 'Have you ever had a problem at an airport?'],
    ['Do you like hotels?', 'What do you look for when you book a hotel?'],
    ['What food do you eat when you travel?', 'What’s a place in your country that tourists should visit?'],
  ],
  daily: [
    ['What time do you wake up?', 'Walk me through your typical morning.'],
    ['What do you eat for breakfast?', 'Do you cook at home, or do you eat out more often?'],
    ['Do you like sports?', 'How do you stay active during the week?'],
    ['Where do you live?', 'What do you like most about the area where you live?'],
    ['Who do you live with?', 'How do you usually relax after a busy day?'],
    ['What do you do on Sundays?', 'What’s a small habit that makes your day better?'],
  ],
  interviews: [
    ['Tell me about yourself.', 'So, to start, could you tell me a little about yourself?'],
    ['What are you good at?', 'What would you say is your greatest strength?'],
    ['Why do you want this job?', 'Why are you interested in this position?'],
    ['Do you like to work in a team?', 'Tell me about a time you had to solve a problem at work or school.'],
    ['What do you want to learn?', 'Where do you see yourself in five years?'],
    ['Do you have questions for me?', 'How do you handle pressure or tight deadlines?'],
  ],
  school: [
    ['What do you study?', 'What are you studying right now, and why did you choose it?'],
    ['What is your favorite class?', 'Which subject do you find the most challenging?'],
    ['Do you like your teachers?', 'How do you usually prepare for an exam?'],
    ['Do you do homework every day?', 'Do you prefer studying alone or in a group?'],
    ['What do you do after class?', 'What’s something you learned recently that surprised you?'],
    ['Do you like your school?', 'What would you change about the way your school teaches?'],
  ],
};
const customQs = (t: string): [string, string][] => [
  [`Do you like ${t}?`, `What got you interested in ${t}?`],
  [`What do you know about ${t}?`, `What do most people get wrong about ${t}?`],
  [`Do your friends like ${t}?`, `Do the people around you share your interest in ${t}?`],
  [`When did you start with ${t}?`, `Can you remember your first experience with ${t}?`],
  [`What is good about ${t}?`, `How has ${t} changed in recent years?`],
  [`Do you want to learn more about ${t}?`, `What would you like to learn next about ${t}?`],
];

const STOP = new Set('lot little bit few very good bad nice new old big small great day time thing things way really more most kind same other next last first week weekend place good one'.split(' '));
function nounOf(text: string) {
  const ms = [...text.toLowerCase().matchAll(/\b(?:a|an|the|my|our|some|his|her)\s+([a-z]+)(?:\s+([a-z]+))?/g)];
  for (const m of ms.reverse()) {
    const w = STOP.has(m[1]) && m[2] && !STOP.has(m[2]) ? m[2] : m[1];
    if (!STOP.has(w) && w.length > 2) return w;
  }
  return null;
}
const isPast = (t: string) => /\b(was|were|went|did|had|saw|ate|got|made|took|came|bought|met|\w{3,}ed|yesterday|last)\b/i.test(t);

function react(text: string, lv: Level) {
  const t = text.toLowerCase();
  if (/\?\s*$/.test(t)) return pick(['Good question! As your tutor I’m more curious about you, though.', 'Ha, good question. Let’s keep the focus on you.']);
  if (/\b(friends?|party|fun|restaurant|beach|movie|concert|game|trip|vacation)\b/.test(t)) return pick(['That sounds fun!', 'Oh, nice!', 'That sounds like a great time.']);
  if (/\b(tired|busy|stress|stressed|hard|difficult|problem|sick|boring)\b/.test(t)) return pick(['That sounds like a lot.', 'Oh, I’m sorry to hear that.', 'That sounds tough.']);
  if (/\b(love|like|enjoy|favorite|favourite|amazing|great|happy)\b/.test(t)) return pick(['I can tell you enjoy that.', 'Nice, that’s great.', 'Love that.']);
  if (/^\s*(no|not really|nope)\b/.test(t)) return pick(['Fair enough.', 'Okay, no problem.']);
  return basic(lv) ? pick(['Okay!', 'I see.', 'Nice.']) : pick(['Interesting.', 'Got it.', 'I see what you mean.', 'Oh, okay.']);
}

function followUp(text: string, lv: Level): string | null {
  const n = nounOf(text);
  const past = isPast(text);
  const b = basic(lv);
  const opts: string[] = [];
  if (n) {
    if (past) opts.push(b ? `Was the ${n} good?` : `What was the ${n} like?`, b ? `Who was with you?` : `What kind of ${n} was it?`);
    else if (/\bmy\s/.test(text.toLowerCase())) opts.push(b ? `Why do you like your ${n}?` : `What do you like most about your ${n}?`);
    else opts.push(b ? `Tell me more about the ${n}.` : `Tell me a bit more about the ${n}.`);
  }
  if (past) opts.push(b ? 'What did you do after that?' : 'What happened next?', b ? 'Did you like it?' : 'How did that make you feel?');
  else opts.push(b ? 'Why?' : 'Why is that?', b ? 'How often?' : 'How often do you do that?');
  return opts.length ? pick(opts) : null;
}

/** Tutor local: no usa IA. Reacciona, pregunta seguimiento, recuerda lo dicho y cambia de tema. */
export const demoTutor = {
  async reply(ctx: TutorCtx): Promise<TutorReply> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    const { level, topic, turns, learner } = ctx;
    const b = basic(level) ? 0 : 1;
    const bank = topic === 'custom' ? customQs(ctx.customTopic || 'this topic') : QS[topic];
    const tutorQs = turns.filter((t) => t.role === 'tutor').map((t) => t.text);
    const unused = bank.filter((q) => !tutorQs.some((t) => t.includes(q[b])));
    const user = [...turns].reverse().find((t) => t.role === 'user');

    if (!user) {
      const hi = basic(level) ? `Hi ${learner.name}! Let’s talk.` : `Hi ${learner.name}! Great to see you. Let’s chat for a bit.`;
      return { reply: `${hi} ${bank[0][b]}`, corrections: [], newWords: [] };
    }

    const corrections = detectErrors(user.text).slice(0, 1); // una a la vez, sin interrumpir
    const words = user.text.trim().split(/\s+/).length;
    // Cuántas preguntas de seguimiento llevamos desde la última del banco
    let depth = 0;
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.role !== 'tutor') continue;
      if (bank.some((q) => t.text.includes(q[b]))) break;
      depth++;
    }
    let reply = '';
    if (words < 3 && depth === 0) {
      reply = `${react(user.text, level)} ${basic(level) ? 'Can you say more?' : 'Can you tell me a little more?'}`;
    } else if (depth < 2 && words >= 3) {
      reply = `${react(user.text, level)} ${followUp(user.text, level)}`;
    } else {
      // Cambia de tema con naturalidad; recuerda algo dicho antes o practica una palabra débil
      const userTurns = turns.filter((t) => t.role === 'user');
      const earlier = userTurns.length > 3 ? nounOf(userTurns[0].text) : null;
      const weak = learner.weakWords[0];
      const usedWeak = turns.some((t) => t.text.includes('Here’s a word to try'));
      if (weak && !usedWeak && userTurns.length >= 3) {
        reply = `${react(user.text, level)} Here’s a word to try: “${weak.term}”. It means “${weak.translation}”. Can you use it in a sentence?`;
      } else {
        const next = unused[0] ?? pick(bank);
        const bridge = earlier && Math.random() < 0.5 ? `Earlier you mentioned your ${earlier}. ` : pick(['By the way, ', 'Let me ask you something else. ', 'Okay, new question. ']);
        reply = `${react(user.text, level)} ${bridge}${next[b]}`;
      }
    }
    return { reply, corrections, newWords: [] };
  },
};

const GRAMMAR_TAGS = CONCEPTS.filter((c) => c.kind === 'grammar' && c.category === 'Gramática').map((c) => `${c.id} (${c.term})`).join(', ');

function systemPrompt(ctx: TutorCtx) {
  const L = ctx.learner;
  const topic = ctx.topic === 'custom' ? ctx.customTopic : TOPICS.find((t) => t.id === ctx.topic)!.label;
  return `You are Profe, a warm English conversation tutor on a live voice call with ${L.name}, a Spanish speaker from Mexico.
Student level: ${ctx.level} (CEFR). Learning goal: ${L.goal}. Interests: ${L.interests.join(', ') || 'not specified'}.
Conversation topic: ${topic}.
Words the student already knows: ${L.known.join(', ') || 'few yet'}.
Words to practice (weave in naturally, at most one per reply): ${L.weakWords.map((w) => w.term).join(', ') || 'none'}.
Weak grammar topics: ${L.weakTopics.join(', ') || 'none'}.

How to talk:
- Speak English. Use Spanish only if the student is completely lost.
- Have a real conversation: react to what they said, ask natural follow-up questions, remember earlier details, and change topic smoothly. Don't fire question after question.
- Keep replies short for speech: 1-3 sentences. For A1-A2 use very simple words and short sentences; for C1 speak naturally.
- Never correct inside your reply. No lists, markdown or emojis — your words are read aloud.

Respond with ONLY a JSON object:
{"reply": string,
 "corrections": [{"said": exact words from the student's LAST message, "better": corrected version, "concept": one of [${GRAMMAR_TAGS}] or null, "note": very short explanation in Spanish}],
 "new_words": [{"term": string, "translation": Spanish, "definition": simple English, "example": sentence containing the term}]}
"corrections": at most 1, only for an important error in the student's last message; otherwise [].
"new_words": 0-2 useful words you used in your reply that may be new at this level.`;
}

export const claudeTutor = (key: string, model: string) => ({
  async reply(ctx: TutorCtx): Promise<TutorReply> {
    const msgs: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: '(The call just started. Greet me warmly and open the conversation about the topic.)' },
    ];
    ctx.turns.forEach((t, i) => {
      if (t.role === 'tutor' && i === 0) msgs.push({ role: 'assistant', content: t.text });
      else msgs.push({ role: t.role === 'tutor' ? 'assistant' : 'user', content: t.text });
    });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 500, system: systemPrompt(ctx), messages: msgs }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(res.status === 401 ? 'API key inválida.' : `Error ${res.status}: ${body.slice(0, 120)}`);
    }
    const data = await res.json();
    const text: string = (data.content ?? []).map((c: any) => c.text ?? '').join('');
    try {
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      return {
        reply: String(j.reply || '').trim() || text,
        corrections: (j.corrections ?? []).filter((c: Correction) => c.said && c.better).slice(0, 1)
          .map((c: Correction) => ({ ...c, concept: c.concept && conceptById[c.concept] ? c.concept : null })),
        newWords: (j.new_words ?? []).filter((w: NewWord) => w.term && w.translation).slice(0, 2),
      };
    } catch {
      return { reply: text.trim(), corrections: [], newWords: [] };
    }
  },
});

// ---------- Evaluación final ----------
const clamp = (n: number, a = 30, b = 98) => Math.round(Math.max(a, Math.min(b, n)));
const wordsOf = (t: string) => t.toLowerCase().match(/[a-z']+/g) ?? [];

export function buildReview(s: AppState, turns: Turn[], topic: TopicId, level: Level, newWords: NewWord[]): Review {
  const user = turns.filter((t) => t.role === 'user');
  const all = user.flatMap((t) => wordsOf(t.text));
  const unique = new Set(all);
  const userText = ' ' + user.map((t) => t.text.toLowerCase()).join(' ') + ' ';
  const tutorText = ' ' + turns.filter((t) => t.role === 'tutor').map((t) => t.text.toLowerCase()).join(' ') + ' ';
  const has = (txt: string, term: string) => new RegExp(`\\b${term.toLowerCase().replace(/[^a-z ]/g, '')}\\b`).test(txt);
  const bankWords = CONCEPTS.filter((c) => c.kind === 'word');
  const usedStudied = bankWords.filter((c) => s.concepts[c.id]?.a && has(userText, c.term)).map((c) => c.term);
  const usedNew = bankWords.filter((c) => !s.concepts[c.id]?.a && has(userText, c.term)).map((c) => c.term);
  const tutorBank = bankWords.filter((c) => !s.concepts[c.id]?.a && has(tutorText, c.term) && levelRank(c.level) <= levelRank(level) + 1).map((c) => c.term);
  const errors = user.flatMap((t) => t.corrections ?? []);
  const confs = user.filter((t) => !t.typed && t.conf).map((t) => t.conf!);
  const avgWords = all.length / Math.max(1, user.length);
  const long = [...unique].filter((w) => w.length >= 8).length;

  const scores = {
    fluency: clamp(38 + avgWords * 5.5 + Math.min(user.length, 12)),
    vocabulary: clamp(42 + unique.size * 0.6 + long * 3 + (usedStudied.length + usedNew.length) * 4),
    grammar: clamp(96 - (errors.length / Math.max(1, user.length)) * 45),
    pronunciation: confs.length ? clamp((confs.reduce((a, b) => a + b, 0) / confs.length) * 100, 40) : null,
  };

  // Temas débiles detectados
  const byConcept: Record<string, number> = {};
  errors.forEach((e) => { if (e.concept) byConcept[e.concept] = (byConcept[e.concept] ?? 0) + 1; });
  const weakTopics = Object.entries(byConcept).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${conceptById[id].translation} (${n})`);

  // Vocabulario recomendado del tema que aún no domina
  const goal = TOPIC_GOAL[topic] ?? s.profile!.goal;
  const recommended = bankWords
    .filter((c) => c.goal === goal && levelRank(c.level) <= levelRank(level) + 1 && (s.concepts[c.id]?.m ?? 0) < 60 && !has(userText, c.term))
    .sort((a, b) => (s.concepts[a.id]?.m ?? 0) - (s.concepts[b.id]?.m ?? 0) || levelRank(b.level) - levelRank(a.level))
    .slice(0, 4).map((c) => ({ id: c.id, term: c.term, translation: c.translation }));

  const strengths: string[] = [];
  if (scores.fluency >= 70) strengths.push('Desarrollaste tus respuestas en vez de contestar con una o dos palabras.');
  if (scores.grammar >= 85) strengths.push('Buena precisión gramatical durante la conversación.');
  if (scores.vocabulary >= 70) strengths.push('Usaste vocabulario variado.');
  if (user.length >= 8) strengths.push('Mantuviste la conversación con buen ritmo.');
  if (usedStudied.length) strengths.push(`Usaste palabras que ya estudiaste: ${usedStudied.slice(0, 4).join(', ')}.`);
  if (scores.pronunciation && scores.pronunciation >= 80) strengths.push('El reconocimiento de voz te entendió con claridad.');
  if (!strengths.length) strengths.push('Te animaste a hablar, que es lo más importante para ganar fluidez.');

  const improve: string[] = [];
  Object.entries(byConcept).sort((a, b) => b[1] - a[1]).slice(0, 2)
    .forEach(([id, n]) => improve.push(`${conceptById[id].translation}: ${n} ${n === 1 ? 'error' : 'errores'}.`));
  if (scores.fluency < 60) improve.push('Respuestas cortas: agrega por qué, cuándo o con quién.');
  if (scores.vocabulary < 60) improve.push('Vocabulario repetitivo: prueba sinónimos y palabras del tema.');
  if (scores.pronunciation !== null && scores.pronunciation < 70) improve.push('Pronunciación: habla un poco más despacio y vocaliza los finales de palabra.');
  if (!improve.length) improve.push('Sigue subiendo la complejidad: usa conectores como “however” o “because”.');

  const recs: string[] = [];
  Object.keys(byConcept).slice(0, 2).forEach((id) =>
    recs.push(`Repasa “${conceptById[id].translation}”: ya está en tus próximas lecciones y quizzes.`));
  if (recommended.length) recs.push(`Intenta usar en tu próxima conversación: ${recommended.slice(0, 3).map((r) => r.term).join(', ')}.`);
  if (scores.fluency < 70) recs.push('Responde con 2–3 frases cada vez, aunque cometas errores.');
  if (scores.grammar >= 85 && scores.fluency >= 75 && level !== 'C1')
    recs.push(`Vas muy bien: prueba la próxima sesión en nivel ${['A2', 'B1', 'B2', 'C1'][levelRank(level)]}.`);
  recs.push('Repite este tema en 2–3 días para fijar lo aprendido.');
  if (recs.length < 3) recs.push('Haz el quiz de repaso de hoy para reforzar lo practicado.');

  const newTerms = Array.from(new Set([...newWords.map((w) => w.term), ...usedNew, ...tutorBank]));
  return {
    scores, userTurns: user.length, words: all.length, newWords: newTerms, usedStudied, recommended,
    errors, weakTopics, strengths, improve, recs: recs.slice(0, 5), conceptsAdded: 0,
  };
}

// ---------- Integración con el motor adaptativo ----------
const slug = (t: string) => 'c_' + t.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');

export function applySpeaking(s: AppState, sess: SpeakingSession, newWords: NewWord[], now = Date.now()): AppState {
  const concepts = { ...s.concepts };
  const custom = { ...(s.custom ?? {}) };
  const touched = new Set<string>();
  const blank = (): ConceptState => ({ m: 0, c: 0, w: 0, a: 0, last: now, due: now, iv: 0, src: 'speaking' });

  // 1) Errores → bajan dominio y vuelven pronto a repaso
  sess.review.errors.forEach((e) => {
    if (!e.concept || !conceptById[e.concept]) return;
    const cs = { ...(concepts[e.concept] ?? blank()) };
    cs.w++; cs.m = Math.max(0, cs.m - 12); cs.lw = now; cs.due = now + 10 * 60_000; cs.iv = 0; cs.last = now; cs.src = 'speaking';
    concepts[e.concept] = cs; touched.add(e.concept);
  });
  // 2) Palabras del banco que usó bien → pequeño refuerzo
  CONCEPTS.forEach((c) => {
    if (c.kind !== 'word' || !sess.review.usedStudied.includes(c.term) || !concepts[c.id]) return;
    concepts[c.id] = { ...concepts[c.id], m: Math.min(100, concepts[c.id].m + 4), last: now };
  });
  // 3) Vocabulario recomendado y nuevo → entra a repetición espaciada
  const addWord = (id: string) => {
    if (concepts[id]?.a) { concepts[id] = { ...concepts[id], due: Math.min(concepts[id].due, now), last: now }; }
    else concepts[id] = { ...(concepts[id] ?? blank()), last: now, due: now, src: 'speaking' };
    touched.add(id);
  };
  sess.review.recommended.forEach((r) => addWord(r.id));
  CONCEPTS.forEach((c) => { if (c.kind === 'word' && sess.review.newWords.includes(c.term)) addWord(c.id); });
  newWords.forEach((w) => {
    const id = slug(w.term);
    if (!conceptById[id]) {
      const ex = w.example || '';
      const re = new RegExp(`\\b(${w.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
      const c: Concept = {
        id, kind: 'word', term: w.term.toLowerCase(), translation: w.translation, definition: w.definition || '',
        category: 'Speaking', unit: 'speaking', level: sess.level, goal: TOPIC_GOAL[sess.topic] ?? s.profile!.goal,
        sentences: [re.test(ex) ? ex.replace(re, '[$1]') : ex].filter(Boolean), items: [],
      };
      registerConcept(c);
      custom[id] = c;
    }
    addWord(id);
  });

  const review = { ...sess.review, conceptsAdded: touched.size };
  const k = dateKey(now);
  const day = s.activity[k] ?? { min: 0, q: 0, ok: 0, sessions: 0 };
  const turns = sess.review.userTurns;
  const next: AppState = {
    ...s, concepts, custom,
    speaking: [{ ...sess, review }, ...(s.speaking ?? [])].slice(0, 100),
    activity: { ...s.activity, [k]: { min: day.min + Math.max(1, Math.round(sess.seconds / 60)), q: day.q + turns, ok: day.ok + Math.max(0, turns - review.errors.length), sessions: day.sessions + 1 } },
  };
  next.bestStreak = Math.max(next.bestStreak, streakOf(next));
  return next;
}

export const avgScore = (r: Review) => {
  const v = [r.scores.fluency, r.scores.vocabulary, r.scores.grammar, r.scores.pronunciation].filter((x): x is number => x !== null);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
};
export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
export const DAYS7 = 7 * DAY;
