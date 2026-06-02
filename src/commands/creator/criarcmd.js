// src/commands/creator/criarcmd.js
import { createCustomCommand } from "../../utils/customCommands.js";

// Session state para rastrear progresso do wizard
const wizardState = {};

const STEP_NAME = 1;
const STEP_TYPE = 2;
const STEP_CATEGORY = 3;
const STEP_RESPONSES = 4;
const STEP_CONFIRM = 5;

const TYPES = {
  "1": "message",
  "2": "random",
  "3": "sequential",
  "4": "regex",
  "5": "action"
};

const CATEGORIES = {
  "1": "public",
  "2": "admin",
  "3": "owner",
  "4": "creator"
};

export default {
  name: "criarcmd",
  aliases: ["newcmd", "makecmd"],
  description: "Criar um comando customizado",
  usage: ".criarcmd",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const input = args.join(" ").trim();

    // Se não tem entrada, mostrar menu
    if (!input) {
      const hasState = wizardState[sender];
      
      if (hasState) {
        return sock.sendMessage(jid, { 
          text: "⏳ Você tem um comando em progresso.\n\nContinue respondendo ou digite 'cancel' para cancelar." 
        }, { quoted: msg });
      }

      // Iniciar novo comando
      wizardState[sender] = {
        step: STEP_NAME,
        data: {}
      };

      const menu = `╔═══✦ *CRIAR COMANDO* ✦═══
║
║ 👇 Digite o **nome do comando**
║ Exemplo: meucomando
║
║ (Digite 'cancel' para cancelar)
╚═════════════════════`;

      return sock.sendMessage(jid, { text: menu }, { quoted: msg });
    }

    // Cancelar
    if (input.toLowerCase() === "cancel") {
      delete wizardState[sender];
      return sock.sendMessage(jid, { text: "❌ Criação cancelada." }, { quoted: msg });
    }

    // Processar entrada baseada no step atual
    const state = wizardState[sender];
    
    if (!state) {
      return sock.sendMessage(jid, { 
        text: "❌ Nenhum comando em progresso.\n\nDigite `.criarcmd` para começar." 
      }, { quoted: msg });
    }

    // === STEP 1: Nome do comando ===
    if (state.step === STEP_NAME) {
      if (!/^[a-z0-9]+$/.test(input)) {
        return sock.sendMessage(jid, { 
          text: "❌ Nome inválido.\nUse apenas letras e números (sem espaços)." 
        }, { quoted: msg });
      }

      state.data.name = input;
      state.step = STEP_TYPE;

      const typeMenu = `╔═══✦ *ESCOLHA O TIPO* ✦═══
║
║ 1️⃣ Mensagem simples
║ 2️⃣ Resposta aleatória
║ 3️⃣ Múltiplas mensagens
║ 4️⃣ Resposta com regex
║ 5️⃣ Executar ação (sticker)
║
║ Digite: 1, 2, 3, 4 ou 5
╚═════════════════════`;

      return sock.sendMessage(jid, { text: typeMenu }, { quoted: msg });
    }

    // === STEP 2: Tipo ===
    if (state.step === STEP_TYPE) {
      if (!TYPES[input]) {
        return sock.sendMessage(jid, { 
          text: "❌ Opção inválida.\nDigite 1, 2, 3, 4 ou 5." 
        }, { quoted: msg });
      }

      state.data.type = TYPES[input];
      state.step = STEP_CATEGORY;

      const catMenu = `╔═══✦ *ESCOLHA A CATEGORIA* ✦═══
║
║ 1️⃣ Público (qualquer um)
║ 2️⃣ Admin (apenas admins)
║ 3️⃣ Owner (donos)
║ 4️⃣ Criador (só você)
║
║ Digite: 1, 2, 3 ou 4
╚═════════════════════`;

      return sock.sendMessage(jid, { text: catMenu }, { quoted: msg });
    }

    // === STEP 3: Categoria ===
    if (state.step === STEP_CATEGORY) {
      if (!CATEGORIES[input]) {
        return sock.sendMessage(jid, { 
          text: "❌ Opção inválida.\nDigite 1, 2, 3 ou 4." 
        }, { quoted: msg });
      }

      state.data.category = CATEGORIES[input];
      state.data.responses = [];
      state.data.actions = [];
      state.step = STEP_RESPONSES;

      let prompt = "";
      if (state.data.type === "message") {
        prompt = "Digite a **mensagem:**";
      } else if (state.data.type === "random") {
        prompt = "Digite as **respostas aleatórias**\n(uma por mensagem, depois 'feito')";
      } else if (state.data.type === "sequential") {
        prompt = "Digite as **mensagens sequenciais**\n(uma por mensagem, depois 'feito')";
      } else if (state.data.type === "regex") {
        prompt = "Digite **padrão regex** (ex: oi|olá|opa)\nDepois as respostas, então 'feito'";
      } else if (state.data.type === "action") {
        prompt = "Qual ação? Digite: **sticker**";
      }

      return sock.sendMessage(jid, { 
        text: `✏️ Tipo: ${state.data.type}\nCategoria: ${state.data.category}\n\n${prompt}` 
      }, { quoted: msg });
    }

    // === STEP 4: Respostas/Ações ===
    if (state.step === STEP_RESPONSES) {
      if (input === "feito") {
        if (state.data.responses.length === 0 && state.data.actions.length === 0) {
          return sock.sendMessage(jid, { 
            text: "❌ Adicione pelo menos uma resposta/ação." 
          }, { quoted: msg });
        }

        state.step = STEP_CONFIRM;

        let summary = `╔═══✦ *CONFIRMAR* ✦═══
║
║ 📝 Nome: .${state.data.name}
║ 🎯 Tipo: ${state.data.type}
║ 🏷️ Categoria: ${state.data.category}`;

        if (state.data.responses.length > 0) {
          summary += `\n║ 💬 Respostas: ${state.data.responses.length}`;
        }
        if (state.data.actions.length > 0) {
          summary += `\n║ ⚙️ Ações: ${state.data.actions.length}`;
        }

        summary += `\n║
║ Digite: **confirmar** ou **cancel**
╚═════════════════════`;

        return sock.sendMessage(jid, { text: summary }, { quoted: msg });
      }

      // Adicionar resposta/ação
      if (state.data.type === "action") {
        if (input === "sticker") {
          state.data.actions.push({ type: "sticker" });
          return sock.sendMessage(jid, { 
            text: "✅ Ação adicionada.\n\nDigite 'feito' para confirmar." 
          }, { quoted: msg });
        } else {
          return sock.sendMessage(jid, { 
            text: "❌ Ação desconhecida. Tente: sticker" 
          }, { quoted: msg });
        }
      } else {
        state.data.responses.push(input);
        return sock.sendMessage(jid, { 
          text: `✅ Resposta ${state.data.responses.length} adicionada.\n\nDigite outra ou 'feito':` 
        }, { quoted: msg });
      }
    }

    // === STEP 5: Confirmar ===
    if (state.step === STEP_CONFIRM) {
      if (input === "confirmar") {
        const success = createCustomCommand({
          name: state.data.name,
          type: state.data.type,
          responses: state.data.responses,
          actions: state.data.actions,
          category: state.data.category,
          createdBy: sender
        });

        delete wizardState[sender];

        if (success) {
          return sock.sendMessage(jid, { 
            text: `✅ Comando **.${state.data.name}** criado!\n\n🏷️ Categoria: ${state.data.category}\n\nUse: `.${state.data.name}`\n\nGerenciar: .listcmd, .delcmd` 
          }, { quoted: msg });
        } else {
          return sock.sendMessage(jid, { 
            text: "❌ Erro ao criar comando." 
          }, { quoted: msg });
        }
      }

      return sock.sendMessage(jid, { 
        text: "❌ Digite 'confirmar' ou 'cancel'." 
      }, { quoted: msg });
    }
  }
};
║ 👇 Digite o nome do comando
║ Exemplo: meucomando
║
║ (Digite 'cancel' para cancelar)
╚═════════════════════`;

      return sock.sendMessage(jid, { text: menu }, { quoted: msg });
    }

    if (text === "cancel") {
      delete wizardState[sender];
      return sock.sendMessage(jid, { text: "❌ Criação de comando cancelada." }, { quoted: msg });
    }

    // Processar entrada baseada no step
    const state = wizardState[sender];
    if (!state) {
      return sock.sendMessage(jid, { 
        text: "❌ Use `.criarcmd` para começar um novo comando." 
      }, { quoted: msg });
    }

    // STEP 1: Validar nome do comando
    if (state.step === STEP_NAME) {
      if (!/^[a-z0-9]+$/.test(text)) {
        return sock.sendMessage(jid, { 
          text: "❌ Nome inválido. Use apenas letras e números (sem espaços)." 
        }, { quoted: msg });
      }

      state.data.name = text;
      state.step = STEP_TYPE;

      const typeMenu = `
