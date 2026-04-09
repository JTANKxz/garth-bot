import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "cep",
  description: "Consulta endereço pelo CEP",
  usage: "cep 01001000",
  aliases: ["viacep"],
  category: "utils",
  vipOnly: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();
    const prefix = groupConfig.prefix || "!";

    const groupVip = isGroupVip(jid);
    const isCreator = sender === botConfig.botCreator;

    // 🔒 Se não for VIP e não for o criador → bloqueia
    if (!groupVip && !isCreator) {
      return sock.sendMessage(jid, {
        text: `❌ Este comando é exclusivo para grupos VIP.`
      }, { quoted: msg });
    }

    // Validação do CEP
    if (!args[0]) {
      return sock.sendMessage(
        jid,
        { text: `❌ Use: ${prefix}cep 01001000` },
        { quoted: msg }
      );
    }

    const rawCep = args[0];
    const cep = rawCep.replace(/\D/g, ""); // remove tudo que não for número

    if (!/^\d{8}$/.test(cep)) {
      return sock.sendMessage(
        jid,
        { text: "❌ CEP inválido. Envie um CEP com 8 dígitos.\nEx: 01001000" },
        { quoted: msg }
      );
    }

    try {
      const url = `https://viacep.com.br/ws/${cep}/json/`;

      // Node 18+ tem fetch nativo. Se seu projeto for Node 16, use node-fetch/axios.
      const res = await fetch(url);

      // ViaCEP retorna 400 para formato inválido (aqui já validamos, mas por segurança)
      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ Erro ao consultar CEP (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();

      if (data?.erro) {
        return sock.sendMessage(
          jid,
          { text: "❌ CEP não encontrado na base." },
          { quoted: msg }
        );
      }

      const texto =
        `📮 *Consulta de CEP*\n\n` +
        `> *CEP:* ${data.cep || cep}\n` +
        `> *Logradouro:* ${data.logradouro || "—"}\n` +
        `> *Complemento:* ${data.complemento || "—"}\n` +
        `> *Bairro:* ${data.bairro || "—"}\n` +
        `> *Cidade:* ${data.localidade || "—"}\n` +
        `> *UF:* ${data.uf || "—"}\n` +
        `> *DDD:* ${data.ddd || "—"}\n` +
        `> *IBGE:* ${data.ibge || "—"}`;

      return sock.sendMessage(jid, { text: texto }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando CEP:", err);
      return sock.sendMessage(
        jid,
        { text: "❌ Ocorreu um erro ao consultar o CEP. Tente novamente." },
        { quoted: msg }
      );
    }
  },
};