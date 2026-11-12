import { Exercise } from '@/types/workout';

export const EXERCISES_SEED: Exercise[] = [
  {
    id: 'ex-bench-press-barbell',
    title: 'Supino Reto (Barra)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Deite-se no banco reto com os pés firmes no chão e as escápulas retraídas.',
      'Segure a barra com pegada um pouco mais larga que a largura dos ombros.',
      'Desça a barra de forma controlada até tocar a linha média do peitoral.',
      'Empurre a barra até estender os braços mantendo o controle.',
    ],
  },
  {
    id: 'ex-incline-bench-dumbbell',
    title: 'Supino Inclinado (Halteres)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    measurementType: 'weight_reps',
    instructions: [
      'Ajuste o banco em inclinação de 30° a 45°.',
      'Empurre os halteres para cima convergindo levemente e desça alongando o peitoral.',
    ],
  },
  {
    id: 'ex-cable-crossover',
    title: 'Crucifixo no Crossover (Polia)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    measurementType: 'weight_reps',
    instructions: [
      'Posicione as polias no alto e feche os braços à frente do corpo em arco.',
    ],
  },
  {
    id: 'ex-lat-pulldown',
    title: 'Puxada Alta na Polia (Pulldown)',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'upper_back', 'forearms'],
    equipment: 'cable',
    measurementType: 'weight_reps',
    instructions: [
      'Prenda os joelhos sob o apoio e puxe a barra em direção à parte superior do peitoral.',
    ],
  },
  {
    id: 'ex-barbell-row',
    title: 'Remada Curvada (Barra)',
    primaryMuscle: 'upper_back',
    secondaryMuscles: ['lats', 'biceps', 'lower_back', 'traps'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Incline o tronco a 45° mantendo a coluna neutra e puxe a barra em direção ao umbigo.',
    ],
  },
  {
    id: 'ex-seated-cable-row',
    title: 'Remada Baixa Sentada (Polia)',
    primaryMuscle: 'upper_back',
    secondaryMuscles: ['lats', 'biceps', 'traps'],
    equipment: 'cable',
    measurementType: 'weight_reps',
    instructions: [
      'Puxe o triângulo até o abdômen estufando o peito e retraindo as escápulas.',
    ],
  },
  {
    id: 'ex-overhead-press-barbell',
    title: 'Desenvolvimento Militar (Barra)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'upper_back', 'abs'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Empurre a barra verticalmente acima da cabeça mantendo abdômen e glúteos contraídos.',
    ],
  },
  {
    id: 'ex-lateral-raise-dumbbell',
    title: 'Elevação Lateral (Halteres)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['traps'],
    equipment: 'dumbbell',
    measurementType: 'weight_reps',
    instructions: [
      'Eleve os braços no plano escapular até a altura dos ombros e desça sob controle.',
    ],
  },
  {
    id: 'ex-barbell-curl',
    title: 'Rosca Direta (Barra)',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Flexione os cotovelos subindo a barra até a contração máxima do bíceps.',
    ],
  },
  {
    id: 'ex-tricep-pushdown-rope',
    title: 'Tríceps Pulley (Corda)',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    measurementType: 'weight_reps',
    instructions: [
      'Estenda os antebraços para baixo abrindo as pontas da corda no final.',
    ],
  },
  {
    id: 'ex-squat-barbell',
    title: 'Agachamento Livre (Barra)',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'lower_back', 'abs'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Inspire, trave o core e agache até quebrar a paralela mantendo os joelhos alinhados.',
    ],
  },
  {
    id: 'ex-leg-press-45',
    title: 'Leg Press 45°',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'machine',
    measurementType: 'weight_reps',
    instructions: [
      'Desça a plataforma até ~90° sem tirar o quadril do banco e empurre.',
    ],
  },
  {
    id: 'ex-romanian-deadlift',
    title: 'Stiff / Terra Romeno (Barra)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'lower_back', 'forearms'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Empurre o quadril para trás deslizando a barra pelas coxas e suba contraindo glúteos.',
    ],
  },
  {
    id: 'ex-hip-thrust-barbell',
    title: 'Elevação Pélvica (Barra)',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'quads'],
    equipment: 'barbell',
    measurementType: 'weight_reps',
    instructions: [
      'Empurre pelos calcanhares até alinhar o quadril e contraia os glúteos no topo.',
    ],
  },
  {
    id: 'ex-standing-calf-raise',
    title: 'Panturrilha em Pé',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: 'machine',
    measurementType: 'weight_reps',
    instructions: [
      'Realize amplitude máxima alongando no fundo e contraindo no topo.',
    ],
  },
];
