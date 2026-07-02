import fs from "fs";
import path from "path";

const dbLuckyPath     = path.resolve("src/database/lucky.json");
const dbJobsPath      = path.resolve("src/database/jobs.json");
const dbContratosPath = path.resolve("src/database/contratos.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try { return JSON.parse(fs.readFileSync(filePath)); } catch { return {}; }
}
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function formatMoney(v) { return v.toLocaleString("pt-BR"); }

const HOSPITAL_MS    = 60 * 60 * 1000;      // 1 hora no hospital
const JAIL_MS        = 12 * 60 * 60 * 1000; // 12 horas preso
const SUCCESS_CHANCE = 65;

export default {
  name: "abater",
  aliases: ["executar", "matar"],
  description: "Matador executa um contrato de eliminacao",
  category: "fun",

  async run({ sock, msg }) {
    const from   = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const now    = Date.now();

    // Só matador pode usar
    const jobsDB = loadJSON(dbJobsPath);
    const myJob  = jobsDB[from]?.[sender]?.job;
    if (myJob !== "matador") {
      return sock.sendMessage(from, { text: `🗡️ Apenas *Matadores* podem usar !abater.` }, { quoted: msg });
    }

    // Precisa de menção
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const alvo = mentioned[0];
    if (!alvo || alvo === sender) {
      return sock.sendMessage(from, { text: `💡 Use: *!abater @alvo*` }, { quoted: msg });
    }

    // Verifica contrato ativo
    const contratos = loadJSON(dbContratosPath);
    if (!contratos[from]) contratos[from] = {};
    const contratoEntry = Object.entries(contratos[from]).find(
      ([, c]) => c.matador === sender && c.alvo === alvo && c.status === "pendente" && c.expiresAt > now
    );

    if (!contratoEntry) {
      return sock.sendMessage(from, {
        text: `📋 Você não tem um contrato ativo para esse alvo.\nUse *!contratar* para registrar um contrato.`
      }, { quoted: msg });
    }

    const [contratoId, contrato] = contratoEntry;
    const luckyDB = loadJSON(dbLuckyPath);
    if (!luckyDB[from]) luckyDB[from] = {};

    // Sorteia o resultado
    const sucesso = Math.random() * 100 < SUCCESS_CHANCE;

    if (sucesso) {
      // Alvo vai para o hospital por 1h
      if (!luckyDB[from][alvo]) luckyDB[from][alvo] = { money: 0 };
      luckyDB[from][alvo].hospitalUntil = now + HOSPITAL_MS;

      // Matador recebe a recompensa
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + contrato.valor;

      // Fecha o contrato
      contratos[from][contratoId].status = "concluido";

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbContratosPath, contratos);

      const text =
        `🗡️ *ELIMINAÇÃO CONCLUÍDA!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💀 @${alvo.split("@")[0]} foi neutralizado por @${sender.split("@")[0]}!\n\n` +
        `🏥 A vítima está no hospital por *1 hora* e não pode usar comandos de economia.\n` +
        `💰 O matador recebeu *${formatMoney(contrato.valor)} fyne coins* pelo serviço.`;

      await sock.sendMessage(from, { text, mentions: [alvo, sender] }, { quoted: msg });

    } else {
      // Falha: matador é preso por 12h, perde o emprego, contratante recebe reembolso
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].jailUntil = now + JAIL_MS;
      luckyDB[from][sender].wantedUntil = 0;

      // Reembolso ao contratante
      if (!luckyDB[from][contrato.contratante]) luckyDB[from][contrato.contratante] = { money: 0 };
      luckyDB[from][contrato.contratante].money = (luckyDB[from][contrato.contratante].money || 0) + contrato.valor;

      // Matador perde o emprego
      if (jobsDB[from]?.[sender]) {
        jobsDB[from][sender].job = null;
      }

      // Fecha o contrato
      contratos[from][contratoId].status = "falhou";

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbJobsPath, jobsDB);
      saveJSON(dbContratosPath, contratos);

      const text =
        `🚨 *MISSÃO FRACASSADA!*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `❌ @${sender.split("@")[0]} foi interceptado pela polícia!\n\n` +
        `🏛️ Sentença: *12 horas de prisão* (sem fiança)\n` +
        `💼 Emprego de Matador: *REVOGADO*\n` +
        `💸 Reembolso: *${formatMoney(contrato.valor)} fyne coins* devolvidos ao contratante.`;

      await sock.sendMessage(from, { text, mentions: [sender, contrato.contratante] }, { quoted: msg });
    }
  }
}
