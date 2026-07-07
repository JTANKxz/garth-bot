import fs from "fs";
import path from "path";

const dbLuckyPath    = path.resolve("src/database/lucky.json");
const dbJobsPath     = path.resolve("src/database/jobs.json");
const dbContratosPath = path.resolve("src/database/contratos.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try { return JSON.parse(fs.readFileSync(filePath)); } catch { return {}; }
}
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function formatMoney(v) { return v.toLocaleString("pt-BR"); }

const MIN_VALOR = 500;
const MAX_VALOR = 1000;

export default {
  name: "contratar",
  aliases: ["hitman", "contract"],
  description: "Contrata um Matador para eliminar um alvo",
  category: "fun",

  async run({ sock, msg, args }) {
    const from   = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const now    = Date.now();

    // !contratar @matador @alvo <valor>
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length < 2) {
      return sock.sendMessage(from, {
        text: `🗡️ *Como usar:*\n!contratar @matador @alvo <valor>\n\n💰 Valor mínimo: *${formatMoney(MIN_VALOR)}* | Máximo: *${formatMoney(MAX_VALOR)} fyne coins*`
      }, { quoted: msg });
    }

    const matador = mentioned[0];
    const alvo    = mentioned[1];
    const valor   = parseInt(args.find(a => !isNaN(parseInt(a))));

    if (matador === sender) return sock.sendMessage(from, { text: "❌ Você não pode contratar a si mesmo." }, { quoted: msg });
    if (alvo === sender)    return sock.sendMessage(from, { text: "❌ Você não pode contratar um matador para te eliminar." }, { quoted: msg });
    if (matador === alvo)   return sock.sendMessage(from, { text: "❌ O matador e o alvo não podem ser a mesma pessoa." }, { quoted: msg });

    if (!valor || valor < MIN_VALOR || valor > MAX_VALOR) {
      return sock.sendMessage(from, {
        text: `💰 O valor do contrato deve ser entre *${formatMoney(MIN_VALOR)}* e *${formatMoney(MAX_VALOR)} fyne coins*.`
      }, { quoted: msg });
    }

    // Verificar se o contratado é matador
    const jobsDB = loadJSON(dbJobsPath);
    const matadorJob = jobsDB[from]?.[matador]?.job;
    if (matadorJob !== "matador") {
      return sock.sendMessage(from, { text: `❌ @${matador.split("@")[0]} não é um *Matador*.`, mentions: [matador] }, { quoted: msg });
    }

    // Verificar saldo do contratante
    const luckyDB = loadJSON(dbLuckyPath);
    if (!luckyDB[from]) luckyDB[from] = {};
    if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
    const contratante = luckyDB[from][sender];

    if ((contratante.money || 0) < valor) {
      return sock.sendMessage(from, {
        text: `💸 Você não tem fyne coins suficientes! Você tem *${formatMoney(contratante.money || 0)}* e precisa de *${formatMoney(valor)}*.`
      }, { quoted: msg });
    }

    // Verificar se o matador já tem um contrato ativo
    const contratos = loadJSON(dbContratosPath);
    if (!contratos[from]) contratos[from] = {};
    const contratoAtivo = Object.values(contratos[from]).find(c => c.matador === matador && c.status === "pendente" && c.expiresAt > now);
    if (contratoAtivo) {
      return sock.sendMessage(from, { text: `🗡️ Esse matador já está com um contrato ativo. Aguarde ele terminar!` }, { quoted: msg });
    }

    // Debita o dinheiro e registra o contrato (expira em 24h)
    contratante.money -= valor;
    saveJSON(dbLuckyPath, luckyDB);

    const contratoId = `${from}-${matador}-${now}`;
    contratos[from][contratoId] = {
      id: contratoId,
      contratante: sender,
      matador,
      alvo,
      valor,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      status: "pendente"
    };
    saveJSON(dbContratosPath, contratos);

    const text =
      `🗡️ *CONTRATO DE ELIMINAÇÃO REGISTRADO!*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💼 Contratante: @${sender.split("@")[0]}\n` +
      `🔫 Matador: @${matador.split("@")[0]}\n` +
      `🎯 Alvo: @${alvo.split("@")[0]}\n` +
      `💰 Recompensa: *${formatMoney(valor)} fyne coins*\n` +
      `⏳ Validade: *24 horas*\n\n` +
      `_O matador foi notificado. Use !abater @alvo para executar o contrato._`;

    await sock.sendMessage(from, { text, mentions: [sender, matador, alvo] }, { quoted: msg });
  }
}
