import crypto from 'crypto';

// ==========================================
// CONFIGURAÇÕES
// ==========================================
const BUNNY_SECURITY_KEY = '8f0ef932-f737-478e-9ca5-d66eef7a681e';
const BUNNY_HOST = 'vz-c0ca8063-c73.b-cdn.net';
const VIDEO_ID = '292d842f-196e-4f25-815d-5b1d0fcc9b22';
const EXPIRATION_HOURS = 4;
// ==========================================

function generateSignedUrls() {
    const tokenPath = `/${VIDEO_ID}/`;
    const expires = Math.floor(Date.now() / 1000) + (EXPIRATION_HOURS * 3600);

    const parameterData = `token_path=${tokenPath}`;
    const userIp = '';

    const signatureBase =
        `${BUNNY_SECURITY_KEY}${tokenPath}${expires}${userIp}${parameterData}`;

    const token = crypto
        .createHash('sha256')
        .update(signatureBase)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const baseUrl =
        `https://${BUNNY_HOST}` +
        `/bcdn_token=${token}` +
        `&token_path=${encodeURIComponent(tokenPath)}` +
        `&expires=${expires}`;

    return {
        hls: `${baseUrl}/${VIDEO_ID}/playlist.m3u8`,
        fallback480: `${baseUrl}/${VIDEO_ID}/play_480p.mp4`,
        fallback720: `${baseUrl}/${VIDEO_ID}/play_720p.mp4`,
        fallback1080: `${baseUrl}/${VIDEO_ID}/play_1080p.mp4`,
    };
}

const urls = generateSignedUrls();

console.log("--------------------------------------------------");
console.log("🐰 BUNNY STREAM SIGNED URL GENERATOR");
console.log("--------------------------------------------------");
console.log("HLS:");
console.log(urls.hls);
console.log("");
console.log("Fallback 480p:");
console.log(urls.fallback480);
console.log("");
console.log("Fallback 720p:");
console.log(urls.fallback720);
console.log("");
console.log("Fallback 1080p:");
console.log(urls.fallback1080);
console.log("--------------------------------------------------");