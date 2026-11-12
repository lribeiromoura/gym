import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  ExerciseMeasurementType,
  MuscleGroup,
} from '@/types/workout';

export interface ExerciseDBRawItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
}

const API_BASE = 'https://oss.exercisedb.dev/api/v1';

/**
 * Mapeamento de músculos-alvo e partes do corpo da ExerciseDB para os grupos musculares do app
 */
const MUSCLE_MAP: Record<string, MuscleGroup> = {
  // Peito
  pectorals: 'chest',
  chest: 'chest',
  'serratus anterior': 'chest',
  'upper chest': 'chest',

  // Dorsais & Costas
  'latissimus dorsi': 'lats',
  lats: 'lats',
  'upper back': 'upper_back',
  rhomboids: 'upper_back',
  back: 'upper_back',
  'erector spinae': 'lower_back',
  'lower back': 'lower_back',
  spine: 'lower_back',

  // Trapézio & Pescoço
  trapezius: 'traps',
  traps: 'traps',
  'levator scapulae': 'traps',
  sternocleidomastoid: 'traps',
  neck: 'traps',

  // Ombros
  deltoids: 'shoulders',
  delts: 'shoulders',
  'rear deltoids': 'shoulders',
  'rotator cuff': 'shoulders',
  shoulders: 'shoulders',

  // Braços
  biceps: 'biceps',
  brachialis: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  'wrist flexors': 'forearms',
  'wrist extensors': 'forearms',
  wrists: 'forearms',
  'grip muscles': 'forearms',
  hands: 'forearms',
  'lower arms': 'forearms',
  'upper arms': 'biceps',

  // Core / Abdômen
  abdominals: 'abs',
  abs: 'abs',
  obliques: 'abs',
  core: 'abs',
  waist: 'abs',

  // Pernas & Glúteos
  quadriceps: 'quads',
  quads: 'quads',
  'hip flexors': 'quads',
  'upper legs': 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  abductors: 'abductors',
  adductors: 'adductors',
  calves: 'calves',
  soleus: 'calves',
  'tibialis anterior': 'calves',
  ankles: 'calves',
  'ankle stabilizers': 'calves',
  feet: 'calves',
  'lower legs': 'calves',

  // Cardio
  'cardiovascular system': 'cardio',
  cardio: 'cardio',
};

/**
 * Mapeamento de equipamentos da ExerciseDB para EquipmentType do app
 */
const EQUIPMENT_MAP: Record<string, EquipmentType> = {
  barbell: 'barbell',
  'olympic barbell': 'barbell',
  'trap bar': 'barbell',
  dumbbell: 'dumbbell',
  'ez bar': 'ez_bar',
  'ez barbell': 'ez_bar',
  'smith machine': 'smith',
  cable: 'cable',
  rope: 'cable',
  'leverage machine': 'machine',
  'sled machine': 'machine',
  'stepmill machine': 'machine',
  'elliptical machine': 'machine',
  'stationary bike': 'machine',
  'ski ergometer': 'machine',
  'upper body ergometer': 'machine',
  assisted: 'machine',
  bodyweight: 'bodyweight',
  'body weight': 'bodyweight',
  kettlebell: 'kettlebell',
  'resistance band': 'band',
  band: 'band',
  weighted: 'other',
  'ab wheel': 'other',
  'stability ball': 'other',
  'medicine ball': 'other',
  'bosu ball': 'other',
  'suspension trainer': 'other',
  roller: 'other',
  tire: 'other',
  hammer: 'other',
  towel: 'other',
  'tennis ball': 'other',
};

export function mapTargetMuscleToGroup(
  targetMuscles?: string[],
  bodyParts?: string[],
  rawName = ''
): MuscleGroup {
  if (targetMuscles && targetMuscles.length > 0) {
    for (const tm of targetMuscles) {
      const mapped = MUSCLE_MAP[tm.toLowerCase().trim()];
      if (mapped) return mapped;
    }
  }

  const lowerName = rawName.toLowerCase();
  if (
    lowerName.includes('bench press') ||
    lowerName.includes('chest') ||
    lowerName.includes('pec ') ||
    lowerName.includes('push-up') ||
    lowerName.includes('push up') ||
    lowerName.includes('crossover') ||
    lowerName.includes('fly')
  ) {
    if (lowerName.includes('rear') || lowerName.includes('reverse fly')) {
      return 'shoulders';
    }
    return 'chest';
  }
  if (lowerName.includes('pulldown') || lowerName.includes('pull-up') || lowerName.includes('chin-up')) {
    return 'lats';
  }
  if (lowerName.includes('row')) {
    return lowerName.includes('upright row') ? 'shoulders' : 'upper_back';
  }
  if (lowerName.includes('deadlift')) {
    return lowerName.includes('romanian') || lowerName.includes('stiff')
      ? 'hamstrings'
      : 'lower_back';
  }
  if (
    lowerName.includes('shoulder') ||
    lowerName.includes('lateral raise') ||
    lowerName.includes('front raise') ||
    lowerName.includes('military press') ||
    lowerName.includes('overhead press') ||
    lowerName.includes('arnold press') ||
    lowerName.includes('deltoid') ||
    lowerName.includes('face pull')
  ) {
    return 'shoulders';
  }
  if (lowerName.includes('shrug')) return 'traps';
  if (lowerName.includes('tricep') || lowerName.includes('pushdown') || lowerName.includes('skull')) {
    return 'triceps';
  }
  if (lowerName.includes('wrist')) return 'forearms';
  if (lowerName.includes('leg curl') || lowerName.includes('hamstring')) {
    return 'hamstrings';
  }
  if (lowerName.includes('curl')) return 'biceps';
  if (
    lowerName.includes('squat') ||
    lowerName.includes('leg press') ||
    lowerName.includes('leg extension') ||
    lowerName.includes('lunge') ||
    lowerName.includes('step-up')
  ) {
    return 'quads';
  }
  if (lowerName.includes('glute') || lowerName.includes('hip thrust') || lowerName.includes('kickback')) {
    return 'glutes';
  }
  if (lowerName.includes('calf') || lowerName.includes('calves')) return 'calves';
  if (
    lowerName.includes('crunch') ||
    lowerName.includes('sit-up') ||
    lowerName.includes('plank') ||
    lowerName.includes('leg raise') ||
    lowerName.includes('knee raise') ||
    lowerName.includes('ab ') ||
    lowerName.includes('twist')
  ) {
    return 'abs';
  }

  if (bodyParts && bodyParts.length > 0) {
    for (const bp of bodyParts) {
      const mapped = MUSCLE_MAP[bp.toLowerCase().trim()];
      if (mapped) return mapped;
    }
  }

  return 'full_body';
}

