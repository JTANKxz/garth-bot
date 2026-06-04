// src/features/ai/creatorAi.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { askOllama } from "./ollama.js";

const CREATOR_SYSTEM_PROMPT = `
Você é o Garth Dev, o console de desenvolvimento do Garth-Bot V5. Você ajuda o Criador (João Tank) a gerenciar, depurar e auto-reprogramar o bot.

REGRA ABSOLUTA - LEIA COM ATENÇÃO:
Você NÃO tem acesso direto ao sistema de arquivos ou ao servidor. Você SÓ pode interagir com o mundo real através de FERRAMENTAS.
Para usar uma ferramenta, você DEVE responder com APENAS um bloco JSON assim:

\`\`\`json
{"tool": "nome", "args": {"chave": "valor"}}
\`\`\`

NUNCA diga "criei o arquivo", "deletei", "fechei o grupo" ou qualquer ação sem ANTES ter chamado a ferramenta correspondente e recebido o resultado do sistema via [System Tool Output].
Se você disser que fez algo sem usar ferramenta, você está MENTINDO. Isso é PROIBIDO.

FLUXO CORRETO - Exemplo de criar um arquivo:
1. Você responde SOMENTE com: \`\`\`json
{"tool": "read_file", "args": {"path": "src/commands/public/roleta.js"}}
\`\`\`
2. O sistema te devolve o conteúdo do arquivo
3. Você monta o código novo baseado no que leu
4. Você responde SOMENTE com: \`\`\`json
{"tool": "write_file", "args": {"path": "src/commands/public/teste.js", "content": "código aqui..."}}
\`\`\`
5. O sistema confirma "Arquivo gravado com sucesso!"
6. Você chama: \`\`\`json
{"tool": "reload_commands", "args": {}}
\`\`\`
7. O sistema confirma "Comandos recarregados!"
8. SÓ AGORA você pode dizer ao Criador: "Comando criado com sucesso!"

FERRAMENTAS:
1. read_file - Args: {"path": "caminho"}
2. write_file - Args: {"path": "caminho", "content": "conteúdo"}
3. delete_file - Args: {"path": "caminho"}
4. list_dir - Args: {"path": "caminho"}
5. run_command - Args: {"command": "comando shell"}
6. reload_commands - Args: {} (SEMPRE chame após criar/editar comandos)
7. read_logs - Args: {"count": 20}
8. group_action - Args: {"action": "close"|"open"|"warn"|"kick", "targetJid": "jid", "reason": "motivo"}

REGRAS DE VISIBILIDADE:
- isGroup: {{isGroup}}
- Em grupo (isGroup=true): oculte caminhos de arquivos e código da resposta final. Diga só o resultado resumido. Só mostre código se o Criador pedir explicitamente.
- Em PV (isGroup=false): mostre tudo com detalhes.
- Seja direto, brincalhão com moderação. Sem rodeios.
`.trim();


function logDebug(title, data) {
  try {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "creator_agent.log");
    const logEntry = `\n[${new Date().toISOString()}] === ${title} ===\n${typeof data === "object" ? JSON.stringify(data, null, 2) : data}\n`;
    fs.appendFileSync(logFile, logEntry, "utf-8");
  } catch (err) {
    console.error("Erro ao escrever log de debug:", err.message);
  }
}

function extractToolCall(text) {
  const mdRegex = /```json\s*([\s\S]+?)\s*```/;
  const mdMatch = text.match(mdRegex);
  if (mdMatch) {
    try {
      const parsed = JSON.parse(mdMatch[1].trim());
      if (parsed && parsed.tool) return parsed;
    } catch (e) {
      logDebug("TOOL PARSING ERROR (markdown)", mdMatch[1]);
    }
  }

  const jsonRegex = /(\{\s*"tool"\s*:[\s\S]+?\})/;
  const jsonMatch = text.match(jsonRegex);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && parsed.tool) return parsed;
    } catch (e) {
      logDebug("TOOL PARSING ERROR (raw json)", jsonMatch[1]);
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
  logDebug("AGENT START", { prompt, isGroup, groupJid });
  
  // Limita histórico a últimas 6 mensagens (3 interações) para não poluir o contexto
  const recentHistory = history.slice(-6);
  const currentHistory = [...recentHistory];
  const systemPrompt = CREATOR_SYSTEM_PROMPT.replace("{{isGroup}}", isGroup ? "true" : "false");

  let loops = 0;
  const maxLoops = 7;
  let isFirstLoop = true;

  while (loops < maxLoops) {
    loops++;
    
    // Mesclar instruções de sistema diretamente no primeiro prompt do usuário
    const currentPrompt = isFirstLoop
      ? `${systemPrompt}\n\n---\nPedido do Criador:\n${prompt}`
      : "O sistema executou a ferramenta acima. Analise o resultado. Se precisar de mais ferramentas, chame outra. Caso contrário, diga ao Criador o resultado final.";
    
    logDebug(`LOOP ${loops} - ASKING OLLAMA`, { currentPrompt: currentPrompt.substring(0, 200) + "...", historyLength: currentHistory.length });
    
    const answer = await askOllama({
      prompt: currentPrompt,
      system: "", // System prompt já está embutido no prompt do usuário. Vazio para não injetar o prompt de resenha.
      history: currentHistory,
      temperature: 0.05,
      timeoutMs: 60000 // 60s para dar tempo do modelo raciocinar com ferramentas
    });

    isFirstLoop = false;

    if (!answer) {
      logDebug(`LOOP ${loops} - NO ANSWER RECEIVED`);
      return "⚠️ Nenhuma resposta gerada pelo modelo da I.A. dev.";
    }

    logDebug(`LOOP ${loops} - OLLAMA ANSWER`, answer);

    const toolCall = extractToolCall(answer);

    if (toolCall) {
      console.log(`[CreatorAI] Ferramenta detectada: ${toolCall.tool}`);
      logDebug(`LOOP ${loops} - TOOL DETECTED`, toolCall);
      
      let toolResult;
      try {
        toolResult = await executeTool(toolCall.tool, toolCall.args, { groupJid, sock });
      } catch (err) {
        toolResult = `Erro na ferramenta: ${err.message}`;
      }

      logDebug(`LOOP ${loops} - TOOL RESULT`, toolResult);

      // Adiciona o histórico do loop de ReAct
      currentHistory.push({ role: "user", content: currentPrompt });
      currentHistory.push({ role: "assistant", content: answer });
      currentHistory.push({ role: "user", content: `[System Tool Output]:\n${toolResult}` });
    } else {
      // Resposta textual final
      logDebug("AGENT END / FINAL RESPONSE", answer);
      return answer;
    }
  }

  logDebug("AGENT END / MAX LOOPS REACHED");
  return "⚠️ Limite máximo de chamadas de ferramentas atingido (7 loops ReAct).";
}
