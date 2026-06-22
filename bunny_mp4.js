const crypto = require('crypto');

// ==========================================
// CONFIGURAÇÕES (Insira seus dados aqui)
// ==========================================
const BUNNY_MP4_KEY = 'SUA_CHAVE_DE_SEGURANCA_MP4';
const BUNNY_HOST = 'cdn.seusite.com'; // Substitua pelo seu host configurado para o Storage (sem https://)
const FILE_PATH = '/caminho/do/filme.mp4'; // Caminho do arquivo começando com barra
const EXPIRATION_HOURS = 4; // Horas de validade do link
// ==========================================

function generateSignedMp4Url() {
    const expires = Math.floor(Date.now() / 1000) + (EXPIRATION_HOURS * 3600);
    const userIp = ''; // Deixe vazio a não ser que queira atrelar ao IP do usuário
    const parameterData = '';

    // Hashable Base: SecurityKey + path + expires + userIp + parameterData
    const signatureBase = `${BUNNY_MP4_KEY}${FILE_PATH}${expires}${userIp}${parameterData}`;
    
    // Cria o Hash SHA-256 e o codifica em base64
    const hash = crypto.createHash('sha256').update(signatureBase).digest('base64');
    
    // Converte para Base64 URL Safe (substitui + por -, / por _ e remove o = do final)
    const token = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Monta a URL final
    const signedUrl = `https://${BUNNY_HOST}${FILE_PATH}?token=${token}&expires=${expires}`;
    
    return signedUrl;
}

console.log("--------------------------------------------------");
console.log("🐰 BUNNY STORAGE MP4 SIGNED URL GENERATOR");
console.log("--------------------------------------------------");
console.log(generateSignedMp4Url());
console.log("--------------------------------------------------");
