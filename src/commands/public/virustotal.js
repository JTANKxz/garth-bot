import { isIP } from "node:net";
import { createHash } from "node:crypto";
import { downloadMediaMessage, getContentType } from "baileys";
import { getGroupConfig } from "../../utils/groups.js";

const API_BASE = "https://www.virustotal.com/api/v3";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;
const MEDIA_TYPES = new Set([
  "documentMessage",
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "stickerMessage",
]);

function formatDate(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value * 1000));
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = units[0];

  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }

  return `${size.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`;
}

function safeText(value, maxLength = 180) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value).replace(/[\r\n\t]+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeTarget(raw) {
  return raw.trim().replace(/^<(.+)>$/, "$1").replace(/[.,;]+$/, "");
}

function unwrapMessage(message) {
  let current = message;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    const wrapper =
      current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message;

    if (!wrapper) break;
    current = wrapper;
  }

  return current;
}

function getAttachedMedia(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const content = unwrapMessage(quoted || msg.message);
  const type = content ? getContentType(content) : null;

  if (!type || !MEDIA_TYPES.has(type)) return null;

  const media = content[type];
  const extensions = {
    documentMessage: "bin",
    imageMessage: "jpg",
    videoMessage: "mp4",
    audioMessage: "ogg",
    stickerMessage: "webp",
  };

  return {
    content,
    media,
    type,
    fileName: safeText(media?.fileName || `arquivo.${extensions[type]}`, 120),
    mimeType: media?.mimetype || "application/octet-stream",
  };
}

export function identifyTarget(rawTarget) {
  const target = normalizeTarget(rawTarget);

  if (/^[a-f\d]{32}$/i.test(target) || /^[a-f\d]{40}$/i.test(target) || /^[a-f\d]{64}$/i.test(target)) {
    return { kind: "file", endpoint: `files/${target.toLowerCase()}`, value: target.toLowerCase() };
  }

  if (/^https?:\/\//i.test(target)) {
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      throw new Error("INVALID_TARGET");
    }

    if (!parsed.hostname) throw new Error("INVALID_TARGET");
    const normalizedUrl = parsed.href;
    const urlId = Buffer.from(normalizedUrl).toString("base64url");
    return { kind: "url", endpoint: `urls/${urlId}`, value: normalizedUrl };
  }

  if (isIP(target)) {
    return { kind: "ip", endpoint: `ip_addresses/${encodeURIComponent(target)}`, value: target };
  }

  const domain = target.toLowerCase().replace(/\.$/, "");
  if (
    domain.length <= 253 &&
    domain.includes(".") &&
    domain.split(".").every((part) => /^(?!-)[a-z\d-]{1,63}(?<!-)$/i.test(part))
  ) {
    return { kind: "domain", endpoint: `domains/${encodeURIComponent(domain)}`, value: domain };
  }

  throw new Error("INVALID_TARGET");
}

function getCategories(categories) {
  if (!categories) return "—";
  const values = Array.isArray(categories) ? categories : Object.values(categories);
  const unique = [...new Set(values.filter(Boolean).map((value) => safeText(value, 50)))];
  return unique.slice(0, 4).join(", ") || "—";
}

