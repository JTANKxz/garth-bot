import fs from "fs";
import yt from "@vreden/youtube_scraper";

async function downloadFromProvider(result, outputFile) {
  const downloadUrl = result?.download?.url;
  if (!result?.status || !downloadUrl) {
    throw new Error("o provedor não retornou uma mídia disponível");
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`falha ao baixar a mídia do provedor (HTTP ${response.status})`);
  }

  fs.writeFileSync(outputFile, Buffer.from(await response.arrayBuffer()));
  return result.metadata || {};
}

export async function downloadYoutubeAudio(url, outputFile) {
  const result = await yt.ytmp3(url, 128);
  return downloadFromProvider(result, outputFile);
}

export async function downloadYoutubeVideo(url, outputFile) {
  const result = await yt.ytmp4(url, 480);
  return downloadFromProvider(result, outputFile);
}
