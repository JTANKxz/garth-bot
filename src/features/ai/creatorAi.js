// src/features/ai/creatorAi.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { askOllama } from "./ollama.js";

const CREATOR_SYSTEM_PROMPT = `
Você é a I.A. de Desenvolvimento do Garth-Bot V5, atuando como o console de desenvolvimento inteligente e assistente direto do Criador do bot (João Tank).
Seu papel é ajudar o Criador a gerenciar, depurar, monitorar e auto-reprogramar o bot.

Você é capaz de executar ferramentas emitindo um bloco JSON no formato abaixo.
IMPORTANTE: Se você decidir usar uma ferramenta, você deve emitir APENAS o bloco JSON da ferramenta em markdown \`\`\`json. Não adicione nenhuma explicação antes ou depois do bloco JSON. Aguarde o sistema responder com o resultado da ferramenta e continue seu raciocínio.

FORMATO DO BLOCO JSON PARA FERRAMENTAS:
\`\`\`json
{
  "tool": "nome_da_ferramenta",
  "args": {
    "arg1": "valor1"
  }
}
\`\`\`

FERRAMENTAS DISPONÍVEIS:
1. read_file
   - Descrição: Lê o conteúdo de um arquivo do projeto.
   - Args: { "path": "caminho/do/arquivo" }
2. write_file
   - Descrição: Cria ou sobrescreve um arquivo de texto. Use para ajustar JSONs, bases de dados ou escrever código JS (auto-reprogramar).
   - Args: { "path": "caminho/do/arquivo", "content": "conteúdo completo do arquivo" }
3. delete_file
   - Descrição: Apaga um arquivo do projeto permanentemente.
   - Args: { "path": "caminho/do/arquivo" }
4. list_dir
   - Descrição: Lista os arquivos de um diretório.
   - Args: { "path": "caminho/do/diretorio" }
5. run_command
   - Descrição: Executa um comando terminal do sistema (ex: pm2 logs, git status, git diff, npm run test).
   - Args: { "command": "comando terminal" }
6. reload_commands
   - Descrição: Recarrega a memória de comandos dinamicamente após você criar/editar um arquivo em src/commands/.
   - Args: {}
7. read_logs
   - Descrição: Lê as últimas mensagens registradas nos logs de mensagens do bot.
   - Args: { "count": 20 }
8. group_action
   - Descrição: Executa uma ação de administração no grupo do WhatsApp.
   - Args: { "action": "close" | "open" | "warn" | "kick", "targetJid": "número ou jid do usuário", "reason": "motivo opcional", "limit": 3 }

REGRAS DE RESPOSTA E VISIBILIDADE EM GRUPO:
- Campo 'isGroup': {{isGroup}}
- Se 'isGroup' for true, você está conversando em um grupo público. Nesse caso, você DEVE OCULTAR detalhes internos (caminhos de arquivos completos, códigos brutos, listagem de logs) na sua resposta final de conversa com o Criador, para evitar que outros membros do grupo vejam o código ou configurações do bot. Diga apenas o resultado de forma resumida (ex: "Grupo fechado!", "Comando !teste reprogramado com sucesso!").
- Só exiba códigos ou caminhos de arquivos em grupo se o Criador pedir de forma explícita na mensagem dele (ex: "me mostre o código alterado", "qual o caminho do arquivo?").
- Se 'isGroup' for false (conversa privada no PV), você está livre para responder com o nível máximo de detalhes, códigos completos e caminhos de arquivo.
- Seja profissional, focado em desenvolvimento, prestativo e direto.
`.trim();

function extractToolCall(text) {
  const mdRegex = /```json\s*([\s\S]+?)\s*```/;
  const mdMatch = text.match(mdRegex);
  if (mdMatch) {
    try {
      const parsed = JSON.parse(mdMatch[1].trim());
      if (parsed && parsed.tool) return parsed;
    } catch (e) {
      // Ignorar erro e prosseguir
    }
  }

  const jsonRegex = /(\{\s*"tool"\s*:[\s\S]+?\})/;
  const jsonMatch = text.match(jsonRegex);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && parsed.tool) return parsed;
    } catch (e) {
      // Ignorar erro
    }
  }

  return null;
}

