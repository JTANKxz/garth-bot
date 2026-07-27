// Comandos que usam a economia/moeda do grupo. Manter esta lista centralizada
// permite desligar o RPG sem que os comandos emitam qualquer resposta.
const ECONOMY_COMMANDS = new Set([
  "abater", "apostar", "aviator", "abrir", "buffs", "caloteiros", "daily",
  "comprar", "cobrar", "consertar", "contratar", "curar", "defender",
  "demitir", "denunciar", "divida", "emprestimo", "espionar", "evoluir",
  "explorar", "fianca", "fuga", "hackear", "info", "lavar", "loja",
  "loteria", "mochila", "pagar", "perfil", "pet", "prender", "pressa",
  "roubar", "saldo", "saquear", "trabalhar", "usar",
  "tank", "addvip", "getvip", "ranksaldo", "ecohelp", "resetglobaleco",
  "resetsaldo", "reseteco", "setglobal", "ungive", "conquistas"
]);

export function isRpgEnabled(groupConfig) {
  return groupConfig?.rpg !== false;
}

export function isEconomyCommand(command) {
  return ECONOMY_COMMANDS.has(command?.name);
}
