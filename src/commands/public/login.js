export default {
  name: 'login',
  aliases: ['site', 'portal', 'conta'],
  description: 'Mostra como entrar ou criar sua conta no Portal FYNE',
  category: 'utils',

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const text =
      `🔐 *LOGIN NO PORTAL FYNE*\n\n` +
      `Acesse o endereço abaixo para gerar seu código de acesso:\n\n` +
      `🌐 https://fyne.online/conectar\n\n` +
      `Depois, volte a este grupo e envie o comando exibido no site. Exemplo:\n\n` +
      `> !vincular FYNE-AB12-CD34\n\n` +
      `Seu nome, foto e perfil do bot serão vinculados automaticamente. Não é necessário cadastrar e-mail ou senha.`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};