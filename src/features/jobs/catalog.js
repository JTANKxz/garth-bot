/**
 * src/features/jobs/catalog.js
 * Centralização de todos os empregos e constantes de economia do bot.
 */

export const JOBS = [
  {
    id: 1,
    key: "entregador",
    name: "Entregador",
    desc: "Trabalho honesto. Ganho estável com chance de acidente.",
    category: "legal",
    salaryRange: [20, 100],
    accidentChance: 20,
    accidentLossRange: [20, 120],
    xpGain: 5,
    requirement: null
  },
  {
    id: 2,
    key: "ladrao",
    name: "Ladrão",
    desc: "Rouba melhor (+chance/+%) mas corre mais risco de prisão.",
    category: "illegal",
    xpGain: 10,
    requirement: { type: "robberySuccess", min: 2 }
  },
  {
    id: 3,
    key: "chefe_do_crime",
    name: "Chefe do Crime",
    desc: "Recebe uma taxa dos roubos bem-sucedidos do grupo.",
    category: "illegal",
    xpGain: 15,
    requirement: { type: "robberySuccess", min: 25 }
  },
  {
    id: 4,
    key: "policia",
    name: "Polícia",
    desc: "Pode prender suspeitos denunciados e recebe recompensas.",
    category: "legal",
    salaryRange: [15, 60],
    xpGain: 6,
    requirement: { type: "reportsMade", min: 2 }
  },
  {
    id: 5,
    key: "hacker",
    name: "Hacker",
    desc: "Realiza ataques cibernéticos. Ganho alto, mas risco de bloqueio de rede.",
    category: "illegal",
    salaryRange: [80, 250],
    xpGain: 20,
    requirement: { type: "level", min: 10 }
  },
  {
    id: 6,
    key: "medico",
    name: "Médico",
    desc: "Salário alto e estável. Pode curar fichas criminais.",
    category: "legal",
    salaryRange: [150, 400],
    xpGain: 12,
    requirement: { type: "level", min: 5 }
  },
  {
    id: 7,
    key: "advogado",
    name: "Advogado",
    desc: "Ganhe comissão sobre fianças pagas no grupo.",
    category: "legal",
    salaryRange: [100, 300],
    xpGain: 15,
    requirement: { type: "money", min: 50000 }
  }
];

export const ECONOMY_CONFIG = {
  QUIT_COOLDOWN_MS: 12 * 60 * 60 * 1000, // 12h
  WORK_COOLDOWN_MS: 30 * 60 * 1000,      // 30min
  JAIL_FINE_PERCENT: 5,
  JAIL_FINE_MIN: 150,
  JAIL_FINE_MAX: 2000,
  BOSS_TAX_RANGE: [2, 10],

  // ✅ ROUBO
  ROUBO_COOLDOWN_MS: 5 * 60 * 1000,
  JAIL_CHANCE_ON_SUCCESS: 20,
  JAIL_CHANCE_ON_FAIL: 30,
  THIEF_SUCCESS_BONUS: 10,
  THIEF_ROB_PERCENT: 0.10,
  NORMAL_ROB_PERCENT: 0.08,
  POLICE_REWARD_RANGE: [10, 60]
};

export function getJobById(id) {
  return JOBS.find(j => j.id === Number(id));
}

export function getJobByKey(key) {
  return JOBS.find(j => j.key === key);
}
