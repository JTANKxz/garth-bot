import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");
const COOLDOWN = 60 * 1000;

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function formatNumber(valor) {
  return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
  if (valor >= 1_000_000_000) return `${formatNumber(valor)}B`;
  if (valor >= 1_000_000) return `${formatNumber(valor)}M`;
  if (valor >= 1_000) return `${formatNumber(valor)}K`;
  return formatNumber(valor);
}

function isVipActive(user, now) {
  const vipUntil = user?.items?.vip_profile || 0;
  return vipUntil > now;
}

export default {
  name: "apostar",
  aliases: ["bet"],
  description: "Aposte fyne coins com chance de ganhar ou perder 🎰",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
      const valor = parseInt(args[0]);

      if (!valor || valor <= 0) {
        await sock.sendMessage(
          from,
          { text: "💸 Informe um valor válido para apostar." },
          { quoted: msg }
        );
        return;
      }

      const db = loadDB();
      if (!db[from]) db[from] = {};
      if (!db[from][sender])
        db[from][sender] = { money: 0, lastBet: 0, items: {} };

      const user = db[from][sender];
      if (!user.items) user.items = {};

      const now = Date.now();

      const restante = COOLDOWN - (now - (user.lastBet || 0));
      if (restante > 0) {
        const segundos = Math.ceil(restante / 1000);
        await sock.sendMessage(
          from,
          { text: `⏳ Aguarde *${segundos}s* para apostar novamente.` },
          { quoted: msg }
        );
        return;
      }

      if (user.money < valor) {
        await sock.sendMessage(
          from,
          {
            text:
              `💳 Saldo insuficiente.\n` +
              `Saldo atual: *${formatMoney(user.money)} fyne coins*`
          },
          { quoted: msg }
        );
        return;
      }

      // 🎯 CHANCE DINAMICA
      const { getSetting } = await import("../../utils/economyManager.js");
      const isVip = isVipActive(user, now);
      
      let chanceGanho = isVip 
        ? getSetting(from, "win_rate_vip") 
        : getSetting(from, "win_rate_base");

      // 🍀 BÔNUS DE ITENS
      if (user.items?.bet_bonus && user.items.bet_bonus > now) {
        chanceGanho += 10;
      }
      if (user.items?.luck_charm && user.items.luck_charm > now) {
        chanceGanho += 15;
      }

      const roll = Math.floor(Math.random() * 100);
      let resultado;

      if (roll < chanceGanho) {
        // ganhou → lucro = valor (2x total)
        user.money += valor;

        resultado =
          `🎉 *${pushName}* ganhou *${formatMoney(valor * 2)} fyne coins* 💰`;
      } else {
        // perdeu
        user.money -= valor;

        resultado =
          `💥 *${pushName}* perdeu *${formatMoney(valor)} fyne coins*`;
      }

      user.lastBet = now;
      saveDB(db);

      await sock.sendMessage(from, { text: resultado }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
      console.error("Erro no comando apostar:", err);

      await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao executar o comando apostar." },
        { quoted: msg }
      );
    }
  }
};
