import fs from "fs";
import path from "path";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const dbJobsPath  = path.resolve("src/database/jobs.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try { return JSON.parse(fs.readFileSync(filePath)); } catch { return {}; }
}
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function formatMoney(v) { return v.toLocaleString("pt-BR"); }

const CONSERTO_WINDOW_MS = 15 * 60 * 1000; // 15 min apos acidente

export default {
  name: "consertar",
  aliases: ["consertar"],
  description: "Mecanico conserta a moto de um entregador acidentado",
  category: "fun",

  async run({ sock, msg }) {
    const from   = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const now    = Date.now();

    // Só mecanico pode usar
    const jobsDB = loadJSON(dbJobsPath);
    const myJob  = jobsDB[from]?.[sender]?.job;
    if (myJob !== "mecanico") {
      return sock.sendMessage(from, { text: `🔧 Apenas *Mecânicos* podem usar !consertar.` }, { quoted: msg });
    }

    // Precisa de menção
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentioned[0];
    if (!alvo || alvo === sender) {
      return sock.sendMessage(from, { text: `💡 Use: *!consertar @entregador*` }, { quoted: msg });
    }

    // Verifica se o alvo e entregador
    const alvoJob = jobsDB[from]?.[alvo]?.job;
    if (alvoJob !== "entregador") {
      return sock.sendMessage(from, { text: `❌ @${alvo.split("@")[0]} não é um *Entregador*.`, mentions: [alvo] }, { quoted: msg });
    }

    const luckyDB = loadJSON(dbLuckyPath);
    const vitima  = luckyDB[from]?.[alvo];

    // Verifica se teve acidente recente (máx 15 min atrás)
    if (!vitima?.lastAccidentAt || now - vitima.lastAccidentAt > CONSERTO_WINDOW_MS) {
      return sock.sendMessage(from, {
        text: `🔧 @${alvo.split("@")[0]} não teve nenhum acidente recente ou o prazo de conserto já expirou (máximo 15 minutos após o acidente).`,
        mentions: [alvo]
      }, { quoted: msg });
    }

    // Verifica se ja foi reparado
    if (vitima.consertado) {
      return sock.sendMessage(from, {
        text: `🏍️ A moto de @${alvo.split("@")[0]} já foi consertada por um mecânico!`,
        mentions: [alvo]
      }, { quoted: msg });
    }

    // Conserta: devolve o valor do acidente ao entregador
    const repair = vitima.lastAccidentLoss || 0;
    luckyDB[from][alvo].money = (vitima.money || 0) + repair;
    luckyDB[from][alvo].consertado = true;

    // Mecânico recebe comissão da prefeitura
    if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
    const comissao = Math.floor(repair * 0.35) + 80;
    luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + comissao;

    saveJSON(dbLuckyPath, luckyDB);

    const text =
      `🔧 *MOTO CONSERTADA!*\n\n` +
      `@${sender.split("@")[0]} chegou com a caixa de ferramentas e remendou a moto de @${alvo.split("@")[0]}!\n\n` +
      `🏍️ O entregador recuperou *${formatMoney(repair)} fyne coins* do conserto!\n` +
      `💰 O mecânico recebeu *${formatMoney(comissao)} fyne coins* da prefeitura pelo serviço!`;

    await sock.sendMessage(from, { text, mentions: [sender, alvo] }, { quoted: msg });
  }
}