export function mapSecondaryMusclesToGroups(
  secondaryMuscles?: string[],
  primary?: MuscleGroup
): MuscleGroup[] {
  if (!secondaryMuscles || secondaryMuscles.length === 0) return [];
  const result = new Set<MuscleGroup>();
  for (const sm of secondaryMuscles) {
    const mapped = MUSCLE_MAP[sm.toLowerCase().trim()];
    if (mapped && mapped !== primary) {
      result.add(mapped);
    }
  }
  return Array.from(result);
}

export function mapEquipmentToType(
  equipments?: string[],
  rawName = ''
): EquipmentType {
  if (equipments && equipments.length > 0) {
    for (const eq of equipments) {
      const mapped = EQUIPMENT_MAP[eq.toLowerCase().trim()];
      if (mapped) return mapped;
    }
  }

  const lower = rawName.toLowerCase();
  if (lower.includes('ez bar') || lower.includes('ez-bar') || lower.includes('ez barbell'))
    return 'ez_bar';
  if (lower.includes('barbell')) return 'barbell';
  if (lower.includes('dumbbell')) return 'dumbbell';
  if (lower.includes('smith')) return 'smith';
  if (lower.includes('cable') || lower.includes('pulley') || lower.includes('rope'))
    return 'cable';
  if (lower.includes('kettlebell')) return 'kettlebell';
  if (lower.includes('band')) return 'band';
  if (
    lower.includes('lever') ||
    lower.includes('machine') ||
    lower.includes('sled') ||
    lower.includes('assisted')
  )
    return 'machine';
  if (
    lower.includes('push-up') ||
    lower.includes('pull-up') ||
    lower.includes('chin-up') ||
    lower.includes('plank') ||
    lower.includes('bodyweight')
  )
    return 'bodyweight';

  return 'other';
}

export function inferMeasurementType(
  equipment: EquipmentType,
  primaryMuscle: MuscleGroup,
  rawName = ''
): ExerciseMeasurementType {
  const lower = rawName.toLowerCase();
  if (primaryMuscle === 'cardio') return 'distance_duration';
  if (
    lower.includes('plank') ||
    lower.includes('hold') ||
    lower.includes('isometric') ||
    lower.includes('stretch')
  ) {
    return 'duration';
  }
  if (equipment === 'bodyweight') return 'bodyweight_reps';
  return 'weight_reps';
}

/**
 * Regras de tradução direta e padrões de movimentos da ExerciseDB para Português (pt-BR)
 */