async function executeTool(toolName, args = {}, { groupJid, sock }) {
  const rootDir = process.cwd();

  switch (toolName) {
    case "read_file": {
      if (!args.path) return "Erro: O argumento 'path' é obrigatório.";
      const fullPath = path.resolve(rootDir, args.path);
      if (!fullPath.startsWith(rootDir)) return "Erro: Acesso negado fora do workspace.";
      if (!fs.existsSync(fullPath)) return `Erro: O arquivo em '${args.path}' não existe.`;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) return `Erro: '${args.path}' é um diretório, use list_dir.`;
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.length > 5000) {
        return content.substring(0, 5000) + "\n\n[CONTEÚDO TRUNCADO... Arquivo muito longo. Solicite partes específicas se necessário.]";
      }
      return content;
    }

    case "write_file": {
      if (!args.path || args.content === undefined) {
        return "Erro: Os argumentos 'path' e 'content' são obrigatórios.";
      }
      const fullPath = path.resolve(rootDir, args.path);
      if (!fullPath.startsWith(rootDir)) return "Erro: Acesso negado fora do workspace.";
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, args.content, "utf-8");
      return `Arquivo '${args.path}' gravado com sucesso! (${args.content.length} caracteres)`;
    }

    case "delete_file": {
      if (!args.path) return "Erro: O argumento 'path' é obrigatório.";
      const fullPath = path.resolve(rootDir, args.path);
      if (!fullPath.startsWith(rootDir)) return "Erro: Acesso negado fora do workspace.";
      if (!fs.existsSync(fullPath)) return `Erro: O arquivo/diretório em '${args.path}' não existe.`;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        return `Diretório '${args.path}' deletado com sucesso!`;
      } else {
        fs.unlinkSync(fullPath);
        return `Arquivo '${args.path}' deletado com sucesso!`;
      }
    }

    case "list_dir": {
      const targetDir = args.path ? path.resolve(rootDir, args.path) : rootDir;
      if (!targetDir.startsWith(rootDir)) return "Erro: Acesso negado fora do workspace.";
      if (!fs.existsSync(targetDir)) return `Erro: O diretório em '${args.path}' não existe.`;
      const stat = fs.statSync(targetDir);
      if (!stat.isDirectory()) return `Erro: '${args.path}' não é um diretório.`;
      const files = fs.readdirSync(targetDir);
      const output = files.map(file => {
        const itemPath = path.join(targetDir, file);
        const itemStat = fs.statSync(itemPath);
        return `${file}${itemStat.isDirectory() ? "/" : ""} (${itemStat.size} bytes)`;
      });
      return output.join("\n") || "[Vazio]";
    }

    case "run_command": {
      if (!args.command) return "Erro: O argumento 'command' é obrigatório.";
      return new Promise(resolve => {
        exec(args.command, { timeout: 15000, cwd: rootDir }, (err, stdout, stderr) => {
          let output = "";
          if (stdout) output += stdout;
          if (stderr) output += `\n[Stderr]: ${stderr}`;
          if (err) output += `\n[Erro de Execução]: ${err.message}`;
          if (output.length > 5000) {
            output = output.substring(0, 5000) + "\n\n[SAÍDA TRUNCADA...]";
          }
          resolve(output || "[Sem saída de terminal]");
        });
      });
    }

    case "reload_commands": {
      try {
        const { reloadCommandSystem } = await import("../../handler/commandsHandler.js");
        await reloadCommandSystem();
        return "Comandos recarregados com sucesso!";
      } catch (err) {
        return `Erro ao recarregar comandos: ${err.message}`;
      }
    }

    case "read_logs": {
      try {
        const { getRecentLogs } = await import("../../utils/messageLogger.js");
        const count = Number(args.count) || 20;
        const logs = getRecentLogs(count);
        return JSON.stringify(logs, null, 2);
      } catch (err) {
        return `Erro ao ler logs: ${err.message}`;
      }
    }

    case "group_action": {
      const { action, targetJid, reason, limit } = args;
      if (!action) return "Erro: O argumento 'action' é obrigatório.";

      if (action === "close") {
        if (!groupJid.endsWith("@g.us")) return "Erro: Esta ação só pode ser executada em um grupo.";
        await sock.groupSettingUpdate(groupJid, "announcement");
        return "Sucesso: O grupo foi fechado (apenas administradores podem enviar mensagens).";
      }

      if (action === "open") {
        if (!groupJid.endsWith("@g.us")) return "Erro: Esta ação só pode ser executada em um grupo.";
        await sock.groupSettingUpdate(groupJid, "not_announcement");
        return "Sucesso: O grupo foi aberto (todos os membros podem enviar mensagens).";
      }

      if (action === "warn") {
        if (!groupJid.endsWith("@g.us")) return "Erro: Esta ação só pode ser executada em um grupo.";
        if (!targetJid) return "Erro: O argumento 'targetJid' é obrigatório para aplicar advertência.";
        const cleanJid = targetJid.includes("@") ? targetJid.trim() : `${targetJid.trim()}@s.whatsapp.net`;
        const finalLimit = Number(limit) || 3;
        try {
          const { applyWarning } = await import("../warning.js");
          const totalWarnings = await applyWarning(sock, groupJid, cleanJid, "system", reason || "Aplicado pela I.A. dev", finalLimit);
          return `Sucesso: Advertência aplicada em @${cleanJid.split("@")[0]}. Total de advertências: ${totalWarnings}/${finalLimit}.`;
        } catch (err) {
          return `Erro ao aplicar advertência: ${err.message}`;
        }
      }

      if (action === "kick") {
        if (!groupJid.endsWith("@g.us")) return "Erro: Esta ação só pode ser executada em um grupo.";
        if (!targetJid) return "Erro: O argumento 'targetJid' é obrigatório para remoção.";
        const cleanJid = targetJid.includes("@") ? targetJid.trim() : `${targetJid.trim()}@s.whatsapp.net`;
        try {
          await sock.groupParticipantsUpdate(groupJid, [cleanJid], "remove");
          return `Sucesso: O usuário @${cleanJid.split("@")[0]} foi kickado/removido do grupo.`;
        } catch (err) {
          return `Erro ao kickar usuário: ${err.message}`;
        }
      }

      return `Erro: Ação '${action}' desconhecida para group_action.`;
    }

    default:
      return `Erro: Ferramenta '${toolName}' não reconhecida pelo sistema.`;
  }
}

