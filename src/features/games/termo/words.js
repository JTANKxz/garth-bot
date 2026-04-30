/**
 * src/features/games/termo/words.js
 * Lista de palavras válidas de 5 letras em português para o jogo Termo.
 */

// Palavras que podem ser escolhidas como SECRETAS (comuns e conhecidas)
export const SECRET_WORDS = [
  "ABRIR", "ACASO", "ACIMA", "ACHAR", "ADEUS", "AGORA", "AINDA", "AJUDA",
  "ALDEIA", "ALERTA", "ALGUM", "ALIAS", "ALTAR", "AMIGO", "AMORA", "ANDAR",
  "ANIMO", "ANTES", "APOIO", "AREAL", "AREIA", "ARMAR", "ASSAZ", "ATLAS",
  "AVISO", "BALAO", "BANCO", "BANHA", "BARCO", "BATER", "BEIJO", "BEIRA",
  "BICHO", "BLOCO", "BOLHA", "BOLSA", "BRACO", "BRASA", "BRAVO", "BRIGA",
  "BRUXA", "BURRO", "CABRA", "CACHO", "CALMO", "CALOR", "CAMPO", "CANTO",
  "CAPIM", "CARNE", "CARTA", "CASAL", "CAUSA", "CAVOU", "CHUVA", "CIRCO",
  "CLARA", "COBRA", "COFRE", "COLMO", "COISA", "COMER", "COMUM", "CONDE",
  "CONTA", "CONTO", "COPAS", "CORAL", "CORDA", "COROA", "CORPO", "CORTE",
  "COURO", "COXAS", "CRAVO", "CRIME", "CRUEL", "CRUZA", "CUJAS", "CURTO",
  "DANÇA", "DADOS", "DAQUI", "DEDOS", "DELTA", "DENSO", "DESÇA", "DIABO",
  "DIGNO", "DISCO", "DOCES", "DONOS", "DORME", "DRAMA", "DUNAS", "DUPLA",
  "DUQUE", "DURAR", "EMAIL", "ERRAR", "ERVAS", "ETAPA", "EXATO", "EXTRA",
  "FALAR", "FALTA", "FAUNA", "FEIXE", "FELIZ", "FENDA", "FERRO", "FIBRA",
  "FICHA", "FINAL", "FIRMA", "FLORA", "FLUIR", "FOBIA", "FOLHA", "FORCA",
  "FORMA", "FORTE", "FRASE", "FROTA", "FRUTA", "FUGIR", "FUMAR", "FUNDO",
  "GANHA", "GARFO", "GARRA", "GASTO", "GATOS", "GENTE", "GESTO", "GLOBO",
  "GOLPE", "GOTAS", "GRADE", "GRAMA", "GRILO", "GRUPO", "GRITO", "GRUDE",
  "GUIAR", "HAVEI", "HEROI", "HONRA", "HUMOR", "IDEAL", "IDEIA", "IDADE",
  "IGUAL", "ILHAS", "ÍMPAR", "IMPOR", "INGUA", "IRMOS", "ISCAR", "JANTA",
  "JEITO", "JOGOS", "JOVEM", "JULHO", "JUIZO", "JURAR", "JUROS", "JUSTO",
  "LADOS", "LANCE", "LARGO", "LAZER", "LEGAL", "LEITE", "LENTO", "LETRA",
  "LIÇÃO", "LIDAR", "LIMÃO", "LIMPO", "LINDO", "LISTA", "LIVRO", "LIXAR",
  "LOCAL", "LONGA", "LOUCA", "LUGAR", "LUNAR", "LUTAR", "LUXOS", "MACRO",
  "MADRE", "MAGIA", "MANHA", "MANTO", "MARCA", "MARES", "MASSA", "MATAR",
  "MEIOS", "MELÃO", "MEIGA", "MENOR", "MENTE", "MESES", "METAL", "METRO",
  "MILHO", "MINAS", "MIRAR", "MISTO", "MOÇAS", "MOEDA", "MONTE", "MORAL",
  "MORTO", "MOVER", "MUITO", "MUNDO", "MURAL", "MUSGO", "NAÇÃO", "NADAR",
  "NAVIO", "NERVO", "NISSO", "NÍVEL", "NOÇÃO", "NOITE", "NOMES", "NORMA",
  "NOTAS", "NUVEM", "OBRAS", "OBVIO", "OCEAN", "OLHAR", "OMBRO", "OPÇÃO",
  "ORDEM", "ORELH", "OSSOS", "OUTROS","OUVIR", "PAGAR", "PALCO", "PANOS",
  "PAPEL", "PARAR", "PASSO", "PASTA", "PEDRA", "PEITO", "PENAS", "PENTE",
  "PERDA", "PERNA", "PERTO", "PEÇAS", "PICOS", "PILHA", "PINTA", "PIRES",
  "PISAR", "PLACA", "PLANO", "PLENA", "PODER", "POLIR", "PONTO", "PORTA",
  "POSSE", "POUCA", "PRAÇA", "PRATA", "PRELO", "PREÇO", "PRIMA", "PROVA",
  "PULSO", "PUNHO", "QUAIS", "RAIVA", "RAMOS", "RASGO", "RAZÃO", "REFÉM",
  "REGRA", "REMAR", "RENDA", "RETER", "RITMO", "RIVAL", "ROLAR", "ROMBO",
  "ROUPA", "ROYAL", "RUGAS", "RURAL", "SABER", "SABOR", "SACOS", "SAÍDA",
  "SALÃO", "SALTO", "SAMBA", "SANAR", "SANTO", "SAPOS", "SAUDÉ", "SÉRIO",
  "SINAL", "SOFRE", "SOLAR", "SOLTO", "SONHO", "SORTE", "SUBIR", "SUCOS",
  "SULCO", "SUMIR", "SURDO", "TARSO", "TECLA", "TEMPO", "TENDA", "TENSO",
  "TERRA", "TIGRE", "TINTA", "TIPOS", "TOMAR", "TONAL", "TOPAS", "TOTAL",
  "TRAÇO", "TRAJE", "TREMA", "TREVO", "TRIBO", "TRIGO", "TROCA", "TROVA",
  "TUMOR", "TURMA", "TURNO", "UNIÃO", "UNIDO", "URGIR", "URNAS", "USUAL",
  "VALER", "VALOR", "VARÃO", "VAZIO", "VEADO", "VELHO", "VELOZ", "VENDA",
  "VENTO", "VERDE", "VERME", "VERSO", "VIGOR", "VINHO", "VIOLA", "VINTE",
  "VIRAL", "VIRAR", "VISTA", "VITAL", "VIÚVA", "VIVER", "VOTAR", "VULTO",
  "ZEBRA", "ZONAS"
];

