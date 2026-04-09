import gplay from "google-play-scraper";

const pendingAppSearch = new Map();
/*
  key: sender
  value: {
    jid,
    results,
    expires
  }
*/

export function createAppSearch(sender, jid, results) {
    pendingAppSearch.set(sender, {
        jid,
        results,
        expires: Date.now() + 60_000 // 1 minuto
    });
}

export async function buscarAppListener(sock, msg, text) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const state = pendingAppSearch.get(sender);
    if (!state) return false;

    //  expirou
    if (Date.now() > state.expires) {
        pendingAppSearch.delete(sender);
        return false;
    }

    const choice = parseInt(text);
    if (!choice || choice < 1 || choice > state.results.length) {
        return true; // consome a mensagem, mas mantém o estado
    }

    const baseApp = state.results[choice - 1];

    let fullApp = null;

    if (baseApp.appId) {
        try {
            fullApp = await gplay.app({
                appId: baseApp.appId,
                lang: "pt",
                country: "br"
            });
        } catch (err) {
            console.error("Erro ao buscar detalhes do app:", err);
        }
    }

    const app = fullApp || baseApp;

    let priceInfo = "Indefinido";
    if (app.free === true) {
        priceInfo = "Grátis";
    } else if (app.free === false) {
        priceInfo = app.priceText || "Pago";
    }

    const iapInfo =
        app.offersIAP === true
            ? "Possui compras no app"
            : app.offersIAP === false
                ? "Sem compras internas"
                : "Não informado";
                
    const detailText =
`╔════ ❖ *GARTH BOT* ❖ ════╗
> Título:
> ${app.title || "Desconhecido"}

> Desenvolvedor:
> ${app.developer || "Desconhecido"}

> Avaliação:
> ⭐ ${app.scoreText || "N/A"} (${app.reviews || 0} avaliações)

> Preço:
> ${priceInfo}

> Compras internas:
> ${iapInfo}

> Instalações:
> ${app.installs || "N/A"}

> Link:
> ${app.url || "Indisponível"}
╚════ *By: @joaotankz* ════╝`;

    await sock.sendMessage(
        state.jid,
        {
            image: { url: app.icon || baseApp.icon },
            caption: detailText
        },
        { quoted: msg }
    );

    // 🧹 consome o estado
    pendingAppSearch.delete(sender);
    return true;
}