╔═══✦ *ESCOLHA O TIPO* ✦═══
║
║ 1️⃣ Mensagem simples
║ 2️⃣ Resposta aleatória
║ 3️⃣ Múltiplas mensagens
║ 4️⃣ Resposta com regex
║ 5️⃣ Executar ação (sticker)
║
║ Digite o número:
╚═════════════════════`;

      return sock.sendMessage(jid, { text: typeMenu }, { quoted: msg });
    }

    // STEP 2: Validar tipo
    if (state.step === STEP_TYPE) {
      if (!TYPES[text]) {
        return sock.sendMessage(jid, { 
          text: "❌ Escolha inválida. Digite 1, 2, 3, 4 ou 5." 
        }, { quoted: msg });
      }

      state.data.type = TYPES[text];
      state.step = STEP_CATEGORY;

      const catMenu = `
╔═══✦ *ESCOLHA A CATEGORIA* ✦═══
║
║ 1️⃣ Público
║ 2️⃣ Admin
║ 3️⃣ Owner
║ 4️⃣ Criador
║
║ Digite o número:
╚═════════════════════`;

      return sock.sendMessage(jid, { text: catMenu }, { quoted: msg });
    }

    // STEP 3: Validar categoria
    if (state.step === STEP_CATEGORY) {
      if (!CATEGORIES[text]) {
        return sock.sendMessage(jid, { 
          text: "❌ Escolha inválida. Digite 1, 2, 3 ou 4." 
        }, { quoted: msg });
      }

      state.data.category = CATEGORIES[text];
      state.step = STEP_RESPONSES;

      let typeMsg = "";
      if (state.data.type === "message") {
        typeMsg = "Digite a mensagem:";
      } else if (state.data.type === "random") {
        typeMsg = "Digite as respostas aleatórias (uma por mensagem, digite 'feito' quando terminar):";
      } else if (state.data.type === "sequential") {
        typeMsg = "Digite as mensagens sequenciais (uma por mensagem, digite 'feito' quando terminar):";
      } else if (state.data.type === "regex") {
        typeMsg = "Digite o padrão regex (ex: oi|olá|opa) e depois as respostas (uma por mensagem, digite 'feito'):";
      } else if (state.data.type === "action") {
        typeMsg = "Qual ação? Digite: sticker";
      }

      state.data.responses = [];
      state.data.actions = [];

      return sock.sendMessage(jid, { 
        text: `✏️ Tipo: ${state.data.type}\n\n${typeMsg}` 
      }, { quoted: msg });
    }

    // STEP 4: Coletar respostas/ações
    if (state.step === STEP_RESPONSES) {
      if (text === "feito") {
        if (state.data.responses.length === 0 && state.data.actions.length === 0) {
          return sock.sendMessage(jid, { 
            text: "❌ Adicione pelo menos uma resposta ou ação." 
          }, { quoted: msg });
        }

        state.step = STEP_CONFIRM;

        // Resumo
        let summary = `
