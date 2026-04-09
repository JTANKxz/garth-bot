import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "cnpj",
  description: "Consulta CNPJ (resumo) via open.cnpja.com",
  usage: "cnpj 37335118000180",
  aliases: ["cnpjinfo", "empresa"],
  category: "utils",
  vipOnly: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();
    const prefix = groupConfig.prefix || "!";

    const isGroup = jid.endsWith("@g.us");
    const groupVip = isGroup ? isGroupVip(jid) : false;
    const isCreator = sender === botConfig.botCreator;

    if (!groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP.` },
        { quoted: msg }
      );
    }

    if (!args.length) {
      return sock.sendMessage(
        jid,
        { text: `📌 *Uso:* ${prefix}${this.usage}\nEx: ${prefix}cnpj 37335118000180` },
        { quoted: msg }
      );
    }

    const taxId = String(args[0]).replace(/\D/g, "");
    if (!/^\d{14}$/.test(taxId)) {
      return sock.sendMessage(
        jid,
        { text: "❌ CNPJ inválido. Envie 14 dígitos.\nEx: 37335118000180" },
        { quoted: msg }
      );
    }

    const safe = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

    const formatCnpj = (v = "") =>
      v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

    const formatDateBR = (iso) => {
      if (!iso) return "—";
      const s = String(iso);
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    };

    const moneyBR = (n) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return "—";
      return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    const joinNonEmpty = (parts, sep = ", ") => parts.filter(Boolean).join(sep);

    try {
      const url = `https://open.cnpja.com/office/${taxId}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept": "application/json,text/plain,*/*",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Connection": "keep-alive",
        },
      });

      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ Erro ao consultar CNPJ (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();

      const company = data.company || {};
      const status = data.status || {};
      const nature = company.nature || {};
      const size = company.size || {};
      const simples = company.simples || {};
      const simei = company.simei || {};
      const address = data.address || {};
      const country = address.country || {};
      const mainActivity = data.mainActivity || {};
      const sideActivities = Array.isArray(data.sideActivities) ? data.sideActivities : [];

      const phones = Array.isArray(data.phones) ? data.phones : [];
      const emails = Array.isArray(data.emails) ? data.emails : [];

      const phoneText = phones.length
        ? phones
          .slice(0, 2)
          .map((p) => `(${safe(p.area)}) ${safe(p.number)} [${safe(p.type)}]`)
          .join(" | ")
        : "—";

      const emailText = emails.length
        ? emails
          .slice(0, 2)
          .map((e) => safe(e.address))
          .join(" | ")
        : "—";

      const members = Array.isArray(company.members) ? company.members : [];
      const membersLines = members.length
        ? members.map((m, idx) => {
          const person = m.person || {};
          const role = m.role || {};
          return `> ${idx + 1}. ${safe(person.name)} — *${safe(role.text)}*\n> CPF: ${safe(person.taxId)} | Idade: ${safe(person.age)} | Desde: ${formatDateBR(m.since)}`;
        })
        : ["—"];

      const sideTop = sideActivities.slice(0, 3).map((a) => `• ${safe(a.text)}`);
      const sideRest = Math.max(0, sideActivities.length - sideTop.length);
      const sideText = sideTop.length ? `${sideTop.join("\n")}${sideRest ? `\n• +${sideRest}` : ""}` : "—";

      const endereco = joinNonEmpty(
        [
          address.street ? `${safe(address.street)}${address.number ? `, ${safe(address.number)}` : ""}` : null,
          address.details ? safe(address.details) : null,
          address.district ? safe(address.district) : null,
          address.city && address.state ? `${safe(address.city)} - ${safe(address.state)}` : null,
          address.zip ? `CEP: ${safe(address.zip)}` : null,
          country?.name ? safe(country.name) : null,
        ],
        " | "
      );

      const header = groupVip ? "🏢 *Consulta CNPJ (VIP💎)*" : "🏢 *Consulta CNPJ*";

      const text =
        `${header}\n\n` +
        `> *Razão Social:* ${safe(company.name)}\n` +
        `> *CNPJ:* ${formatCnpj(taxId)}${data.head ? " (MATRIZ)" : " (FILIAL)"}\n` +
        `> *Status:* ${safe(status.text)}\n` +
        `> *Fundação:* ${formatDateBR(data.founded)}\n` +
        `> *Situação desde:* ${formatDateBR(data.statusDate)}\n` +
        `> *Atualizado em:* ${formatDateBR(data.updated)}\n\n` +
        `> *Porte:* ${safe(size.text)} (${safe(size.acronym)})\n` +
        `> *Natureza Jurídica:* ${safe(nature.text)}\n` +
        `> *Capital Social:* ${moneyBR(company.equity)}\n` +
        `> *Simples:* ${simples.optant ? `Sim (desde ${formatDateBR(simples.since)})` : "Não"}\n` +
        `> *MEI (SIMEI):* ${simei.optant ? `Sim (desde ${formatDateBR(simei.since)})` : "Não"}\n\n` +
        `> *Atividade Principal:* ${safe(mainActivity.text)}\n` +
        `> *Secundárias:*\n${sideText}\n\n` +
        `> *Endereço:* ${safe(endereco)}\n` +
        `> *Telefone(s):* ${phoneText}\n` +
        `> *Email(s):* ${emailText}\n\n` +
        `> *Sócios / Administração:*\n` +
        `${membersLines.join("\n")}\n\n` +
        `> By GARTH-BOT V4`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch {
      return sock.sendMessage(
        jid,
        { text: "❌ Ocorreu um erro ao consultar o CNPJ. Tente novamente." },
        { quoted: msg }
      );
    }
  },
};