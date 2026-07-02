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
    desc: "2 roubos",
    info: "Tem vantagem ao usar !roubar e consegue levar uma parte maior do alvo. Se for pego, tambem corre mais risco.",
    salaryRange: [50, 250],
    accidentChance: 15,
    accidentLossRange: [30, 150],
    hint: "Use !roubar e consiga 2 roubos bem-sucedidos.",
    xpGain: 10,
    requirement: [{ type: "robberySuccess", min: 2 }]
  },
  {
    id: 3,
    key: "chefe_do_crime",
    name: "Chefe do Crime",
    desc: "25 roubos",
    info: "Fica no topo do crime do grupo e recebe uma taxa sobre roubos bem-sucedidos feitos por outros membros.",
    hint: "Use !roubar e consiga 25 roubos bem-sucedidos.",
    salaryRange: [70, 350],
    accidentChance: 10,
    accidentLossRange: [50, 200],
    xpGain: 15,
    requirement: [{ type: "robberySuccess", min: 25 }]
  },
  {
    id: 4,
    key: "policia",
    name: "Polícia",
    desc: "2 denúncias",
    info: "Pode prender suspeitos com comando prender e recebe recompensa quando a prisao da certo.",
    hint: "Use !denunciar 2 vezes.",
    salaryRange: [15, 135],
    accidentChance: 15,
    accidentLossRange: [30, 100],
    xpGain: 10,
    requirement: [{ type: "reportsMade", min: 2 }]
  },
  {
    id: 5,
    key: "hacker",
    name: "Hacker",
    desc: "Nível 10",
    info: "Ganha bem ao trabalhar, mas pode sofrer bloqueio de rede e ficar algumas horas sem trabalhar.",
    hint: "Suba para o nivel 10 mandando mensagens e usando comandos no grupo.",
    salaryRange: [80, 550],
    xpGain: 20,
    requirement: [{ type: "level", min: 10 }]
  },
  {
    id: 6,
    key: "medico",
    name: "Médico",
    desc: "Nível 5",
    info: "Recebe um salario alto e mais estavel. Tambem pode ajudar membros com ficha criminal e curar acidentados.",
    hint: "Suba para o nivel 5 mandando mensagens e usando comandos no grupo.",
    salaryRange: [100, 400],
    accidentChance: 15,
    accidentLossRange: [50, 200],
    xpGain: 12,
    requirement: [{ type: "level", min: 5 }]
  },
  {
    id: 7,
    key: "advogado",
    name: "Advogado",
    desc: "50k fyne coins",
    info: "Defende membros do grupo, ganha comissao em fiancas e tem um dos melhores pagamentos.",
    hint: "Junte 50.000 fyne coins usando comandos como !trabalhar, !roubar e !explorar.",
    salaryRange: [100, 600],
    accidentChance: 10,
    accidentLossRange: [50, 250],
    xpGain: 15,
    requirement: [{ type: "money", min: 50000 }]
  },
  {
    id: 8,
    key: "matador",
    name: "Matador (Hitman)",
    desc: "5 roubos e Nível 5",
    info: "Profissao perigosa e lucrativa. Recebe contratos para colocar alvos no hospital.",
    hint: "Consiga 5 roubos bem-sucedidos e alcance o Nível 5.",
    salaryRange: [15, 50],
    accidentChance: 15,
    accidentLossRange: [50, 100],
    xpGain: 15,
    requirement: [{ type: "robberySuccess", min: 5 }, { type: "level", min: 5 }]
  },
  {
    id: 9,
    key: "mecanico",
    name: "Mecânico",
    desc: "Nível 3",
    info: "Conserta a moto de entregadores acidentados e ganha recompensa por isso.",
    hint: "Suba para o nivel 3 enviando mensagens e comandos.",
    salaryRange: [40, 150],
    accidentChance: 15,
    accidentLossRange: [20, 80],
    xpGain: 8,
    requirement: [{ type: "level", min: 3 }]
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
  
  // ✅ PRISÃO EM FLAGRANTE (ROUBO)
  ARREST_JAIL_TIMES: [
    60 * 60 * 1000,        // 1h
    3 * 60 * 60 * 1000,    // 3h
    8 * 60 * 60 * 1000,    // 8h
    12 * 60 * 60 * 1000    // 12h
  ],
  STRIKE_RESET_MS: 24 * 60 * 60 * 1000, // 1 dia

  // ✅ FIANÇA
  BAIL_COSTS: [900, 1800, 3500, 6500, 12000, 20000],

  // ✅ POLÍCIA E !PRENDER
  ARREST_COOLDOWN_MS: 10 * 60 * 1000, // 10 min
  ARREST_CHANCE_BASE: 40,   // %
  ARREST_CHANCE_FRESH: 60,  // % (se roubo foi < 10 min)
  ARREST_CHANCE_LATE: 20,   // % (se roubo foi mais antigo)
  REPORT_WINDOW_MS: 20 * 60 * 1000,   // tem que ser roubo recente
  WANTED_DURATION_MS: 20 * 60 * 1000, // boletim válido por 20 min
  ARREST_JAIL_MS: 60 * 60 * 1000, // 1h (prisão fixa da polícia)
  POLICE_REWARD_RANGE: [30, 100] // Recompensa do policial
};

export function getJobById(id) {
  return JOBS.find(j => j.id === Number(id));
}

export function getJobByKey(key) {
  return JOBS.find(j => j.key === key);
}