function buildReport(target, responseData) {
  const data = responseData?.data || {};
  const attributes = data.attributes || {};
  const stats = attributes.last_analysis_stats || {};
  const malicious = Number(stats.malicious) || 0;
  const suspicious = Number(stats.suspicious) || 0;
  const harmless = Number(stats.harmless) || 0;
  const undetected = Number(stats.undetected) || 0;
  const timeout = Number(stats.timeout) || 0;
  const total = malicious + suspicious + harmless + undetected + timeout;

  const verdict = malicious > 0
    ? `🔴 Malicioso (${malicious} detecção${malicious === 1 ? "" : "ões"})`
    : suspicious > 0
      ? `🟠 Suspeito (${suspicious} alerta${suspicious === 1 ? "" : "s"})`
      : total > 0
        ? "🟢 Nenhuma detecção"
        : "⚪ Sem análise disponível";

  const labels = {
    file: "Arquivo (hash)",
    url: "URL",
    domain: "Domínio",
    ip: "Endereço IP",
  };

  const lines = [
    "🛡️ *VirusTotal*",
    "",
    `> *Tipo:* ${labels[target.kind]}`,
    `> *Alvo:* ${safeText(target.value)}`,
    `> *Resultado:* ${verdict}`,
    `> *Motores:* ${malicious} malicioso(s), ${suspicious} suspeito(s), ${harmless} inofensivo(s), ${undetected} sem detecção`,
    `> *Última análise:* ${formatDate(attributes.last_analysis_date)}`,
    `> *Reputação da comunidade:* ${Number.isFinite(Number(attributes.reputation)) ? Number(attributes.reputation) : "—"}`,
  ];

  if (target.kind === "file") {
    lines.push(
      `> *Nome:* ${safeText(attributes.meaningful_name || attributes.names?.[0])}`,
      `> *Formato:* ${safeText(attributes.type_description)}`,
      `> *Tamanho:* ${formatBytes(attributes.size)}`,
      `> *SHA-256:* ${safeText(attributes.sha256, 80)}`,
    );
  } else if (target.kind === "url") {
    lines.push(
      `> *Título:* ${safeText(attributes.title)}`,
      `> *URL final:* ${safeText(attributes.last_final_url || attributes.url)}`,
      `> *Categorias:* ${getCategories(attributes.categories)}`,
    );
  } else if (target.kind === "domain") {
    lines.push(
      `> *Registrador:* ${safeText(attributes.registrar)}`,
      `> *Criação:* ${formatDate(attributes.creation_date)}`,
      `> *Categorias:* ${getCategories(attributes.categories)}`,
    );
  } else if (target.kind === "ip") {
    lines.push(
      `> *País:* ${safeText(attributes.country)}`,
      `> *Rede:* ${safeText(attributes.network)}`,
      `> *ASN/Provedor:* ${safeText(attributes.asn)} — ${safeText(attributes.as_owner)}`,
    );
  }

  if (data.id) {
    const guiTypes = { file: "file", url: "url", domain: "domain", ip: "ip-address" };
    lines.push("", `🔗 https://www.virustotal.com/gui/${guiTypes[target.kind]}/${encodeURIComponent(data.id)}`);
  }

  lines.push("", "_O resultado não garante que o alvo seja seguro. Evite abrir links ou arquivos desconhecidos._");
  return lines.join("\n");
}

