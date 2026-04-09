import fs from "fs";
import path from "path";
import { formatMoney } from "../../utils/saldo.js";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

/**
 * Retorna a data atual no formato DD/MM/YYYY
 * usando o horário de São Paulo
 */
function getToday() {
  const now = new Date();

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(now);
}

function isVipActive(user, now) {
  const vipUntil = user?.items?.vip_profile || 0;
  return vipUntil > now;
}

export default {
  name: "daily",
  aliases: ["check"],
  description: "Ganhe fyne coins por dia 💰",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
      const db = loadDB();

      if (!db[from]) db[from] = {};
      if (!db[from][sender]) {
        db[from][sender] = {
          money: 0,
          lastDaily: null,
          dailyDoubleDays: 0,
          items: {}
        };
      }

      const user = db[from][sender];
      if (!user.items) user.items = {};
      if (typeof user.dailyDoubleDays !== "number") user.dailyDoubleDays = 0;

      const today = getToday();

      // 🚫 já coletou hoje
      if (user.lastDaily === today) {
        await sock.sendMessage(
          from,
          {
            text:
              `🕛 *${pushName}*, você já coletou seu daily hoje.\n` +
              `Volte amanhã *00:00* para ganhar mais 💰`
          },
          { quoted: msg }
        );

        await sock.sendMessage(from, {
          react: { text: "❌", key: msg.key }
        });
        return;
      }

      const now = Date.now();

      // ✅ BASE (mantive seu valor atual)
      let ganho = 350;
      let bonusText = "";

      // ✅ VIP: daily 2.5x (e ignora dailyDoubleDays)
      if (isVipActive(user, now)) {
        ganho = Math.floor(ganho * 2.5);
        bonusText = `\n👑 *VIP ativo!* Daily em *2.5x*`;
      } else {
        // 🔁 DAILY DOBRADO normal
        if (user.dailyDoubleDays > 0) {
          ganho *= 2;
          user.dailyDoubleDays -= 1;
          bonusText = `\n*Daily em dobro ativo!* (${user.dailyDoubleDays} dia(s) restante(s))`;
        }
      }

      user.money += ganho;
      user.lastDaily = today;

      saveDB(db);

      await sock.sendMessage(
        from,
        {
          text:
            `💰 *Daily Resgatado!*\n\n` +
            `🎉 *${pushName}* ganhou *${formatMoney(ganho)}* 💵` +
            bonusText +
            `\n🪙 Volte amanhã para ganhar mais!`
        },
        { quoted: msg }
      );

      await sock.sendMessage(from, {
        react: { text: "✅", key: msg.key }
      });

    } catch (err) {
      console.error("Erro no comando daily:", err);

      await sock.sendMessage(from, {
        react: { text: "❌", key: msg.key }
      });
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao executar o comando daily." },
        { quoted: msg }
      );
    }
  }
};
