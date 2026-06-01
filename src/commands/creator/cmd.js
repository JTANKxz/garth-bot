import { commands, aliases } from "../../handler/commandsHandler.js";
import { disableCommand, enableCommand, getDisabledCommands, normalizeCommandName } from "../../utils/disabledCommands.js";

function resolveCommandName(name) {
  const normalized = normalizeCommandName(name);
  return commands.has(normalized) ? normalized : aliases.get(normalized);
}

export default {
  name: "cmd",
  aliases: ["comando", "command"],
  description: "Ativa ou desativa comandos globalmente",
  usage: "cmd off nome motivo | cmd on nome | cmd list",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const action = args[0]?.toLowerCase();

    if (!action || !["off", "on", "list"].includes(action)) {
      return sock.sendMessage(jid, {
        text: "Use: !cmd off comando motivo | !cmd on comando | !cmd list"
      }, { quoted: msg });
    }

    if (action === "list") {
      const disabled = Object.entries(getDisabledCommands());
      const text = disabled.length
        ? disabled.map(([name, data]) => `- ${name}${data.reason ? `: ${data.reason}` : ""}`).join("\n")
        : "Nenhum comando desativado.";

      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    const commandName = resolveCommandName(args[1]);
    if (!commandName) {
      return sock.sendMessage(jid, { text: "Comando nao encontrado." }, { quoted: msg });
    }

    if (commandName === "cmd") {
      return sock.sendMessage(jid, { text: "Esse comando nao pode desativar ele mesmo." }, { quoted: msg });
    }

    if (action === "off") {
      const reason = args.slice(2).join(" ");
      const disabledName = disableCommand(commandName, reason);
      return sock.sendMessage(jid, {
        text: `Comando ${disabledName} desativado.${reason ? `\nMotivo: ${reason}` : ""}`
      }, { quoted: msg });
    }

    const existed = enableCommand(commandName);
    return sock.sendMessage(jid, {
      text: existed ? `Comando ${commandName} ativado.` : `Comando ${commandName} ja estava ativo.`
    }, { quoted: msg });
  }
};
