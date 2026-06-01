/**
 * src/features/jobs/catalog.js
 * Centralização de todos os empregos e constantes de economia do bot.
 */

export const JOBS = [
  {
    id: 1,
    key: "entregador",
    name: "Entregador",
    desc: "Sem requisitos",
    info: "Faz entregas e recebe um pagamento variavel a cada trabalho. Pode sofrer acidente e perder uma parte do dinheiro.",
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
    desc: "2 roubos bem-sucedidos",
    info: "Tem vantagem ao usar !roubar e consegue levar uma parte maior do alvo. Se for pego, tambem corre mais risco.",
    hint: "Use !roubar e consiga 2 roubos bem-sucedidos.",
    xpGain: 10,
    requirement: { type: "robberySuccess", min: 2 }
  },
  {
    id: 3,
    key: "chefe_do_crime",
    name: "Chefe do Crime",
    desc: "25 roubos bem-sucedidos",
    info: "Fica no topo do crime do grupo e recebe uma taxa sobre roubos bem-sucedidos feitos por outros membros.",
    hint: "Use !roubar e consiga 25 roubos bem-sucedidos.",
    xpGain: 15,
    requirement: { type: "robberySuccess", min: 25 }
  },
  {
    id: 4,
    key: "policia",
    name: "Polícia",
    desc: "2 denúncias feitas",
    info: "Pode prender suspeitos com !prender e recebe recompensa quando a prisao da certo.",
    hint: "Use !denunciar 2 vezes.",
    salaryRange: [15, 60],
    xpGain: 6,
    requirement: { type: "reportsMade", min: 2 }
  },
  {
    id: 5,
    key: "hacker",
    name: "Hacker",
    desc: "Nível 10",
    info: "Ganha bem ao trabalhar, mas pode sofrer bloqueio de rede e ficar algumas horas sem trabalhar.",
    hint: "Suba para o nivel 10 mandando mensagens e usando comandos no grupo.",
    salaryRange: [80, 250],
    xpGain: 20,
    requirement: { type: "level", min: 10 }
  },
  {
    id: 6,
    key: "medico",
    name: "Médico",
    desc: "Nível 5",
    info: "Recebe um salario alto e mais estavel. Tambem pode ajudar membros com ficha criminal.",
    hint: "Suba para o nivel 5 mandando mensagens e usando comandos no grupo.",
    salaryRange: [150, 400],
    xpGain: 12,
    requirement: { type: "level", min: 5 }
  },
  {
    id: 7,
    key: "advogado",
    name: "Advogado",
    desc: "50.000 fyne coins",
    info: "Defende membros do grupo, ganha comissao em fiancas e tem um dos melhores pagamentos.",
    hint: "Junte 50.000 fyne coins usando comandos como !trabalhar, !roubar e !explorar.",
    salaryRange: [100, 300],
    xpGain: 15,
    requirement: { type: "money", min: 50000 }
  }
];

export const ECONOMY_CONFIG = {
  QUIT_COOLDOWN_MS: 4 * 60 * 60 * 1000, // 4h
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
