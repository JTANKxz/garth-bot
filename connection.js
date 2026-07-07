// connection.js
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
} from "baileys";

import fs from "fs/promises";
import pino from "pino";
import QRCode from "qrcode-terminal";
import { groupHandler } from "./src/handler/groupHandler.js";

const logger = pino({ level: "silent" });

export async function connectBot(
  phoneNumber,
  messageHandler,
  connectionMethod = "qr",
) {
  try {
    console.log("🚀 Iniciando bot...");

    await fs.mkdir("./auth", { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      logger,
    });

    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // ==========================
      // QR CODE
      // ==========================
      if (qr && connectionMethod === "qr") {
        console.clear();
        console.log("\n📱 ESCANEIE O QR CODE:\n");
        QRCode.generate(qr, { small: true });
        console.log("");
      }

      // ==========================
      // PAIRING CODE
      // ==========================
      if (
        connection === "connecting" &&
        connectionMethod === "pairing" &&
        !pairingRequested
      ) {
        pairingRequested = true;

        setTimeout(async () => {
          try {
            if (!sock.authState.creds.registered && phoneNumber) {
              console.log(
                `\n🔐 Gerando código para ${phoneNumber}...\n`,
              );

              const code = await sock.requestPairingCode(phoneNumber);

              console.log("═══════════════════════════════");
              console.log("📟 CÓDIGO DE PAREAMENTO");
              console.log(code);
              console.log("═══════════════════════════════");
            }
          } catch (e) {
            console.log("Erro:", e.message);
            pairingRequested = false;
          }
        }, 3000);
      }

      // ==========================
      // CONECTADO
      // ==========================
      if (connection === "open") {
        console.clear();

        console.log("✅ BOT CONECTADO!");

        if (sock.user) {
          console.log(
            "📞 Número:",
            sock.user.id.replace("@s.whatsapp.net", ""),
          );
        }

        pairingRequested = false;
      }

      // ==========================
      // DESCONECTOU
      // ==========================
      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        console.log(
          `❌ Conexão encerrada (${statusCode}).`,
        );

        if (
          statusCode === DisconnectReason.loggedOut ||
          statusCode === 401
        ) {
          console.log("🧹 Limpando sessão...");

          try {
            await fs.rm("./auth", {
              recursive: true,
              force: true,
            });

            await fs.mkdir("./auth", {
              recursive: true,
            });

            console.log("✅ Sessão apagada.");
          } catch (err) {
            console.log(err);
          }
        }

        console.log("🔄 Reconectando em 5 segundos...");

        setTimeout(() => {
          connectBot(
            phoneNumber,
            messageHandler,
            connectionMethod,
          );
        }, 5000);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      if (messageHandler) {
        await messageHandler(messages, sock);
      }
    });

    sock.ev.on("group-participants.update", async (update) => {
      await groupHandler(sock, update);
    });

    return sock;
  } catch (err) {
    console.log("💥 Erro:", err);

    setTimeout(() => {
      connectBot(
        phoneNumber,
        messageHandler,
        connectionMethod,
      );
    }, 10000);
  }
}