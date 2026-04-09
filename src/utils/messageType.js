// src/utils/messageType.js
export function getMessageType(message) {
    if (!message) return "unsupported"

    const keys = Object.keys(message)
    if (keys.includes("stickerMessage")) return "sticker"
    if (keys.includes("imageMessage")) return "image"
    if (keys.includes("videoMessage")) return "video"
    if (keys.includes("audioMessage")) return "audio"
    if (keys.includes("conversation")) return "text"
    if (keys.includes("extendedTextMessage")) {
        if (message.extendedTextMessage?.text) return "text"
        if (message.extendedTextMessage?.contextInfo?.quotedMessage) {
            return getMessageType(message.extendedTextMessage.contextInfo.quotedMessage)
        }
    }
    return "unsupported"
}

export function isSticker(message) {
    return getMessageType(message) === "sticker"
}