const EXACT_NAME_TRANSLATIONS: Record<string, string> = {
  'barbell bench press': 'Supino Reto (Barra)',
  'dumbbell bench press': 'Supino Reto (Halteres)',
  'smith bench press': 'Supino Reto (Smith)',
  'cable bench press': 'Supino Reto (Polia)',
  'band bench press': 'Supino Reto (Elástico)',
  'barbell incline bench press': 'Supino Inclinado (Barra)',
  'dumbbell incline bench press': 'Supino Inclinado (Halteres)',
  'smith incline bench press': 'Supino Inclinado (Smith)',
  'barbell decline bench press': 'Supino Declinado (Barra)',
  'dumbbell decline bench press': 'Supino Declinado (Halteres)',
  'smith decline bench press': 'Supino Declinado (Smith)',
  'dumbbell fly': 'Crucifixo Reto (Halteres)',
  'dumbbell incline fly': 'Crucifixo Inclinado (Halteres)',
  'dumbbell decline fly': 'Crucifixo Declinado (Halteres)',
  'cable crossover': 'Crucifixo no Crossover (Polia)',
  'cable middle fly': 'Crucifixo na Polia Média',
  'cable low fly': 'Crucifixo na Polia Baixa',
  'lever seated fly': 'Voador / Pec Deck (Máquina)',
  'lever chest press': 'Supino Sentado (Máquina)',
  'dumbbell pullover': 'Pullover (Halter)',
  'barbell pullover': 'Pullover (Barra)',
  'push-up': 'Flexão de Braços',
  'incline push-up': 'Flexão de Braços Inclinada',
  'decline push-up': 'Flexão de Braços Declinada',
  'diamond push-up': 'Flexão Diamante (Foco Tríceps)',
  'chest dip': 'Paralelas (Foco Peito)',
  'triceps dip': 'Paralelas (Foco Tríceps)',
  'impossible dips': 'Paralelas Avançadas (Tríceps)',
  'bench dip': 'Mergulho no Banco (Tríceps)',
  'pull-up': 'Barra Fixa Pronada (Pull-Up)',
  'chin-up': 'Barra Fixa Supinada (Chin-Up)',
  'cable pulldown': 'Puxada Alta na Polia (Pulldown)',
  'cable wide grip lat pulldown': 'Puxada Alta Pegada Aberta (Polia)',
  'cable underhand pulldown': 'Puxada Alta Pegada Supinada (Polia)',
  'band underhand pulldown': 'Puxada Supinada (Elástico)',
  'cable straight arm pulldown': 'Pulldown com Braços Estendidos (Polia)',
  'cable seated row': 'Remada Baixa Sentada (Polia)',
  'barbell bent over row': 'Remada Curvada (Barra)',
  'barbell reverse grip bent over row': 'Remada Curvada Pegada Supinada (Barra)',
  'dumbbell bent over row': 'Remada Curvada (Halteres)',
  'dumbbell one arm bent-over row': 'Remada Unilateral Serrote (Halter)',
  'lever t-bar row': 'Remada Cavalinho (Máquina)',
  'lever seated row': 'Remada Sentada (Máquina)',
  'barbell deadlift': 'Levantamento Terra (Barra)',
  'barbell sumo deadlift': 'Levantamento Terra Sumô (Barra)',
  'barbell romanian deadlift': 'Stiff / Terra Romeno (Barra)',
  'dumbbell romanian deadlift': 'Stiff / Terra Romeno (Halteres)',
  'barbell stiff leg deadlift': 'Stiff com Pernas Estendidas (Barra)',
  'dumbbell stiff leg deadlift': 'Stiff com Pernas Estendidas (Halteres)',
  'barbell full squat': 'Agachamento Livre Profundo (Barra)',
  'barbell squat': 'Agachamento Livre (Barra)',
  'barbell front squat': 'Agachamento Frontal (Barra)',
  'barbell hack squat': 'Agachamento Hack (Barra)',
  'sled hack squat': 'Agachamento Hack (Máquina)',
  'sled 45° leg press': 'Leg Press 45° (Máquina)',
  'sled 45 degrees leg press': 'Leg Press 45° (Máquina)',
  'lever seated leg press': 'Leg Press Horizontal (Máquina)',
  'lever leg extension': 'Cadeira Extensora (Máquina)',
  'lever lying leg curl': 'Mesa Flexora (Máquina)',
  'machine lying leg curl': 'Mesa Flexora (Máquina)',
  'lever seated leg curl': 'Cadeira Flexora (Máquina)',
  'barbell glute bridge': 'Ponte de Glúteos (Barra)',
  'barbell hip thrust': 'Elevação Pélvica / Hip Thrust (Barra)',
  'dumbbell lunge': 'Avanço / Passada (Halteres)',
  'barbell lunge': 'Avanço / Passada (Barra)',
  'dumbbellgoblet squat': 'Agachamento Goblet (Halter)',
  'dumbbell goblet squat': 'Agachamento Goblet (Halter)',
  'kettlebell swing': 'Kettlebell Swing',
  'barbell standing military press': 'Desenvolvimento Militar em Pé (Barra)',
  'dumbbell seated shoulder press': 'Desenvolvimento Sentado (Halteres)',
  'dumbbell arnold press': 'Desenvolvimento Arnold (Halteres)',
  'lever shoulder press': 'Desenvolvimento de Ombros (Máquina)',
  'smith shoulder press': 'Desenvolvimento de Ombros (Smith)',
  'dumbbell lateral raise': 'Elevação Lateral (Halteres)',
  'cable lateral raise': 'Elevação Lateral (Polia)',
  'dumbbell front raise': 'Elevação Frontal (Halteres)',
  'barbell front raise': 'Elevação Frontal (Barra)',
  'cable front raise': 'Elevação Frontal (Polia)',
  'dumbbell rear delt raise': 'Crucifixo Inverso (Halteres)',
  'lever seated reverse fly': 'Crucifixo Inverso (Máquina)',
  'barbell upright row': 'Remada Alta (Barra)',
  'cable upright row': 'Remada Alta (Polia)',
  'barbell shrug': 'Encolhimento de Ombros (Barra)',
  'dumbbell shrug': 'Encolhimento de Ombros (Halteres)',
  'barbell curl': 'Rosca Direta (Barra)',
  'ez barbell curl': 'Rosca Direta (Barra W)',
  'ez bar curl': 'Rosca Direta (Barra W)',
  'dumbbell biceps curl': 'Rosca Direta (Halteres)',
  'dumbbell alternate biceps curl': 'Rosca Alternada (Halteres)',
  'dumbbell incline curl': 'Rosca Inclinada (Halteres)',
  'dumbbell incline biceps curl': 'Rosca Inclinada (Halteres)',
  'dumbbell hammer curl': 'Rosca Martelo (Halteres)',
  'cable hammer curl': 'Rosca Martelo (Polia)',
  'dumbbell concentration curl': 'Rosca Concentrada (Halter)',
  'barbell preacher curl': 'Rosca Scott (Barra)',
  'ez barbell preacher curl': 'Rosca Scott (Barra W)',
  'dumbbell preacher curl': 'Rosca Scott Unilateral (Halter)',
  'lever preacher curl': 'Rosca Scott (Máquina)',
  'cable curl': 'Rosca Bíceps (Polia)',
  'barbell reverse curl': 'Rosca Inversa (Barra)',
  'barbell wrist curl': 'Rosca Punho (Barra)',
  'dumbbell wrist curl': 'Rosca Punho (Halteres)',
  'cable pushdown': 'Tríceps Pulley (Polia)',
  'cable triceps pushdown': 'Tríceps Pulley (Polia)',
  'cable rope triceps pushdown': 'Tríceps Pulley Corda (Polia)',
  'barbell lying triceps extension': 'Tríceps Testa (Barra)',
  'ez barbell lying triceps extension': 'Tríceps Testa (Barra W)',
  'dumbbell lying triceps extension': 'Tríceps Testa (Halteres)',
  'dumbbell seated triceps extension': 'Tríceps Francês Sentado (Halter)',
  'cable overhead triceps extension': 'Tríceps Francês (Polia)',
  'dumbbell kickback': 'Tríceps Coice (Halter)',
  'lever seated calf raise': 'Panturrilha Sentado (Máquina)',
  'lever standing calf raise': 'Panturrilha em Pé (Máquina)',
  'smith standing leg calf raise': 'Panturrilha em Pé (Smith)',
  'seated calf stretch': 'Alongamento de Panturrilha Sentado',
  'cable kneeling crunch': 'Abdominal Supra Ajoelhado (Polia)',
  'assisted hanging knee raise': 'Elevação de Joelhos na Barra (Assistido)',
  'hanging leg raise': 'Elevação de Pernas na Barra Fixa',
  'hanging knee raise': 'Elevação de Joelhos na Barra Fixa',
  'upward facing dog': 'Postura do Cachorro Olhando para Cima (Alongamento)',
  'isometric wipers': 'Limpador de Para-brisa Isométrico (Core)',
};