╔═══✦ *CONFIRMAR COMANDO* ✦═══
║
║ 📝 Nome: ${state.data.name}
║ 🎯 Tipo: ${state.data.type}
║ 🏷️ Categoria: ${state.data.category}`;

        if (state.data.responses.length > 0) {
          summary += `\n║ 💬 Respostas: ${state.data.responses.length}`;
        }
        if (state.data.actions.length > 0) {
          summary += `\n║ ⚙️ Ações: ${state.data.actions.length}`;
        }

        summary += `\n║
║ Digite 'confirmar' para criar ou 'cancel' para cancelar
╚═════════════════════`;

        return sock.sendMessage(jid, { text: summary }, { quoted: msg });
      }

      // Adicionar resposta ou ação
      if (state.data.type === "action") {
        if (text === "sticker") {
          state.data.actions.push({ type: "sticker" });
          return sock.sendMessage(jid, { 
            text: "✅ Ação adicionada. Digite 'feito' para confirmar." 
          }, { quoted: msg });
        } else {
          return sock.sendMessage(jid, { 
            text: "❌ Ação desconhecida. Tente 'sticker'." 
          }, { quoted: msg });
        }
      } else {
        state.data.responses.push(text);
        return sock.sendMessage(jid, { 
          text: `✅ Resposta ${state.data.responses.length} adicionada.\n\nDigite outra ou 'feito':` 
        }, { quoted: msg });
      }
    }

    // STEP 5: Confirmar criação
    if (state.step === STEP_CONFIRM) {
      if (text === "confirmar") {
        const success = createCustomCommand({
          name: state.data.name,
          type: state.data.type,
          responses: state.data.responses,
          actions: state.data.actions,
          category: state.data.category,
          createdBy: sender
        });

        delete wizardState[sender];

        if (success) {
          return sock.sendMessage(jid, { 
            text: `✅ Comando *.${state.data.name}* criado com sucesso!\n\nCategoria: ${state.data.category}` 
          }, { quoted: msg });
        } else {
          return sock.sendMessage(jid, { 
            text: "❌ Erro ao criar comando." 
          }, { quoted: msg });
        }
      }

      return sock.sendMessage(jid, { 
        text: "❌ Digite 'confirmar' ou 'cancel'." 
      }, { quoted: msg });
    }
  }
};