// Palavras adicionais aceitas como tentativas (inclui as secretas + extras)
export const VALID_GUESSES = new Set([
  ...SECRET_WORDS,
  "ABALO", "ABATE", "ABETO", "ABOBA", "ACABA", "ACENA", "ACESA", "ACIDO",
  "ACOES", "ACUSO", "ADAGA", "ADIAR", "ADOTA", "AFAGO", "AFIAR", "AFINS",
  "AGAPE", "AGEIS", "AGUAS", "AGUDO", "ALOHA", "ALPES", "AMADO", "AMBOS",
  "AMPLO", "ANDOU", "ANEXO", "ANIME", "ANJOS", "ANSIO", "ANUAL", "APELO",
  "ARAME", "ARDOR", "ARMAS", "AROMA", "ARTES", "ASPAS", "ASSAR", "ATEAR",
  "ATEIA", "ATIRA", "ATRÁS", "ATUAL", "AUDAZ", "AVEIA", "AVIDA", "AVOES",
  "AXIAL", "AZEDA", "BAIÃO", "BAILE", "BAIXA", "BALDE", "BANAL", "BANDA",
  "BANHO", "BARRA", "BASES", "BELGA", "BOATO", "BONDE", "BOTÃO", "BRUTO",
  "BUCHO", "BUSCA", "BUZIO", "CABOS", "CACOS", "CAFÉS", "CALOS", "CAMAS",
  "CANIL", "CAPAS", "CARGO", "CAROS", "CAVAR", "CELSO", "CENAL", "CENAS",
  "CENTO", "CERCO", "CERNE", "CESTA", "CHAVE", "CICLO", "CIOSO", "CIVIS",
  "CLONE", "COAIS", "COCAR", "COICE", "COLHE", "COMER", "COMOR", "COPOS",
  "CORES", "COSER", "COXOS", "CUBAS", "CUIDÓ", "CURVA", "CUSPE", "DAMAS",
  "DEITA", "DELES", "DEMOR", "DESDE", "DEVER", "DICAS", "DIETA", "DIGAM",
  "DILUI", "DIZER", "DOBRA", "DOLOR", "DOSOU", "DUELO", "DUETO", "DUROS",
  "EBANO", "ELEVA", "ENFIM", "ENTAO", "ENVIO", "ERROS", "ESCOL", "ESPÍA",
  "FADAS", "FALHA", "FALSA", "FARDO", "FAROL", "FARSA", "FATAL", "FATOS",
  "FAVOR", "FEBRE", "FEIAS", "FEIXO", "FEMEA", "FENOS", "FERAL", "FERIA",
  "FETAL", "FIGOS", "FILHA", "FILHO", "FILME", "FIXAR", "FOCAR", "FOGÃO",
  "FOICE", "FONTE", "FORNO", "FOROS", "FOSSE", "FOTOS", "FREIO", "FROIO",
  "FUGAS", "FUNIL", "FUSÃO", "GALHO", "GALOS", "GEMAS", "GEMIA", "GENES",
  "GENIO", "GESSO", "GIRAR", "GLOTE", "GOLAS", "GOLES", "GORDO", "GOZAR",
  "GRACA", "GRAOS", "GRIPE", "GROTA", "GRUMO", "GUIAS", "HASTE", "HIATO",
  "HORAS", "HOTEL", "IMÓVE", "INDIO", "INATA", "IRMAS", "JATOS", "JÓIAS",
  "JORMA", "JUÍZO", "LABOR", "LAÇOS", "LAGOS", "LAICA", "LAMAS", "LAPSO",
  "LASER", "LATAS", "LAVOU", "LEAIS", "LEGOU", "LEITO", "LEMES", "LENDA",
  "LENHA", "LEPRA", "LETAL", "LEVOU", "LICOR", "LILÁS", "LIMAR", "LINCE",
  "LISOS", "LITRO", "LOBOS", "LOJAS", "LOMBO", "LOTES", "LUCRO", "LUVAS",
  "MAÇÃS", "MACIO", "MAÇOS", "MADRA", "MALHA", "MAMÃO", "MANGA", "MANHA",
  "MANTA", "MAPAS", "MARES", "MAROS", "MATOU", "MEDIR", "MEIAS", "MELAS",
  "MESMA", "MEXER", "MIGRA", "MIMOS", "MINAR", "MOCHO", "MOLHO", "MORAR",
  "MORRO", "MOSCA", "MOTEL", "MOTOR", "MUDAS", "MUITA", "MULAS", "MUSAS",
  "NADAS", "NAIPE", "NARIZ", "NEGAR", "NICHO", "NODAL", "NOMES", "NOSSO",
  "NOVEL", "NUBIO", "NUDEZ", "OBESO", "OBEIR", "OCASO", "OCUPA", "OLEÃO",
  "OLVIO", "ONDAS", "OPACO", "ORBIS", "ORGÃO", "ORION", "OSMAR", "OUTRA",
  "PAGAR", "PALHA", "PALIO", "PAMPA", "PANDA", "PARTE", "PATAS", "PAVIO",
  "PECAS", "PENAL", "PERÇA", "PILÃO", "PINOS", "PIORA", "PLUMA", "POLAR",
  "POLOS", "POLPA", "POMBA", "POMOS", "PRAIA", "PRIMA", "PROLE", "PUXAR",
  "QUASE", "QUEDA", "RAIDE", "RAIOS", "RANCA", "RATOS", "REAGÍ", "REAIS",
  "RAÇÃO", "REGIO", "REJUV", "RELVA", "REPOR", "RESES", "RICAS", "RIGOR",
  "RIMOS", "RISCO", "ROBOS", "ROÇAR", "RODAS", "ROLAR", "ROSAS", "ROTAO",
  "RUIDO", "RUMOS", "SACAS", "SAGAZ", "SALAS", "SALAR", "SALVA", "SANAR",
  "SARAR", "SAUNA", "SENÃO", "SENSO", "SERRA", "SETAS", "SILOS", "SINOS",
  "SÍTIO", "SOBRE", "SOCOS", "SOFÁS", "SOLAR", "SOLOS", "SOMAR", "SONDA",
  "SOPAS", "SORGO", "SUAVE", "SUJOU", "SURFA", "SURGE", "TABUA", "TACOS",
  "TALAS", "TELAS", "TEMAS", "TENOR", "TERÇO", "TERMA", "TERNO", "TETOS",
  "TETRA", "TIGRE", "TILOS", "TIRAS", "TÍTULO","TOADA", "TOCAR", "TOLDO",
  "TONAL", "TORAS", "TORCE", "TOSCO", "TOURO", "TRAÇA", "TRAPO", "TRENA",
  "TRIOS", "TROÇO", "TROTE", "TUBOS", "TUFÃO", "TULHA", "TURBO", "USINA",
  "USTED", "UTEIS", "VAGAS", "VAGOS", "VALAS", "VALES", "VAPOR", "VASOS",
  "VEIAS", "VELAR", "VELAS", "VENAL", "VERBA", "VESTE", "VIBRA", "VIDEO",
  "VIGAS", "VINCO", "VINIL", "VIOLA", "VÍRUS", "VISÃO", "VOZES", "VULGO",
  "ZINCO", "ZUMBI"
]);

/**
 * Retorna uma palavra secreta aleatória.
 */
export function getRandomWord() {
  // Filtra apenas palavras que realmente têm 5 letras (sem acento contando como extra)
  const valid = SECRET_WORDS.filter(w => normalize(w).length === 5);
  return valid[Math.floor(Math.random() * valid.length)];
}

/**
 * Verifica se uma palavra é válida como tentativa.
 */
export function isValidWord(word) {
  const normalized = normalize(word);
  if (normalized.length !== 5) return false;

  for (const w of VALID_GUESSES) {
    if (normalize(w) === normalized) return true;
  }
  return false;
}

/**
 * Normaliza uma palavra: maiúscula, sem acentos.
 */
export function normalize(word) {
  return word
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
