// Banco de contenido. Cada palabra trae varias frases para generar preguntas distintas.
// En las frases, la respuesta va entre [corchetes].

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type Goal = 'conversación' | 'trabajo' | 'viajes' | 'escuela' | 'general';
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const levelRank = (l: Level) => LEVELS.indexOf(l);

export interface Unit {
  id: string;
  title: string;
  level: Level;
  goal: Goal;
  minutes: number;
}

export interface GrammarItem {
  q: string; // pregunta (puede incluir ___)
  options: string[]; // la primera es la correcta
  ex: string; // explicación breve
}

export interface Concept {
  id: string;
  kind: 'word' | 'grammar';
  term: string;
  translation: string;
  definition: string;
  category: string; // Vocabulario de trabajo, Gramática, Situaciones...
  unit: string;
  level: Level;
  goal: Goal;
  sentences: string[]; // solo palabras
  items: GrammarItem[]; // solo gramática / situaciones
}

export const UNITS: Unit[] = [
  { id: 'rutina', title: 'Rutina diaria', level: 'A1', goal: 'general', minutes: 8 },
  { id: 'aeropuerto', title: 'En el aeropuerto', level: 'A2', goal: 'viajes', minutes: 10 },
  { id: 'restaurante', title: 'En el restaurante', level: 'A2', goal: 'conversación', minutes: 10 },
  { id: 'escuela', title: 'Clases y tareas', level: 'A2', goal: 'escuela', minutes: 10 },
  { id: 'emails', title: 'Emails y plazos de entrega', level: 'B1', goal: 'trabajo', minutes: 12 },
  { id: 'reuniones', title: 'Reuniones de trabajo', level: 'B1', goal: 'trabajo', minutes: 12 },
  { id: 'hotel', title: 'Hotel y alojamiento', level: 'B1', goal: 'viajes', minutes: 12 },
  { id: 'charla', title: 'Conversación cotidiana', level: 'B1', goal: 'conversación', minutes: 12 },
  { id: 'negociacion', title: 'Negociación', level: 'B2', goal: 'trabajo', minutes: 15 },
  { id: 'opiniones', title: 'Dar y defender opiniones', level: 'B2', goal: 'conversación', minutes: 15 },
  { id: 'matices', title: 'Matices profesionales', level: 'C1', goal: 'trabajo', minutes: 15 },
];

const CAT: Record<Goal, string> = {
  trabajo: 'Trabajo',
  viajes: 'Viajes',
  conversación: 'Conversación',
  escuela: 'Escuela',
  general: 'Básico',
};

type W = [term: string, es: string, def: string, unit: string, sentences: string[]];

