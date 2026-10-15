import fs from "fs";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import youtubedl from "youtube-dl-exec";

const TEMP_DIR = path.resolve(process.cwd(), "temp");

function getOutputPath(extension) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const token = `youtube-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    token,
    template: path.join(TEMP_DIR, `${token}.%(ext)s`),
    extension,
  };
}

function findDownloadedFile(token, extension, stdout) {
  const reportedPath = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => fs.existsSync(line));

  if (reportedPath) return reportedPath;

  const expectedSuffix = `.${extension}`;
  const file = fs.readdirSync(TEMP_DIR).find((name) =>
    name.startsWith(token) && name.toLowerCase().endsWith(expectedSuffix)
  );

  if (!file) throw new Error("yt-dlp não gerou o arquivo de mídia esperado");
  return path.join(TEMP_DIR, file);
}

async function download(url, type) {
  const output = getOutputPath(type === "audio" ? "mp3" : "mp4");
  const commonOptions = {
    noPlaylist: true,
    noWarnings: true,
    noProgress: true,
    // O YouTube exige um resolvedor JavaScript em vários vídeos atuais.
    // O Node do bot já atende essa dependência do yt-dlp.
    jsRuntimes: "node",
    output: output.template,
    print: "after_move:filepath",
    ffmpegLocation: ffmpegPath,
  };

  try {
    const stdout = await youtubedl(url, type === "audio"
      ? {
          ...commonOptions,
          extractAudio: true,
          audioFormat: "mp3",
          audioQuality: "128K",
        }
      : {
          ...commonOptions,
          // Mantém o arquivo leve para envio no WhatsApp e une áudio + vídeo via FFmpeg.
          format: "bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b[height<=480]",
          mergeOutputFormat: "mp4",
        }
    );

    return findDownloadedFile(output.token, output.extension, stdout);
  } catch (error) {
    for (const file of fs.readdirSync(TEMP_DIR)) {
      if (file.startsWith(output.token)) {
        try { fs.unlinkSync(path.join(TEMP_DIR, file)); } catch {}
      }
    }
    throw error;
  }
}

export function downloadYoutubeAudio(url) {
  return download(url, "audio");
}

export function downloadYoutubeVideo(url) {
  return download(url, "video");
}