async function requestReport(target, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/${target.endpoint}`, {
      headers: {
        accept: "application/json",
        "x-apikey": apiKey,
      },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(body?.error?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadFile(buffer, fileName, mimeType, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), fileName);

    const response = await fetch(`${API_BASE}/files`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-apikey": apiKey,
      },
      body: form,
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadAttachment(sock, attachment) {
  return downloadMediaMessage(
    { message: attachment.content },
    "buffer",
    {},
    { reuploadRequest: sock.updateMediaMessage },
  );
}

function getErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "❌ A chave da API do VirusTotal é inválida ou não tem permissão para esta consulta.";
  }
  if (error?.status === 429) {
    return "⏳ O limite de consultas do VirusTotal foi atingido. Tente novamente mais tarde.";
  }
  if (error?.name === "AbortError") {
    return "⏳ O VirusTotal demorou demais para responder. Tente novamente.";
  }
  return "❌ Não foi possível consultar o VirusTotal agora.";
}

export default {
  name: "virustotal",
  aliases: ["virus", "vt", "scan"],
  description: "Consulta arquivos, hashes, URLs, domínios ou IPs no VirusTotal",
  usage: "virustotal <alvo> ou responda um arquivo",
  category: "utils",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const prefix = jid.endsWith("@g.us") ? getGroupConfig(jid)?.prefix || "!" : "!";
    const rawTarget = args.join(" ").trim();
    const attachment = getAttachedMedia(msg);
    const shouldUpload = ["enviar", "upload", "analisar"].includes(rawTarget.toLowerCase());

    if (!rawTarget && !attachment) {
      return sock.sendMessage(
        jid,
        {
          text:
            `📌 *Uso:* ${prefix}virustotal <alvo>\n\n` +
            `Exemplos:\n` +
            `> ${prefix}vt https://exemplo.com/arquivo\n` +
            `> ${prefix}vt exemplo.com\n` +
            `> ${prefix}vt 8.8.8.8\n` +
            `> ${prefix}vt <MD5, SHA-1 ou SHA-256>\n` +
            `> Responda um arquivo com ${prefix}vt\n` +
            `> Para enviar um arquivo desconhecido: ${prefix}vt enviar`,
        },
        { quoted: msg },
      );
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY?.trim();
    if (!apiKey) {
      return sock.sendMessage(
        jid,
        { text: "⚠️ A API do VirusTotal ainda não foi configurada pelo responsável do bot." },
        { quoted: msg },
      );
    }

    if (shouldUpload && !attachment) {
      return sock.sendMessage(
        jid,
        { text: `❌ Responda ou anexe o arquivo que deseja enviar usando *${prefix}vt enviar*.` },
        { quoted: msg },
      );
    }

    if (attachment && (!rawTarget || shouldUpload)) {
      await sock.sendMessage(jid, { react: { text: "🔎", key: msg.key } });

      try {
        const declaredSize = Number(attachment.media?.fileLength || 0);
        if (declaredSize > MAX_UPLOAD_BYTES) {
          throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" });
        }

        const buffer = await downloadAttachment(sock, attachment);
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
          throw new Error("EMPTY_FILE");
        }
        if (buffer.length > MAX_UPLOAD_BYTES) {
          throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" });
        }

        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const target = identifyTarget(sha256);

        try {
          const report = await requestReport(target, apiKey);
          await sock.sendMessage(jid, { text: buildReport(target, report) }, { quoted: msg });
          return sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (error) {
          if (error?.status !== 404) throw error;

          if (!shouldUpload) {
            await sock.sendMessage(jid, { react: { text: "ℹ️", key: msg.key } });
            return sock.sendMessage(
              jid,
              {
                text:
                  `ℹ️ *Arquivo desconhecido no VirusTotal*\n\n` +
                  `> *Nome:* ${attachment.fileName}\n` +
                  `> *Tamanho:* ${formatBytes(buffer.length)}\n` +
                  `> *SHA-256:* ${sha256}\n\n` +
                  `Para enviá-lo à análise pública, responda novamente com *${prefix}vt enviar*.\n\n` +
                  `_Atenção: arquivos enviados passam a integrar a base pública do VirusTotal. Não envie conteúdo pessoal ou confidencial._`,
              },
              { quoted: msg },
            );
          }

          const upload = await uploadFile(
            buffer,
            attachment.fileName,
            attachment.mimeType,
            apiKey,
          );
          const analysisId = upload?.data?.id;

          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
          return sock.sendMessage(
            jid,
            {
              text:
                `📤 *Arquivo enviado ao VirusTotal*\n\n` +
                `> *Nome:* ${attachment.fileName}\n` +
                `> *Tamanho:* ${formatBytes(buffer.length)}\n` +
                `> *SHA-256:* ${sha256}\n` +
                (analysisId ? `> *Análise:* ${safeText(analysisId, 180)}\n` : "") +
                `\nA análise está sendo processada. Consulte novamente em alguns minutos respondendo o arquivo com *${prefix}vt*.`,
            },
            { quoted: msg },
          );
        }
      } catch (error) {
        console.error("Erro ao consultar arquivo no VirusTotal:", error?.status || error?.name || error?.message);
        const message = error?.code === "FILE_TOO_LARGE"
          ? "❌ O arquivo excede o limite de 32 MB aceito por este comando. Você ainda pode consultar o hash dele."
          : getErrorMessage(error);

        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        return sock.sendMessage(jid, { text: message }, { quoted: msg });
      }
    }

    let target;
    try {
      target = identifyTarget(rawTarget);
    } catch {
      return sock.sendMessage(
        jid,
        { text: "❌ Alvo inválido. Envie uma URL completa (com http/https), domínio, IP ou hash MD5/SHA-1/SHA-256." },
        { quoted: msg },
      );
    }

    await sock.sendMessage(jid, { react: { text: "🔎", key: msg.key } });

    try {
      const report = await requestReport(target, apiKey);
      await sock.sendMessage(jid, { text: buildReport(target, report) }, { quoted: msg });
      return sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("Erro no comando VirusTotal:", error?.status || error?.name || error?.message);

      let message = getErrorMessage(error);
      if (error?.status === 404) {
        message = "ℹ️ Esse alvo ainda não possui relatório no VirusTotal.";
      }

      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
      return sock.sendMessage(jid, { text: message }, { quoted: msg });
    }
  },
};