export async function runCreatorAgent({ prompt, history, isGroup, groupJid, sock }) {
  const currentHistory = [...history];
  const systemPrompt = CREATOR_SYSTEM_PROMPT.replace("{{isGroup}}", isGroup ? "true" : "false");

  let loops = 0;
  const maxLoops = 7;
  let isFirstLoop = true;

  while (loops < maxLoops) {
    loops++;
    const currentPrompt = isFirstLoop ? prompt : "Continue executando e forneça a resposta final ou chame a próxima ferramenta.";
    
    const answer = await askOllama({
      prompt: currentPrompt,
      system: systemPrompt,
      history: currentHistory,
      temperature: 0.1 // Baixa temperatura para chamadas JSON estáveis
    });

    isFirstLoop = false;

    if (!answer) {
      return "⚠️ Nenhuma resposta gerada pelo modelo da I.A. dev.";
    }

    const toolCall = extractToolCall(answer);

    if (toolCall) {
      console.log(`[CreatorAI] Ferramenta detectada: ${toolCall.tool}`);
      let toolResult;
      try {
        toolResult = await executeTool(toolCall.tool, toolCall.args, { groupJid, sock });
      } catch (err) {
        toolResult = `Erro na ferramenta: ${err.message}`;
      }

      // Adiciona o histórico do loop de ReAct
      currentHistory.push({ role: "user", content: currentPrompt });
      currentHistory.push({ role: "assistant", content: answer });
      currentHistory.push({ role: "user", content: `[System Tool Output]:\n${toolResult}` });
    } else {
      // Resposta textual final
      return answer;
    }
  }

  return "⚠️ Limite máximo de chamadas de ferramentas atingido (7 loops ReAct).";
}