const WORDS: W[] = [
  // A1 — Rutina
  ['wake up', 'despertarse', 'To stop sleeping.', 'rutina', ['I [wake up] at seven every day.', 'What time do you [wake up] on Sundays?']],
  ['breakfast', 'desayuno', 'The first meal of the day.', 'rutina', ['I have eggs for [breakfast].', 'We eat [breakfast] together in the kitchen.']],
  ['usually', 'normalmente', 'In most cases; most of the time.', 'rutina', ['I [usually] take the bus to work.', 'She [usually] calls her mom on Fridays.']],
  ['busy', 'ocupado', 'Having a lot to do.', 'rutina', ['Sorry, I am very [busy] today.', 'Mondays are always [busy] for me.']],
  ['tired', 'cansado', 'Needing rest or sleep.', 'rutina', ['I am [tired] after the gym.', 'You look [tired]. Go to bed early.']],
  ['weekend', 'fin de semana', 'Saturday and Sunday.', 'rutina', ['What are you doing this [weekend]?', 'I visit my family on the [weekend].']],
  // A2 — Aeropuerto
  ['boarding pass', 'pase de abordar', 'The document that lets you get on a plane.', 'aeropuerto', ['Please show your [boarding pass] at the gate.', 'I printed my [boarding pass] at home.']],
  ['luggage', 'equipaje', 'The bags you take when you travel.', 'aeropuerto', ['My [luggage] didn’t arrive.', 'You can only bring one piece of hand [luggage].']],
  ['delay', 'retraso', 'A situation where something happens later than planned.', 'aeropuerto', ['There is a two-hour [delay] on our flight.', 'Sorry for the [delay], the plane is ready now.']],
  ['gate', 'puerta (de embarque)', 'The place in an airport where you get on the plane.', 'aeropuerto', ['Our flight leaves from [gate] 12.', 'Please go to the [gate] thirty minutes before departure.']],
  ['check in', 'documentar / registrarse', 'To show your ticket and leave your bags before a flight.', 'aeropuerto', ['You can [check in] online 24 hours before.', 'We need to [check in] two hours early.']],
  ['aisle seat', 'asiento de pasillo', 'A seat next to the walkway on a plane.', 'aeropuerto', ['Can I have an [aisle seat], please?', 'I prefer an [aisle seat] on long flights.']],
  // A2 — Restaurante
  ['bill', 'la cuenta', 'The paper that shows how much you have to pay.', 'restaurante', ['Can we have the [bill], please?', 'The [bill] was more expensive than we expected.']],
  ['order', 'pedir / ordenar', 'To ask for food or drinks in a restaurant.', 'restaurante', ['Are you ready to [order]?', 'I’d like to [order] the chicken salad.']],
  ['tip', 'propina', 'Extra money you give for good service.', 'restaurante', ['We left a 15% [tip] for the waiter.', 'Is the [tip] included in the bill?']],
  ['waiter', 'mesero', 'A person who serves food in a restaurant.', 'restaurante', ['The [waiter] brought us water.', 'Excuse me, can you call the [waiter]?']],
  ['reservation', 'reservación', 'An arrangement to keep a table or room for you.', 'restaurante', ['I have a [reservation] for two at eight.', 'Do we need a [reservation] for Saturday?']],
  ['side dish', 'guarnición', 'A small portion of food served with the main dish.', 'restaurante', ['Fries come as a [side dish].', 'Which [side dish] would you like with your steak?']],
  // A2 — Escuela
  ['assignment', 'tarea / trabajo', 'A piece of work given to a student.', 'escuela', ['I finished my history [assignment] last night.', 'The [assignment] is worth 20% of the grade.']],
  ['grade', 'calificación', 'A mark that shows how good a student’s work is.', 'escuela', ['She got a good [grade] in math.', 'What [grade] do you need to pass?']],
  ['due', 'para entregar (fecha)', 'Expected to be finished or delivered at a certain time.', 'escuela', ['The essay is [due] on Friday.', 'When is the project [due]?']],
  ['essay', 'ensayo', 'A short piece of writing about one topic.', 'escuela', ['Write a 500-word [essay] about your city.', 'My [essay] needs a better conclusion.']],
  ['lecture', 'clase magistral / conferencia', 'A talk given to students on a subject.', 'escuela', ['The [lecture] starts at nine.', 'I took notes during the [lecture].']],
  ['research', 'investigación / investigar', 'Detailed study to discover new facts.', 'escuela', ['I need to do more [research] for my project.', 'Her [research] is about climate change.']],
  // B1 — Emails (lección demo)
  ['deadline', 'fecha límite', 'The latest time by which something must be done.', 'emails', ['Please send the report before the [deadline].', 'We can’t miss the [deadline] on Friday.', 'The client moved the [deadline] to next week.']],
  ['follow up', 'dar seguimiento', 'To contact someone again to continue something.', 'emails', ['I’ll [follow up] with the client tomorrow.', 'Just wanted to [follow up] on my last email.', 'Can you [follow up] after the meeting?']],
  ['attach', 'adjuntar', 'To add a file to an email.', 'emails', ['Please [attach] the invoice to the email.', 'Don’t forget to [attach] the contract.', 'I will [attach] the updated slides.']],
  ['reply all', 'responder a todos', 'To answer everyone who received an email.', 'emails', ['Please don’t [reply all] for personal comments.', 'I clicked [reply all] by mistake.', 'Use [reply all] so the whole team knows.']],
  ['schedule', 'agendar / programar', 'To plan something for a specific time.', 'emails', ['Let’s [schedule] a call for Monday.', 'Can you [schedule] the meeting at 10?', 'I want to [schedule] a quick review.']],
  ['on hold', 'en pausa / en espera', 'Temporarily stopped or delayed.', 'emails', ['The project is [on hold] until next month.', 'We put the order [on hold].', 'Hiring is [on hold] for now.']],
  ['draft', 'borrador', 'An early version of a document.', 'emails', ['Here is the first [draft] of the proposal.', 'Please review the [draft] before Friday.', 'The email is still a [draft].']],
  ['remind', 'recordar (a alguien)', 'To make someone remember something.', 'emails', ['Can you [remind] me to call Ana?', 'I’m writing to [remind] you about the payment.', 'Please [remind] the team about the deadline.']],
  // B1 — Reuniones
  ['agenda', 'orden del día', 'A list of topics to discuss in a meeting.', 'reuniones', ['What’s on the [agenda] today?', 'I sent the [agenda] this morning.']],
  ['postpone', 'posponer', 'To move an event to a later time.', 'reuniones', ['We need to [postpone] the meeting.', 'They decided to [postpone] the launch.']],
  ['attend', 'asistir', 'To be present at an event.', 'reuniones', ['Will you [attend] the conference?', 'Ten people will [attend] the workshop.']],
  ['point out', 'señalar', 'To tell someone about something they should know.', 'reuniones', ['She was right to [point out] the mistake.', 'Let me [point out] one problem with the plan.']],
  ['wrap up', 'concluir / cerrar', 'To finish something, especially a meeting.', 'reuniones', ['Let’s [wrap up] the meeting in five minutes.', 'We can [wrap up] with the next steps.']],
  ['action item', 'pendiente / tarea asignada', 'A task that someone must do after a meeting.', 'reuniones', ['Each person has one [action item].', 'Let’s review the [action item] list.']],
  // B1 — Hotel
  ['book', 'reservar', 'To arrange to have a room, seat or ticket.', 'hotel', ['I want to [book] a double room.', 'Did you [book] the hotel yet?']],
  ['available', 'disponible', 'Free to be used or bought.', 'hotel', ['Is there a room [available] tonight?', 'Sorry, nothing is [available] this weekend.']],
  ['check out', 'salida (del hotel)', 'To leave a hotel after paying.', 'hotel', ['What time do we have to [check out]?', 'Can we [check out] a bit later?']],
  ['fee', 'cargo / tarifa', 'Money you pay for a service.', 'hotel', ['There is a $20 [fee] for parking.', 'Is there a cancellation [fee]?']],
  ['upgrade', 'mejora de categoría', 'A better seat, room or service than you paid for.', 'hotel', ['They gave us a free [upgrade] to a suite.', 'How much is an [upgrade] to an ocean view?']],
  ['amenities', 'servicios / comodidades', 'Useful or pleasant facilities in a place.', 'hotel', ['The hotel has great [amenities], like a pool and gym.', 'Which [amenities] are included?']],
  // B1 — Charla
  ['actually', 'en realidad', 'Used to say what is true, often surprising.', 'charla', ['I [actually] prefer tea.', 'It’s not far, [actually].']],
  ['hang out', 'pasar el rato', 'To spend time with friends casually.', 'charla', ['Do you want to [hang out] later?', 'We usually [hang out] at the park.']],
  ['catch up', 'ponerse al día', 'To talk to someone to learn their news.', 'charla', ['Let’s get coffee and [catch up].', 'It was nice to [catch up] with you.']],
  ['awkward', 'incómodo', 'Making you feel uncomfortable or embarrassed.', 'charla', ['There was an [awkward] silence.', 'It felt [awkward] to say no.']],
  ['figure out', 'descifrar / resolver', 'To understand or solve something.', 'charla', ['I can’t [figure out] this app.', 'We’ll [figure out] a solution.']],
  ['look forward to', 'esperar con ganas', 'To feel happy about something that will happen.', 'charla', ['I [look forward to] seeing you.', 'We [look forward to] your reply.']],
  // B2 — Negociación
  ['trade-off', 'concesión / equilibrio', 'A balance between two things you cannot have at the same time.', 'negociacion', ['There’s a [trade-off] between price and quality.', 'Faster delivery is a [trade-off] we can accept.']],
  ['leverage', 'ventaja / poder de negociación', 'Power to influence a situation.', 'negociacion', ['Having other offers gives you [leverage].', 'We have little [leverage] in this deal.']],
  ['counteroffer', 'contraoferta', 'An offer made in reply to another offer.', 'negociacion', ['They rejected our price and made a [counteroffer].', 'We’ll send a [counteroffer] tomorrow.']],
  ['compromise', 'acuerdo intermedio', 'An agreement where both sides accept less than they wanted.', 'negociacion', ['We reached a [compromise] on the budget.', 'A [compromise] is better than no deal.']],
  ['bottom line', 'lo esencial / límite', 'The most important fact, or the lowest acceptable price.', 'negociacion', ['The [bottom line] is that we need more time.', 'What’s your [bottom line] on price?']],
  ['stakeholder', 'parte interesada', 'A person with an interest in a project or business.', 'negociacion', ['Every [stakeholder] must approve the plan.', 'We met with the main [stakeholder] today.']],
  // B2 — Opiniones
  ['nevertheless', 'sin embargo / aun así', 'Despite what was just said.', 'opiniones', ['It was expensive; [nevertheless], we bought it.', 'The plan is risky. [Nevertheless], it could work.']],
  ['likely', 'probable', 'Probably going to happen.', 'opiniones', ['It’s [likely] to rain tomorrow.', 'Prices are [likely] to rise.']],
  ['approach', 'enfoque', 'A way of dealing with something.', 'opiniones', ['I like your [approach] to the problem.', 'We need a different [approach].']],
  ['outcome', 'resultado', 'The final result of an action or event.', 'opiniones', ['Nobody knows the [outcome] yet.', 'We were happy with the [outcome].']],
  ['whereas', 'mientras que', 'Used to compare two different facts.', 'opiniones', ['I like the city, [whereas] my wife prefers the beach.', 'Plan A is cheap, [whereas] plan B is faster.']],
  ['to be fair', 'siendo justos', 'Used to add something that balances a criticism.', 'opiniones', ['[To be fair], he had very little time.', 'The food was slow, but [to be fair], it was busy.']],
  // C1 — Matices
  ['albeit', 'aunque / si bien', 'Although (used before an adjective or phrase).', 'matices', ['It was a success, [albeit] a small one.', 'He agreed, [albeit] reluctantly.']],
  ['undermine', 'socavar / debilitar', 'To make something weaker gradually.', 'matices', ['Constant delays [undermine] trust.', 'Don’t [undermine] your manager in public.']],
  ['streamline', 'optimizar / agilizar', 'To make a process simpler and more efficient.', 'matices', ['We want to [streamline] the approval process.', 'The new tool will [streamline] our workflow.']],
  ['pivotal', 'crucial / decisivo', 'Of central importance.', 'matices', ['She played a [pivotal] role in the deal.', 'This is a [pivotal] moment for the company.']],
  ['hinder', 'obstaculizar', 'To make it difficult for something to happen.', 'matices', ['Bad data can [hinder] good decisions.', 'Bureaucracy may [hinder] growth.']],
  ['nuance', 'matiz', 'A very small difference in meaning or feeling.', 'matices', ['Translation often loses [nuance].', 'There’s an important [nuance] in her answer.']],
];

