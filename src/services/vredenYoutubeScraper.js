// Adaptado de @vreden/youtube_scraper 1.2.9 (MIT).
// Mantido localmente para não depender de uma reinstalação de dependências do bot.
import axios from "axios";
import yts from "yt-search";
import { createDecipheriv } from "crypto";

const AUDIO_QUALITIES = [92, 128, 256, 320];
const VIDEO_QUALITIES = [144, 360, 480, 720, 1080];
const SAVE_TUBE_KEY = "C5D58EF67A7584E4A29F6C35BBC4EB12";
const PROVIDER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
  Referer: "https://save-tube.com/",
};

function getVideoId(value) {
  const match = String(value).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function decryptProviderPayload(payload) {
  const data = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-128-cbc", Buffer.from(SAVE_TUBE_KEY, "hex"), data.subarray(0, 16));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(16)), decipher.final()]).toString());
}

async function requestDownload(url, quality, type) {
  const cdn = (await axios.get("https://media.savetube.vip/api/random-cdn")).data.cdn;
  const infoResponse = await axios.post(`https://${cdn}/v2/info`, { url }, { headers: PROVIDER_HEADERS });
  const info = decryptProviderPayload(infoResponse.data.data);
  const downloadResponse = await axios.post(`https://${cdn}/download`, {
    downloadType: type,
    quality: String(quality),
    key: info.key,
  }, { headers: { ...PROVIDER_HEADERS, "Content-Type": "application/json" } });

  const extension = type === "audio" ? "mp3" : "mp4";
  return {
    status: true,
    quality: `${quality}${type === "audio" ? "kbps" : "p"}`,
    url: downloadResponse.data.data.downloadUrl,
    filename: `${info.title} (${quality}${type === "audio" ? "kbps" : "p"}).${extension}`,
  };
}

async function convert(url, quality, type) {
  const videoId = getVideoId(url);
  if (!videoId) return { status: false, message: "Link do YouTube inválido." };

  const allowedQualities = type === "audio" ? AUDIO_QUALITIES : VIDEO_QUALITIES;
  const selectedQuality = allowedQualities.includes(Number(quality))
    ? Number(quality)
    : type === "audio" ? 128 : 360;
  const videoUrl = `https://youtube.com/watch?v=${videoId}`;

  try {
    const [searchData, download] = await Promise.all([
      yts(videoUrl),
      requestDownload(videoUrl, selectedQuality, type),
    ]);
    return { status: true, metadata: searchData.all[0], download };
  } catch (error) {
    console.error("Erro no provedor vreden:", error.message);
    return { status: false, message: "O provedor não conseguiu converter essa mídia." };
  }
}

export function ytmp3(url, quality = 128) {
  return convert(url, quality, "audio");
}

export function ytmp4(url, quality = 360) {
  return convert(url, quality, "video");
}