/**
 * Traduz qualquer nome de exercício em inglês da ExerciseDB para Português Brasileiro (pt-BR)
 * mantendo a nomenclatura natural de academia.
 */
export function translateExerciseNamePtBr(
  rawName: string,
  equipment?: EquipmentType
): string {
  const clean = rawName.trim().replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();

  if (EXACT_NAME_TRANSLATIONS[lower]) {
    return EXACT_NAME_TRANSLATIONS[lower];
  }

  // Remove prefixos de equipamento do texto para adicioná-los no final entre parênteses
  let working = lower;
  let detectedEquipLabel = '';

  const equipPrefixes: [RegExp, string][] = [
    [/^ez[- ]barbell\b\s*/i, 'Barra W'],
    [/^ez[- ]bar\b\s*/i, 'Barra W'],
    [/^olympic barbell\b\s*/i, 'Barra Olímpica'],
    [/^trap bar\b\s*/i, 'Barra Hexagonal'],
    [/^barbell\b\s*/i, 'Barra'],
    [/^dumbbell\b\s*/i, 'Halteres'],
    [/^kettlebell\b\s*/i, 'Kettlebell'],
    [/^cable\b\s*/i, 'Polia'],
    [/^smith machine\b\s*/i, 'Smith'],
    [/^smith\b\s*/i, 'Smith'],
    [/^lever\b\s*/i, 'Máquina'],
    [/^leverage machine\b\s*/i, 'Máquina'],
    [/^machine\b\s*/i, 'Máquina'],
    [/^sled\b\s*/i, 'Máquina'],
    [/^resistance band\b\s*/i, 'Elástico'],
    [/^band\b\s*/i, 'Elástico'],
    [/^suspension\b\s*/i, 'Fita de Suspensão'],
    [/^medicine ball\b\s*/i, 'Medicine Ball'],
    [/^stability ball\b\s*/i, 'Bola Suíça'],
    [/^bosu ball\b\s*/i, 'Bosu'],
    [/^bodyweight\b\s*/i, 'Peso Corporal'],
  ];

  for (const [regex, label] of equipPrefixes) {
    if (regex.test(working)) {
      working = working.replace(regex, '').trim();
      detectedEquipLabel = label;
      break;
    }
  }

  if (!detectedEquipLabel && equipment && equipment !== 'other' && equipment !== 'bodyweight') {
    detectedEquipLabel = EQUIPMENT_LABELS[equipment];
  }

  // Substituições de movimentos compostos (do mais específico para o mais geral)
  const phraseReplacements: [RegExp, string][] = [
    [/\bincline bench press\b/gi, 'Supino Inclinado'],
    [/\bdecline bench press\b/gi, 'Supino Declinado'],
    [/\bclose[- ]grip bench press\b/gi, 'Supino Pegada Fechada'],
    [/\bwide[- ]grip bench press\b/gi, 'Supino Pegada Aberta'],
    [/\breverse[- ]grip bench press\b/gi, 'Supino Pegada Supinada'],
    [/\bbench press\b/gi, 'Supino Reto'],
    [/\bchest press\b/gi, 'Supino'],
    [/\bfloor press\b/gi, 'Supino no Solo'],
    [/\bincline fly(es)?\b/gi, 'Crucifixo Inclinado'],
    [/\bdecline fly(es)?\b/gi, 'Crucifixo Declinado'],
    [/\breverse fly(es)?\b/gi, 'Crucifixo Inverso'],
    [/\brear delt fly(es)?\b/gi, 'Crucifixo Inverso'],
    [/\brear delt raise(s)?\b/gi, 'Elevação Posterior de Ombros'],
    [/\brear delt row(s)?\b/gi, 'Remada para Deltoide Posterior'],
    [/\bchest fly(es)?\b/gi, 'Crucifixo'],
    [/\bfly(es)?\b/gi, 'Crucifixo'],
    [/\bcrossover\b/gi, 'Crossover'],
    [/\bpullover\b/gi, 'Pullover'],
    [/\blat pulldown(s)?\b/gi, 'Puxada Alta'],
    [/\bpulldown(s)?\b/gi, 'Puxada na Polia'],
    [/\bpull[- ]up(s)?\b/gi, 'Barra Fixa Pronada'],
    [/\bchin[- ]up(s)?\b/gi, 'Barra Fixa Supinada'],
    [/\bmuscle[- ]up(s)?\b/gi, 'Muscle-Up na Barra'],
    [/\bbent[- ]over row(s)?\b/gi, 'Remada Curvada'],
    [/\bupright row(s)?\b/gi, 'Remada Alta'],
    [/\bseated row(s)?\b/gi, 'Remada Sentada'],
    [/\bt[- ]bar row(s)?\b/gi, 'Remada Cavalinho'],
    [/\bpendlay row(s)?\b/gi, 'Remada Pendlay'],
    [/\binverted row(s)?\b/gi, 'Remada Australiana'],
    [/\brenegade row(s)?\b/gi, 'Remada Renegade'],
    [/\brow(s)?\b/gi, 'Remada'],
    [/\bromanian deadlift(s)?\b/gi, 'Stiff / Terra Romeno'],
    [/\bstiff[- ]leg(ged)? deadlift(s)?\b/gi, 'Stiff'],
    [/\bsumo deadlift(s)?\b/gi, 'Levantamento Terra Sumô'],
    [/\bdeadlift(s)?\b/gi, 'Levantamento Terra'],
    [/\bgood morning(s)?\b/gi, 'Bom Dia (Lombar/Posterior)'],
    [/\bhyperextension(s)?\b/gi, 'Extensão Lombar'],
    [/\bback extension(s)?\b/gi, 'Extensão Lombar'],
    [/\bbulgarian split squat(s)?\b/gi, 'Agachamento Búlgaro'],
    [/\bsplit squat(s)?\b/gi, 'Afundo / Agachamento Unilateral'],
    [/\bfront squat(s)?\b/gi, 'Agachamento Frontal'],
    [/\bhack squat(s)?\b/gi, 'Agachamento Hack'],
    [/\bgoblet squat(s)?\b/gi, 'Agachamento Goblet'],
    [/\bsumo squat(s)?\b/gi, 'Agachamento Sumô'],
    [/\boverhead squat(s)?\b/gi, 'Agachamento Overhead'],
    [/\bsissy squat(s)?\b/gi, 'Agachamento Sissy'],
    [/\bzercher squat(s)?\b/gi, 'Agachamento Zercher'],
    [/\bpistol squat(s)?\b/gi, 'Agachamento Pistol Unilateral'],
    [/\bjump squat(s)?\b/gi, 'Agachamento com Salto'],
    [/\bsquat(s)?\b/gi, 'Agachamento'],
    [/\b45° leg press\b/gi, 'Leg Press 45°'],
    [/\b45 degrees leg press\b/gi, 'Leg Press 45°'],
    [/\bleg press\b/gi, 'Leg Press'],
    [/\bleg extension(s)?\b/gi, 'Cadeira Extensora'],
    [/\blying leg curl(s)?\b/gi, 'Mesa Flexora'],
    [/\bseated leg curl(s)?\b/gi, 'Cadeira Flexora'],
    [/\bstanding leg curl(s)?\b/gi, 'Flexora em Pé'],
    [/\bleg curl(s)?\b/gi, 'Flexora de Pernas'],
    [/\bhamstring curl(s)?\b/gi, 'Flexão de Posterior'],
    [/\bhip thrust(s)?\b/gi, 'Elevação Pélvica'],
    [/\bglute bridge(s)?\b/gi, 'Ponte de Glúteos'],
    [/\bwalking lunge(s)?\b/gi, 'Passada / Avanço Caminhando'],
    [/\breverse lunge(s)?\b/gi, 'Afundo Reverso'],
    [/\brear lunge(s)?\b/gi, 'Afundo Reverso'],
    [/\bside lunge(s)?\b/gi, 'Afundo Lateral'],
    [/\blateral lunge(s)?\b/gi, 'Afundo Lateral'],
    [/\blunge(s)?\b/gi, 'Avanço / Afundo'],
    [/\bstep[- ]up(s)?\b/gi, 'Subida no Banco (Step-Up)'],
    [/\bstanding calf raise(s)?\b/gi, 'Panturrilha em Pé'],
    [/\bseated calf raise(s)?\b/gi, 'Panturrilha Sentado'],
    [/\bdonkey calf raise(s)?\b/gi, 'Panturrilha Burrinho'],
    [/\bcalf raise(s)?\b/gi, 'Elevação de Panturrilha'],
    [/\bcalf press\b/gi, 'Panturrilha no Leg Press'],
    [/\bcalf stretch\b/gi, 'Alongamento de Panturrilha'],
    [/\barnold press\b/gi, 'Desenvolvimento Arnold'],
    [/\bmilitary press\b/gi, 'Desenvolvimento Militar'],
    [/\bshoulder press\b/gi, 'Desenvolvimento de Ombros'],
    [/\boverhead press\b/gi, 'Desenvolvimento Acima da Cabeça'],
    [/\bbradford rocky press\b/gi, 'Desenvolvimento Bradford'],
    [/\bbradford press\b/gi, 'Desenvolvimento Bradford'],
    [/\bpush press\b/gi, 'Desenvolvimento Push Press'],
    [/\blateral raise(s)?\b/gi, 'Elevação Lateral'],
    [/\bfront raise(s)?\b/gi, 'Elevação Frontal'],
    [/\bface pull(s)?\b/gi, 'Face Pull'],
    [/\bshrug(s)?\b/gi, 'Encolhimento de Ombros'],
    [/\bpreacher curl(s)?\b/gi, 'Rosca Scott'],
    [/\bhammer curl(s)?\b/gi, 'Rosca Martelo'],
    [/\bconcentration curl(s)?\b/gi, 'Rosca Concentrada'],
    [/\bspider curl(s)?\b/gi, 'Rosca Spider'],
    [/\bzottman curl(s)?\b/gi, 'Rosca Zottman'],
    [/\breverse curl(s)?\b/gi, 'Rosca Inversa'],
    [/\bwrist curl(s)?\b/gi, 'Rosca Punho'],
    [/\bbiceps? curl(s)?\b/gi, 'Rosca Bíceps'],
    [/\bcurl(s)?\b/gi, 'Rosca'],
    [/\btriceps? pushdown(s)?\b/gi, 'Tríceps Pulley'],
    [/\bpushdown(s)?\b/gi, 'Tríceps Pulley'],
    [/\blyings? triceps? extension(s)?\b/gi, 'Tríceps Testa'],
    [/\bskull\s?crusher(s)?\b/gi, 'Tríceps Testa'],
    [/\boverhead triceps? extension(s)?\b/gi, 'Tríceps Francês'],
    [/\bseated triceps? extension(s)?\b/gi, 'Tríceps Francês Sentado'],
    [/\btriceps? extension(s)?\b/gi, 'Extensão de Tríceps'],
    [/\btriceps? kickback(s)?\b/gi, 'Tríceps Coice'],
    [/\bkickback(s)?\b/gi, 'Coice (Glúteo / Tríceps)'],
    [/\bbench dip(s)?\b/gi, 'Mergulho no Banco'],
    [/\bdip(s)?\b/gi, 'Paralelas / Mergulho'],
    [/\bpush[- ]up(s)?\b/gi, 'Flexão de Braços'],
    [/\bhanging leg raise(s)?\b/gi, 'Elevação de Pernas na Barra'],
    [/\bhanging knee raise(s)?\b/gi, 'Elevação de Joelhos na Barra'],
    [/\bleg raise(s)?\b/gi, 'Elevação de Pernas (Infra)'],
    [/\bknee raise(s)?\b/gi, 'Elevação de Joelhos'],
    [/\brussian twist(s)?\b/gi, 'Giro Russo (Oblíquos)'],
    [/\bbicycle crunch(es)?\b/gi, 'Abdominal Bicicleta'],
    [/\bcrunch(es)?\b/gi, 'Abdominal Supra'],
    [/\bsit[- ]up(s)?\b/gi, 'Abdominal Completo'],
    [/\bplank\b/gi, 'Prancha Abdominal'],
    [/\bside plank\b/gi, 'Prancha Lateral'],
    [/\brollout(s)?\b/gi, 'Extensão na Roda Abdominal'],
    [/\bmountain climber(s)?\b/gi, 'Escalador (Mountain Climber)'],
    [/\bjumping jack(s)?\b/gi, 'Polichinelo'],
    [/\bburpee(s)?\b/gi, 'Burpee'],
    [/\bhip abduction\b/gi, 'Abdução de Quadril'],
    [/\bhip adduction\b/gi, 'Adução de Quadril'],
    [/\bclean and press\b/gi, 'Arremesso e Desenvolvimento'],
    [/\bclean and jerk\b/gi, 'Arremesso Olímpico (Clean & Jerk)'],
    [/\bpower clean\b/gi, 'Power Clean'],
    [/\bsnatch\b/gi, 'Arranco (Snatch)'],
    [/\bthruster(s)?\b/gi, 'Thruster'],
    [/\bfarmer('?s)? walk\b/gi, 'Caminhada do Fazendeiro'],
  ];

  for (const [regex, replacement] of phraseReplacements) {
    working = working.replace(regex, replacement);
  }

  // Tradução de modificadores de postura, pegada e direção
  const modifierReplacements: [RegExp, string][] = [
    [/\bincline\b/gi, 'Inclinado'],
    [/\bdecline\b/gi, 'Declinado'],
    [/\bseated\b/gi, 'Sentado'],
    [/\bstanding\b/gi, 'em Pé'],
    [/\blying\b/gi, 'Deitado'],
    [/\bkneeling\b/gi, 'Ajoelhado'],
    [/\bsingle[- ]arm\b/gi, 'Unilateral'],
    [/\bone[- ]arm\b/gi, 'Unilateral'],
    [/\bsingle[- ]leg\b/gi, 'Unilateral'],
    [/\bone[- ]leg\b/gi, 'Unilateral'],
    [/\balternating\b/gi, 'Alternado'],
    [/\balternate\b/gi, 'Alternado'],
    [/\bwide[- ]grip\b/gi, 'Pegada Aberta'],
    [/\bwide\b/gi, 'Aberto'],
    [/\bclose[- ]grip\b/gi, 'Pegada Fechada'],
    [/\bnarrow[- ]grip\b/gi, 'Pegada Fechada'],
    [/\breverse[- ]grip\b/gi, 'Pegada Inversa'],
    [/\bunderhand\b/gi, 'Pegada Supinada'],
    [/\boverhand\b/gi, 'Pegada Pronada'],
    [/\bneutral[- ]grip\b/gi, 'Pegada Neutra'],
    [/\bbehind[- ]neck\b/gi, 'Por Trás da Nuca'],
    [/\blow[- ]pulley\b/gi, 'Polia Baixa'],
    [/\bhigh[- ]pulley\b/gi, 'Polia Alta'],
    [/\bassisted\b/gi, 'Assistido'],
    [/\bweighted\b/gi, 'com Carga'],
    [/\bisometric\b/gi, 'Isométrico'],
    [/\bstretch\b/gi, 'Alongamento'],
    [/\bpress\b/gi, 'Pressão / Desenvolvimento'],
    [/\braise\b/gi, 'Elevação'],
    [/\bextension\b/gi, 'Extensão'],
    [/\bflexion\b/gi, 'Flexão'],
    [/\brope\b/gi, 'com Corda'],
    [/\bv[- ]bar\b/gi, 'Barra V'],
    [/\bstraight[- ]arm\b/gi, 'Braços Estendidos'],
    [/\binside leg kick\b/gi, 'com Chute Interno'],
  ];

  for (const [regex, replacement] of modifierReplacements) {
    working = working.replace(regex, replacement);
  }

  // Capitaliza primeira letra de cada palavra relevante
  const formatted = working
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, idx) => {
      const lowerWord = word.toLowerCase();
      if (
        idx > 0 &&
        ['de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'com', 'para', 'e'].includes(
          lowerWord
        )
      ) {
        return lowerWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  if (detectedEquipLabel && !formatted.includes(`(${detectedEquipLabel})`)) {
    return `${formatted} (${detectedEquipLabel})`;
  }

  return formatted;
}

/**
 * Traduz as instruções passo a passo da ExerciseDB ("Step:1 ...") para Português (pt-BR)
 */
export function translateInstructionsPtBr(instructions?: string[]): string[] {
  if (!instructions || instructions.length === 0) return [];

  const sentenceReplacements: [RegExp, string][] = [
    [/^Step\s*:\s*\d+\s*/i, ''],
    [/\bSettle onto a bench with your feet planted\b/gi, 'Posicione-se no banco com os pés firmes no chão'],
    [/\bTake a seat on (a|the) (bench|machine|chair|edge of a chair or bench)\b/gi, 'Sente-se no banco ou equipamento'],
    [/\bPosition yourself face down on the (floor|machine)\b/gi, 'Posicione-se de bruços no apoio'],
    [/\bSuspend yourself from a pull-up bar with your arms straight\b/gi, 'Segure na barra fixa com os braços estendidos'],
    [/\bBegin in a push-up position with your hands just beyond shoulder width\b/gi, 'Inicie na posição de flexão com as mãos pouco além da largura dos ombros'],
    [/\bBegin by lying flat on your back on a mat or bench\b/gi, 'Deite-se de costas no colchonete ou banco'],
    [/\bStand and set your feet about shoulder width\b/gi, 'Fique em pé com os pés afastados na largura dos ombros'],
    [/\bSet the machine to fit your body and select the desired weight\b/gi, 'Ajuste a máquina para a sua estatura e selecione a carga desejada'],
    [/\bSet the seat and footplate of the sled machine to a comfortable position\b/gi, 'Ajuste o assento e a plataforma para uma posição confortável'],
    [/\bSet the cable pulleys to chest height\b/gi, 'Ajuste as polias na altura do peitoral'],
    [/\bTake hold of the barbell with palms facing down, just beyond shoulder width\b/gi, 'Segure a barra com pegada pronada, pouco além da largura dos ombros'],
    [/\bHold the barbell with palms facing down\b/gi, 'Segure a barra com as palmas voltadas para frente/baixo'],
    [/\bwith your feet planted\b/gi, 'com os pés firmemente apoiados no chão'],
    [/\bwith your back straight\b/gi, 'com a coluna alinhada'],
    [/\band your core engaged\b/gi, 'e o abdômen contraído'],
    [/\bwith your spine steady\b/gi, 'mantendo a coluna estável'],
    [/\bBrace your trunk muscles\b/gi, 'Contraia a musculatura do core (abdômen e lombar)'],
    [/\bBrace the abdomen and glutes\b/gi, 'Contraia o abdômen e os glúteos'],
    [/\bBrace the abdomen\b/gi, 'Estabilize o abdômen'],
    [/\bBrace the torso and align the wrists with the forearms\b/gi, 'Estabilize o tronco e mantenha os punhos alinhados aos antebraços'],
    [/\bPress the weight or handles away while keeping your trunk braced\b/gi, 'Empurre a carga mantendo o tronco firme e estabilizado'],
    [/\bLower the weight to its starting height under control before pressing again\b/gi, 'Desça a carga até a posição inicial de forma controlada antes da próxima repetição'],
    [/\bBring the weight or body back to its starting position without rushing\b/gi, 'Retorne à posição inicial de forma controlada, sem pressa'],
    [/\bBend your elbows to lower your chest while keeping your body in one line\b/gi, 'Flexione os cotovelos para descer o peitoral mantendo o corpo alinhado'],
    [/\bPress back to straight arms, keeping the body line intact\b/gi, 'Empurre de volta até estender os braços mantendo o alinhamento corporal'],
    [/\bKeep a soft elbow bend\b/gi, 'Mantenha uma leve flexão nos cotovelos'],
    [/\bBring the handles across the front of your chest in a broad arc\b/gi, 'Traga os pegadores à frente do peitoral em um movimento de arco amplo'],
    [/\bOpen the arms back along the same arc without dropping the load\b/gi, 'Retorne abrindo os braços pelo mesmo arco sem soltar o peso de vez'],
    [/\bBend your knees to draw the pad toward you without lifting your hips from the support\b/gi, 'Flexione os joelhos puxando o apoio sem tirar o quadril do banco'],
    [/\bKeep the hips still while the knees bend\b/gi, 'Mantenha o quadril fixo enquanto flexiona os joelhos'],
    [/\bEase back to the start before repeating\b/gi, 'Retorne controladamente ao início antes de repetir'],
    [/\bLower the legs slowly without swinging or losing your trunk position\b/gi, 'Desça as pernas devagar sem balançar ou perder a postura do tronco'],
    [/\bSettle into the starting position and take an easy breath\b/gi, 'Posicione-se na postura inicial e respire fundo'],
    [/\bHold the position with steady breathing, then release gently\b/gi, 'Sustente a posição respirando de forma constante e retorne devagar'],
    [/\bStop the descent before the hips lift from the seat\b/gi, 'Pare a descida antes que o quadril desencoste do assento'],
    [/\bBend the knees to bring the platform toward you, then press it away through the feet\b/gi, 'Flexione os joelhos descendo a plataforma e depois empurre com força pelos pés'],
  ];

  return instructions
    .map((rawStep) => {
      let step = rawStep.trim();
      for (const [regex, replacement] of sentenceReplacements) {
        step = step.replace(regex, replacement);
      }
      return step.trim();
    })
    .filter(Boolean);
}

/**
 * Converte um item bruto da ExerciseDB para o formato Exercise do aplicativo (em pt-BR)
 */
export function convertExerciseDBItem(raw: ExerciseDBRawItem): Exercise {
  const equipment = mapEquipmentToType(raw.equipments, raw.name);
  const primaryMuscle = mapTargetMuscleToGroup(
    raw.targetMuscles,
    raw.bodyParts,
    raw.name
  );
  const secondaryMuscles = mapSecondaryMusclesToGroups(
    raw.secondaryMuscles,
    primaryMuscle
  );
  const measurementType = inferMeasurementType(
    equipment,
    primaryMuscle,
    raw.name
  );
  const titlePt = translateExerciseNamePtBr(raw.name, equipment);
  const instructionsPt = translateInstructionsPtBr(raw.instructions);

  return {
    id: `edb-${raw.exerciseId}`,
    externalId: raw.exerciseId,
    title: titlePt,
    englishTitle: raw.name,
    gifUrl: raw.gifUrl || `https://static.exercisedb.dev/media/${raw.exerciseId}.gif`,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    measurementType,
    instructions:
      instructionsPt.length > 0
        ? instructionsPt
        : [
            `Posicione-se corretamente para executar ${titlePt} mantendo a coluna neutra e o abdômen estabilizado.`,
            'Realize a fase concêntrica (força) com explosão controlada e segure 1 segundo no pico de contração.',
            'Retorne na fase excêntrica (descida) de maneira cadenciada sem perder a tensão muscular.',
          ],
  };
}

/**
 * Dicionário de busca Português -> Inglês para consultar o endpoint /exercises/search da ExerciseDB
 */
const PT_TO_EN_SEARCH_TERMS: [string, string][] = [
  ['supino inclinado', 'incline bench press'],
  ['supino declinado', 'decline bench press'],
  ['supino fechado', 'close grip bench press'],
  ['supino', 'bench press'],
  ['crucifixo inverso', 'reverse fly'],
  ['crucifixo', 'fly'],
  ['voador', 'pec'],
  ['pec deck', 'Seated Fly'],
  ['crossover', 'cable crossover'],
  ['flexão', 'push-up'],
  ['flexao', 'push-up'],
  ['paralelas', 'dip'],
  ['mergulho', 'dip'],
  ['puxada', 'pulldown'],
  ['pulldown', 'pulldown'],
  ['barra fixa', 'pull-up'],
  ['remada curvada', 'bent over row'],
  ['remada cavalinho', 't-bar row'],
  ['remada alta', 'upright row'],
  ['remada baixa', 'seated row'],
  ['remada', 'row'],
  ['serrote', 'one arm row'],
  ['levantamento terra', 'deadlift'],
  ['terra sumô', 'sumo deadlift'],
  ['terra romeno', 'romanian deadlift'],
  ['stiff', 'stiff leg deadlift'],
  ['extensão lombar', 'hyperextension'],
  ['lombar', 'back extension'],
  ['agachamento búlgaro', 'split squat'],
  ['agachamento frontal', 'front squat'],
  ['agachamento hack', 'hack squat'],
  ['agachamento sumô', 'sumo squat'],
  ['agachamento', 'squat'],
  ['leg press', 'leg press'],
  ['cadeira extensora', 'leg extension'],
  ['extensora', 'leg extension'],
  ['mesa flexora', 'lying leg curl'],
  ['cadeira flexora', 'seated leg curl'],
  ['flexora', 'leg curl'],
  ['elevação pélvica', 'hip thrust'],
  ['elevacao pelvica', 'hip thrust'],
  ['ponte de glúteos', 'glute bridge'],
  ['glúteo', 'glute'],
  ['gluteo', 'glute'],
  ['coice', 'kickback'],
  ['avanço', 'lunge'],
  ['avanco', 'lunge'],
  ['passada', 'lunge'],
  ['afundo', 'lunge'],
  ['panturrilha', 'calf raise'],
  ['gêmeos', 'calf'],
  ['desenvolvimento arnold', 'arnold press'],
  ['desenvolvimento', 'shoulder press'],
  ['elevação lateral', 'lateral raise'],
  ['elevacao lateral', 'lateral raise'],
  ['elevação frontal', 'front raise'],
  ['elevacao frontal', 'front raise'],
  ['face pull', 'face pull'],
  ['encolhimento', 'shrug'],
  ['trapézio', 'shrug'],
  ['trapezio', 'shrug'],
  ['rosca scott', 'preacher curl'],
  ['rosca martelo', 'hammer curl'],
  ['rosca inclinada', 'incline curl'],
  ['rosca concentrada', 'concentration curl'],
  ['rosca inversa', 'reverse curl'],
  ['rosca punho', 'wrist curl'],
  ['rosca direta', 'barbell curl'],
  ['rosca', 'curl'],
  ['bíceps', 'biceps curl'],
  ['biceps', 'biceps curl'],
  ['tríceps testa', 'lying triceps extension'],
  ['triceps testa', 'lying triceps extension'],
  ['tríceps francês', 'overhead triceps extension'],
  ['triceps frances', 'overhead triceps extension'],
  ['tríceps pulley', 'triceps pushdown'],
  ['triceps pulley', 'triceps pushdown'],
  ['tríceps corda', 'rope pushdown'],
  ['tríceps', 'triceps'],
  ['triceps', 'triceps'],
  ['antebraço', 'wrist'],
  ['antebraco', 'wrist'],
  ['abdominal', 'crunch'],
  ['prancha', 'plank'],
  ['infra', 'leg raise'],
  ['oblíquo', 'twist'],
  ['peito', 'chest'],
  ['costas', 'row'],
  ['ombro', 'shoulder'],
  ['perna', 'squat'],
];

/**
 * Converte um termo de busca em português para o termo correspondente em inglês para a API ExerciseDB
 */
export function translatePtQueryToEn(query: string): string {
  const clean = query.trim().toLowerCase();
  if (!clean) return '';

  for (const [pt, en] of PT_TO_EN_SEARCH_TERMS) {
    if (clean.includes(pt)) {
      return en;
    }
  }
  return clean;
}

/**
 * Busca exercícios na API ExerciseDB (suporta busca em Português ou Inglês)
 */
export async function searchExerciseDB(query: string): Promise<Exercise[]> {
  const enQuery = translatePtQueryToEn(query);
  if (!enQuery || enQuery.length < 2) return [];

  try {
    const res = await fetch(
      `${API_BASE}/exercises/search?search=${encodeURIComponent(enQuery)}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.data)) return [];

    return json.data.map((item: ExerciseDBRawItem) =>
      convertExerciseDBItem(item)
    );
  } catch {
    return [];
  }
}

/**
 * Busca uma página completa de exercícios da ExerciseDB com todos os detalhes e GIFs
 */
export async function fetchExerciseDBCatalog(
  offset = 0,
  limit = 25
): Promise<{ exercises: Exercise[]; total: number; hasNextPage: boolean }> {
  try {
    const res = await fetch(
      `${API_BASE}/exercises?limit=${limit}&offset=${offset}`
    );
    if (!res.ok) {
      return { exercises: [], total: 0, hasNextPage: false };
    }
    const json = await res.json();
    if (!json?.success || !Array.isArray(json.data)) {
      return { exercises: [], total: 0, hasNextPage: false };
    }

    const exercises = json.data.map((item: ExerciseDBRawItem) =>
      convertExerciseDBItem(item)
    );
    return {
      exercises,
      total: json.meta?.total ?? 1500,
      hasNextPage: Boolean(json.meta?.hasNextPage),
    };
  } catch {
    return { exercises: [], total: 0, hasNextPage: false };
  }
}

/**
 * Busca detalhes completos (músculos + instruções em pt-BR) de um exercício específico da ExerciseDB pelo ID
 */
export async function fetchExerciseDBDetail(
  exerciseId: string
): Promise<Exercise | null> {
  const cleanId = exerciseId.replace(/^edb-/, '');
  try {
    const res = await fetch(`${API_BASE}/exercises/${encodeURIComponent(cleanId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json.data) return null;
    return convertExerciseDBItem(json.data as ExerciseDBRawItem);
  } catch {
    return null;
  }
}