type G = [id: string, term: string, es: string, def: string, unit: string, category: string, items: GrammarItem[]];

const GRAMMAR: G[] = [
  ['g_be', 'Verb to be', 'Verbo “ser/estar”', 'am / is / are según el sujeto.', 'rutina', 'Gramática', [
    { q: 'She ___ a teacher.', options: ['is', 'are', 'am', 'be'], ex: 'Con he/she/it usamos “is”.' },
    { q: 'We ___ from Mexico.', options: ['are', 'is', 'am', 'be'], ex: 'Con we/you/they usamos “are”.' },
    { q: 'I ___ ready.', options: ['am', 'is', 'are', 'be'], ex: 'Con “I” siempre usamos “am”.' },
  ]],
  ['g_present', 'Present simple (he/she/it)', 'Presente simple', 'En 3ª persona singular el verbo lleva -s.', 'rutina', 'Gramática', [
    { q: 'He ___ to work by bus.', options: ['goes', 'go', 'going', 'gone'], ex: 'He/she/it + verbo con -s/-es: goes.' },
    { q: 'My sister ___ coffee every morning.', options: ['drinks', 'drink', 'drinking', 'is drink'], ex: 'Sujeto en 3ª persona singular → drinks.' },
    { q: '___ she work on Saturdays?', options: ['Does', 'Do', 'Is', 'Are'], ex: 'Preguntas en 3ª persona usan “Does” + verbo base.' },
  ]],
  ['g_past', 'Past simple', 'Pasado simple', 'Acciones terminadas en el pasado; verbos regulares en -ed.', 'aeropuerto', 'Gramática', [
    { q: 'Yesterday we ___ to Cancún.', options: ['flew', 'fly', 'flown', 'flying'], ex: '“Fly” es irregular: fly → flew → flown.' },
    { q: 'I ___ my passport at home!', options: ['left', 'leaved', 'leave', 'leaving'], ex: '“Leave” es irregular: left.' },
    { q: 'Did you ___ the email?', options: ['send', 'sent', 'sends', 'sending'], ex: 'Después de “did” va el verbo en forma base.' },
  ]],
  ['g_prep', 'Prepositions', 'Preposiciones', 'to para movimiento, on para días, at/in para lugares.', 'aeropuerto', 'Gramática', [
    { q: 'Last night we went ___ a restaurant.', options: ['to', 'in', 'at', 'on'], ex: 'Movimiento hacia un lugar: go/went to.' },
    { q: 'My flight is ___ Monday.', options: ['on', 'in', 'at', 'to'], ex: 'Con días de la semana usamos “on”.' },
    { q: 'It depends ___ the price.', options: ['on', 'of', 'in', 'from'], ex: 'La expresión correcta es “depend on”.' },
  ]],
  ['g_compar', 'Comparatives', 'Comparativos', 'Adjetivo + -er o more + adjetivo, seguido de “than”.', 'restaurante', 'Gramática', [
    { q: 'This restaurant is ___ than the other one.', options: ['cheaper', 'more cheap', 'cheapest', 'cheap'], ex: 'Adjetivos cortos: + -er (cheaper).' },
    { q: 'The fish is ___ than the steak.', options: ['more expensive', 'expensiver', 'most expensive', 'expensive'], ex: 'Adjetivos largos: more + adjetivo.' },
    { q: 'Today’s soup is ___ than yesterday’s.', options: ['better', 'gooder', 'more good', 'best'], ex: '“Good” es irregular: better.' },
  ]],
  ['s_travel', 'Travel situations', 'Situaciones de viaje', 'Frases útiles para viajar.', 'aeropuerto', 'Situaciones', [
    { q: 'En migración te preguntan el motivo del viaje. Respondes:', options: ['I’m here on vacation.', 'I’m here for vacation time.', 'I make vacation.', 'I am vacations.'], ex: '“I’m here on vacation/business” es la fórmula natural.' },
    { q: 'Quieres saber dónde está tu puerta:', options: ['Excuse me, where is gate 12?', 'Where gate 12 is?', 'Gate 12 where?', 'Where are gate 12?'], ex: 'En preguntas, el verbo va antes del sujeto: where is…?' },
    { q: 'Tu maleta no llegó. Dices:', options: ['My suitcase didn’t arrive.', 'My suitcase not arrived.', 'My suitcase don’t arrive.', 'My suitcase no arrive.'], ex: 'Negación en pasado: didn’t + verbo base.' },
  ]],
  ['s_rest', 'Ordering food', 'Pedir comida', 'Pedir de forma educada en un restaurante.', 'restaurante', 'Situaciones', [
    { q: 'Quieres pedir de forma educada:', options: ['I’d like the pasta, please.', 'Give me pasta.', 'I want pasta now.', 'Pasta for me is.'], ex: '“I’d like…” es la forma educada de pedir.' },
    { q: 'Quieres pagar:', options: ['Could we get the check, please?', 'Bring the money.', 'We pay now the bill.', 'Check us.'], ex: '“Could we get the check/bill, please?” es lo habitual.' },
    { q: 'Eres alérgico al cacahuate:', options: ['I’m allergic to peanuts.', 'I have allergic peanuts.', 'Peanuts allergy me.', 'I’m allergy of peanuts.'], ex: 'Estructura: be allergic to + algo.' },
  ]],
  ['g_presperf', 'Present perfect', 'Presente perfecto', 'have/has + participio para experiencias o resultados actuales.', 'emails', 'Gramática', [
    { q: 'I ___ already sent the report.', options: ['have', 'has', 'had been', 'am'], ex: 'I/you/we/they + have + participio.' },
    { q: 'She has ___ the contract.', options: ['signed', 'sign', 'signing', 'signs'], ex: 'Después de has/have va el participio.' },
    { q: 'Have you ___ the client yet?', options: ['called', 'call', 'calling', 'calls'], ex: '“Yet” en preguntas de present perfect; participio: called.' },
  ]],
  ['s_work', 'Work emails', 'Correos de trabajo', 'Fórmulas profesionales para correos.', 'emails', 'Situaciones', [
    { q: 'Quieres adjuntar un documento. Escribes:', options: ['Please find attached the report.', 'I attach you the report here.', 'Look the report attached.', 'Attached is report for you to see it.'], ex: '“Please find attached…” es la fórmula estándar.' },
    { q: 'Quieres cerrar un correo pidiendo respuesta:', options: ['I look forward to hearing from you.', 'I look forward to hear from you.', 'I wait your answer.', 'Answer me soon please.'], ex: '“Look forward to” va seguido de -ing.' },
    { q: 'Te disculpas por responder tarde:', options: ['Sorry for the late reply.', 'Sorry for reply late.', 'Sorry to the late answer.', 'Excuse my late replying.'], ex: '“Sorry for the late reply” es natural y profesional.' },
  ]],
  ['g_cond1', 'First conditional', 'Primer condicional', 'If + presente, will + verbo: situaciones reales futuras.', 'reuniones', 'Gramática', [
    { q: 'If we finish early, we ___ leave at five.', options: ['will', 'would', 'are', 'did'], ex: 'Primer condicional: if + presente, will + verbo.' },
    { q: 'If the client ___, I’ll call you.', options: ['calls', 'will call', 'called', 'would call'], ex: 'Después de “if” usamos presente, no “will”.' },
    { q: 'We won’t meet the deadline unless we ___ now.', options: ['start', 'will start', 'started', 'starting'], ex: '“Unless” funciona como “if not”: va con presente.' },
  ]],
  ['s_hotel', 'Hotel situations', 'Situaciones en el hotel', 'Frases útiles en recepción.', 'hotel', 'Situaciones', [
    { q: 'Llegas al hotel con reservación:', options: ['Hi, I have a reservation under García.', 'Hi, I have reservation in García.', 'Hi, García reserve.', 'Hi, is reservation of me.'], ex: '“A reservation under [name]” es la estructura correcta.' },
    { q: 'Quieres salir más tarde:', options: ['Is late check-out possible?', 'Can I go out late of hotel?', 'Possible late exit?', 'I want later checking.'], ex: '“Late check-out” es el término usado.' },
    { q: 'El aire acondicionado no funciona:', options: ['The air conditioning isn’t working.', 'The air conditioning no work.', 'The air conditioning don’t works.', 'Not working the air.'], ex: 'Algo que falla ahora: isn’t working.' },
  ]],
  ['g_cond2', 'Second conditional', 'Segundo condicional', 'If + pasado, would + verbo: situaciones hipotéticas.', 'opiniones', 'Gramática', [
    { q: 'If I ___ more time, I would learn French.', options: ['had', 'have', 'will have', 'would have'], ex: 'Segundo condicional: if + pasado simple.' },
    { q: 'If I were you, I ___ accept the offer.', options: ['would', 'will', 'am', 'did'], ex: 'Consejo hipotético: If I were you, I would…' },
    { q: 'What would you do if you ___ the lottery?', options: ['won', 'win', 'will win', 'would win'], ex: 'Situación imaginaria: if + pasado (won).' },
  ]],
  ['g_passive', 'Passive voice', 'Voz pasiva', 'be + participio cuando importa la acción más que quién la hace.', 'negociacion', 'Gramática', [
    { q: 'The contract ___ signed yesterday.', options: ['was', 'is', 'were', 'has'], ex: 'Pasiva en pasado: was/were + participio.' },
    { q: 'The new prices will ___ announced next week.', options: ['be', 'being', 'been', 'is'], ex: 'Pasiva en futuro: will be + participio.' },
    { q: 'All the emails have been ___.', options: ['answered', 'answer', 'answering', 'answers'], ex: 'Present perfect pasivo: have been + participio.' },
  ]],
  ['g_reported', 'Reported speech', 'Estilo indirecto', 'Al reportar lo que alguien dijo, el tiempo verbal suele retroceder.', 'opiniones', 'Gramática', [
    { q: '“I am tired.” → She said she ___ tired.', options: ['was', 'is', 'were', 'has been'], ex: 'am/is → was en estilo indirecto.' },
    { q: '“We will call you.” → They said they ___ call us.', options: ['would', 'will', 'can', 'shall'], ex: 'will → would.' },
    { q: 'He asked me where I ___.', options: ['lived', 'did live', 'do live', 'live do'], ex: 'En preguntas indirectas no se usa did; orden de afirmación.' },
  ]],
  ['g_cond3', 'Third conditional', 'Tercer condicional', 'If + had + participio, would have + participio: pasado irreal.', 'matices', 'Gramática', [
    { q: 'If we had left earlier, we ___ caught the train.', options: ['would have', 'would', 'will have', 'had'], ex: 'Resultado irreal en el pasado: would have + participio.' },
    { q: 'If she ___ the email, she would have replied.', options: ['had seen', 'saw', 'has seen', 'would see'], ex: 'Condición en pasado irreal: had + participio.' },
  ]],
  ['g_inversion', 'Inversion', 'Inversión enfática', 'Expresiones negativas al inicio invierten sujeto y auxiliar.', 'matices', 'Gramática', [
    { q: 'Never ___ such a strong proposal.', options: ['have I seen', 'I have seen', 'I saw', 'seen I have'], ex: 'Never/Rarely al inicio → auxiliar + sujeto.' },
    { q: 'Not only ___ late, but he also forgot the files.', options: ['was he', 'he was', 'he is', 'is he being'], ex: 'Not only + auxiliar + sujeto.' },
    { q: 'Hardly ___ arrived when the meeting started.', options: ['had we', 'we had', 'we have', 'have we been'], ex: 'Hardly + had + sujeto + participio.' },
  ]],
];

const unitById = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export const CONCEPTS: Concept[] = [
  ...WORDS.map(([term, es, def, unit, sentences]): Concept => {
    const u = unitById[unit];
    return {
      id: 'w_' + term.toLowerCase().replace(/[^a-z]+/g, '_'),
      kind: 'word', term, translation: es, definition: def, unit,
      level: u.level, goal: u.goal, category: CAT[u.goal], sentences, items: [],
    };
  }),
  ...GRAMMAR.map(([id, term, es, def, unit, category, items]): Concept => {
    const u = unitById[unit];
    return { id, kind: 'grammar', term, translation: es, definition: def, unit, level: u.level, goal: u.goal, category, sentences: [], items };
  }),
];

export const conceptById: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));
export const exampleOf = (c: Concept) => (c.sentences[0] || c.items[0]?.q || '').replace(/[[\]]/g, '');
