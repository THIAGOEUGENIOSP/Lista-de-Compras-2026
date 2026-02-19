import { isPesoCategoria } from "./format.js";

const GENERAL_CATEGORIES = [
  "Limpeza e Higiene",
  "Padaria e Laticínios",
  "Hortifruti",
  "Bebidas",
  "Mercearia",
  "Proteínas e Ovos",
  "Geral",
];

const CATEGORY_OPTIONS = [...GENERAL_CATEGORIES, "Churrasco"];

const CATEGORY_META = {
  "Limpeza e Higiene": { icon: "🧽", className: "cat-clean" },
  "Padaria e Laticínios": { icon: "🥖", className: "cat-bakery" },
  Hortifruti: { icon: "🥬", className: "cat-produce" },
  Bebidas: { icon: "🥤", className: "cat-drinks" },
  Mercearia: { icon: "🛒", className: "cat-grocery" },
  "Proteínas e Ovos": { icon: "🥚", className: "cat-protein" },
  Geral: { icon: "📦", className: "cat-general" },
  Churrasco: { icon: "🔥", className: "cat-churrasco" },
};
const LEARNED_CATEGORY_STORE_KEY = "shoppingCategoryLearnedMap";
let sharedLearnedCategoryMap = {};

const KEYWORDS_BY_CATEGORY = {
  "Limpeza e Higiene": [
    "detergente",
    "sabao",
    "alcool",
    "alcool 70",
    "casa perfume",
    "casa e perfume",
    "perfume",
    "odorizador",
    "aromatizador",
    "amaciante",
    "agua sanitaria",
    "desinfetante",
    "esponja",
    "papel higienico",
    "papel toalha",
    "pano de prato",
    "creme dental",
    "pasta de dente",
    "escova de dente",
    "sabonete",
    "shampoo",
    "condicionador",
    "absorvente",
    "detergente liquido",
    "detergente neutro",
    "sabao em po",
    "sabao liquido",
    "sabao em barra",
    "multiuso",
    "limpador perfumado",
    "limpador com alcool",
    "limpador de vidro",
    "limpador de piso",
    "limpador de banheiro",
    "limpador desengordurante",
    "esponja de louca",
    "esponja de aco",
    "palha de aco",
    "pano de chao",
    "pano multiuso",
    "rodo",
    "vassoura",
    "balde",
    "escova de lavar roupa",
    "escova sanitaria",
    "saco de lixo",
    "guardanapo",
    "lenco umedecido",
    "sabonete em barra",
    "sabonete liquido",
    "fio dental",
    "enxaguante bucal",
    "desodorante",
    "protetor diario",
    "algodao",
    "cotonete",
    "alcool em gel",
    "inseticida",
    "repelente",
    "lustra moveis",
    "cloro gel",
    "sabao glicerinado",
    "limpador de forno",
    "limpador de inox",
    "tira manchas",
    "desentupidor",
    "desodorizador de ambiente",
    "odorizador automatico",
  ],
  "Padaria e Laticínios": [
    "pao",
    "pao de forma",
    "bisnaguinha",
    "leite",
    "queijo",
    "mussarela",
    "manteiga",
    "requeijao",
    "iogurte",
    "danone",
    "coalhada",
    "creme de leite",
    "nata",
    "pao frances",
    "pao integral",
    "pao de hamburguer",
    "pao de hot dog",
    "pao sirio",
    "croissant",
    "baguete",
    "rosca doce",
    "pao de queijo",
    "queijo prato",
    "queijo minas",
    "queijo coalho",
    "queijo parmesao",
    "queijo provolone",
    "queijo suico",
    "queijo gouda",
    "queijo brie",
    "queijo camembert",
    "cream cheese",
    "margarina",
    "leite integral",
    "leite desnatado",
    "leite semidesnatado",
    "leite sem lactose",
    "leite em po",
    "iogurte natural",
    "iogurte grego",
    "iogurte integral",
    "iogurte desnatado",
    "leite condensado",
    "doce de leite",
    "ricota",
  ],
  Hortifruti: [
    "banana",
    "maca",
    "mamao",
    "manga",
    "uva",
    "laranja",
    "limao",
    "abacaxi",
    "tomate",
    "cebola",
    "alho",
    "alface",
    "couve",
    "brocolis",
    "batata",
    "cenoura",
    "pepino",
    "fruta",
    "verdura",
    "legume",
    "alface americana",
    "alface crespa",
    "alface roxa",
    "rucula",
    "agriao",
    "couve manteiga",
    "espinafre",
    "couve flor",
    "repolho",
    "tomate cereja",
    "batata inglesa",
    "batata doce",
    "beterraba",
    "abobrinha",
    "berinjela",
    "pimentao",
    "milho verde",
    "vagem",
    "chuchu",
    "mandioca",
    "inhame",
    "banana prata",
    "banana nanica",
    "banana maca",
    "laranja pera",
    "laranja lima",
    "limao taiti",
    "limao siciliano",
    "melancia",
    "melao",
    "mamao papaya",
    "morango",
    "kiwi",
    "pera",
    "ameixa",
    "pessego",
  ],
  Bebidas: [
    "agua",
    "suco",
    "refrigerante",
    "cerveja",
    "vinho",
    "whisky",
    "vodka",
    "energetico",
    "cha",
    "cafe",
    "agua mineral",
    "agua com gas",
    "refrigerante cola",
    "refrigerante guarana",
    "refrigerante laranja",
    "suco de laranja",
    "suco de uva",
    "suco de abacaxi",
    "suco integral",
    "suco nectar",
    "suco em po",
    "cha gelado",
    "cha mate",
    "cafe torrado",
    "cafe em po",
    "cafe em capsula",
    "cerveja lata",
    "cerveja long neck",
    "cerveja artesanal",
    "vinho tinto",
    "vinho branco",
    "vinho rose",
    "espumante",
    "gin",
    "rum",
    "isotonico",
    "leite vegetal",
    "achocolatado",
    "agua de coco",
  ],
  Mercearia: [
    "arroz",
    "feijao",
    "macarrao",
    "farinha",
    "acucar",
    "sal",
    "oleo",
    "azeite",
    "maionese",
    "ketchup",
    "granola",
    "mostarda",
    "molho",
    "extrato",
    "atum",
    "milho",
    "ervilha",
    "biscoito",
    "bolacha",
    "arroz branco",
    "arroz integral",
    "feijao carioca",
    "feijao preto",
    "feijao branco",
    "macarrao espaguete",
    "macarrao penne",
    "macarrao parafuso",
    "molho de tomate",
    "extrato de tomate",
    "farinha de trigo",
    "farinha de mandioca",
    "farinha de milho",
    "acucar refinado",
    "acucar mascavo",
    "oleo de soja",
    "oleo de milho",
    "azeite de oliva",
    "vinagre",
    "milho enlatado",
    "ervilha enlatada",
    "atum enlatado",
    "molho barbecue",
    "biscoito recheado",
    "biscoito salgado",
    "bolacha agua e sal",
    "cereal matinal",
    "aveia",
    "achocolatado em po",
    "gelatina",
    "pudim em po",
    "fermento",
    "tempero pronto",
    "caldo em cubo",
    "canjica",
    "lentilha",
    "grao de bico",
    "quinoa",
  ],
  "Proteínas e Ovos": [
    "ovo",
    "ovos",
    "frango",
    "carne",
    "peixe",
    "sardinha",
    "linguica",
    "salsicha",
    "peru",
    "bacon",
    "presunto",
    "ovo branco",
    "ovo caipira",
    "ovo organico",
    "peito de frango",
    "coxa de frango",
    "sobrecoxa",
    "asa de frango",
    "file de frango",
    "carne moida",
    "patinho",
    "alcatra",
    "picanha",
    "contrafile",
    "costela bovina",
    "acem",
    "musculo",
    "cupim",
    "linguica toscana",
    "linguica calabresa",
    "peito de peru",
    "mortadela",
    "carne suina",
    "lombo suino",
    "costelinha suina",
    "tilapia",
    "salmao",
    "merluza",
    "atum fresco",
    "camarao",
    "carne seca",
    "frango inteiro",
    "hamburguer bovino",
    "hamburguer frango",
    "hamburguer vegetal",
    "tofu",
    "proteina de soja",
  ],
};

const NORMALIZED_CATEGORY_MAP = new Map(
  CATEGORY_OPTIONS.map((cat) => [normalizeShoppingText(cat), cat]),
);

function normalizeShoppingText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeShoppingItemName(value) {
  return normalizeShoppingText(value);
}

function singularizeToken(token) {
  if (!token) return "";
  if (token.endsWith("oes")) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("aes")) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("ais")) return `${token.slice(0, -3)}al`;
  if (token.endsWith("eis")) return `${token.slice(0, -3)}el`;
  if (token.endsWith("ois")) return `${token.slice(0, -3)}ol`;
  if (token.endsWith("is")) return `${token.slice(0, -2)}il`;
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokensOf(value) {
  return normalizeShoppingText(value).split(" ").filter(Boolean);
}

function scoreTokenPair(inputToken, keywordToken) {
  if (!inputToken || !keywordToken) return 0;

  if (inputToken === keywordToken) return 4;

  const inputSingular = singularizeToken(inputToken);
  const keywordSingular = singularizeToken(keywordToken);
  if (inputSingular === keywordSingular) return 3;

  if (isOneEditAway(inputSingular, keywordSingular)) {
    return 2;
  }

  const minLen = Math.min(inputToken.length, keywordToken.length);
  if (
    minLen >= 4 &&
    (inputToken.startsWith(keywordToken) || keywordToken.startsWith(inputToken))
  ) {
    return 2;
  }

  if (
    minLen >= 5 &&
    (inputToken.includes(keywordToken) || keywordToken.includes(inputToken))
  ) {
    return 1;
  }

  return 0;
}

function isOneEditAway(a, b) {
  if (!a || !b) return false;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;
  if (Math.min(lenA, lenB) < 5) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;

    if (lenA > lenB) {
      i += 1;
    } else if (lenB > lenA) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < lenA || j < lenB) edits += 1;
  return edits <= 1;
}

function scoreByKeywords(normalizedName, inputTokens, keywords) {
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeShoppingText(keyword);
    if (!normalizedKeyword) continue;

    if (normalizedName.includes(normalizedKeyword)) {
      score += 6;
      continue;
    }

    const keywordTokens = tokensOf(normalizedKeyword);
    let localScore = 0;

    for (const inputToken of inputTokens) {
      for (const keywordToken of keywordTokens) {
        localScore = Math.max(localScore, scoreTokenPair(inputToken, keywordToken));
      }
    }

    score += localScore;
  }

  return score;
}

function loadLearnedCategoryMap() {
  try {
    const raw = localStorage.getItem(LEARNED_CATEGORY_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLearnedCategoryMap(nextMap) {
  try {
    localStorage.setItem(
      LEARNED_CATEGORY_STORE_KEY,
      JSON.stringify(nextMap || {}),
    );
  } catch {
    // sem-op: quota/ambiente
  }
}

function getLearnedCategory(name) {
  const normalizedName = normalizeShoppingText(name);
  if (!normalizedName) return null;

  const sharedLearned = normalizeShoppingCategory(
    sharedLearnedCategoryMap[normalizedName],
  );
  if (
    sharedLearned &&
    sharedLearned !== "Geral" &&
    sharedLearned !== "Churrasco"
  ) {
    return sharedLearned;
  }

  const map = loadLearnedCategoryMap();
  const learned = normalizeShoppingCategory(map[normalizedName]);
  if (!learned || learned === "Geral" || learned === "Churrasco") return null;
  return learned;
}

export function classifyShoppingCategory(name) {
  const normalizedName = normalizeShoppingText(name);
  if (!normalizedName) return "Geral";

  const learned = getLearnedCategory(normalizedName);
  if (learned) return learned;

  const inputTokens = tokensOf(normalizedName);
  if (!inputTokens.length) return "Geral";

  const ranked = Object.entries(KEYWORDS_BY_CATEGORY)
    .map(([category, keywords]) => ({
      category,
      score: scoreByKeywords(normalizedName, inputTokens, keywords),
    }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return "Geral";

  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < 3) return "Geral";
  if (second && second.score > 0 && best.score - second.score <= 1) return "Geral";

  return best.category;
}

export function registerShoppingCategoryCorrection(name, category) {
  const normalizedName = normalizeShoppingText(name);
  const normalizedCategory = normalizeShoppingCategory(category);
  if (!normalizedName) return false;
  if (!normalizedCategory || normalizedCategory === "Geral") return false;
  if (normalizedCategory === "Churrasco") return false;

  const current = loadLearnedCategoryMap();
  current[normalizedName] = normalizedCategory;
  saveLearnedCategoryMap(current);
  return true;
}

export function setSharedShoppingCategoryCorrections(map) {
  const safe = map && typeof map === "object" ? map : {};
  sharedLearnedCategoryMap = { ...safe };
}

export function normalizeShoppingCategory(category) {
  if (isPesoCategoria(category)) return "Churrasco";

  const normalized = normalizeShoppingText(category);
  if (!normalized) return "Geral";

  if (NORMALIZED_CATEGORY_MAP.has(normalized)) {
    const exact = NORMALIZED_CATEGORY_MAP.get(normalized);
    return exact === "Churrasco" ? "Churrasco" : exact;
  }

  if (normalized === "limpeza" || normalized === "higiene") {
    return "Limpeza e Higiene";
  }
  if (normalized === "padaria" || normalized === "laticinios") {
    return "Padaria e Laticínios";
  }
  if (normalized === "proteinas" || normalized === "ovos") {
    return "Proteínas e Ovos";
  }
  if (normalized.startsWith("churrasco")) {
    return "Churrasco";
  }

  return "Geral";
}

function resolveGeneralItemCategoryByName(item) {
  const normalized = normalizeShoppingCategory(item?.categoria);
  if (normalized === "Churrasco") return "Churrasco";
  if (normalized !== "Geral") return normalized;

  const inferred = classifyShoppingCategory(item?.nome || "");
  return inferred === "Churrasco" ? "Geral" : inferred;
}

export function groupShoppingItemsByCategory(items) {
  const buckets = new Map(GENERAL_CATEGORIES.map((cat) => [cat, []]));

  for (const item of items || []) {
    const category = resolveGeneralItemCategoryByName(item);
    if (category === "Churrasco") continue;
    const targetCategory = GENERAL_CATEGORIES.includes(category)
      ? category
      : "Geral";
    buckets.get(targetCategory).push(item);
  }

  return GENERAL_CATEGORIES.map((category) => ({
    category,
    items: buckets.get(category) || [],
  })).filter((group) => group.items.length > 0);
}

export function getShoppingCategories() {
  return [...CATEGORY_OPTIONS];
}

export function getCategoryMeta(category) {
  const normalized = normalizeShoppingCategory(category);
  return CATEGORY_META[normalized] || CATEGORY_META.Geral;
}

export function toCategoryAnchor(category) {
  const normalized = normalizeShoppingCategory(category);
  if (!normalized) return "geral";
  return normalized
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, "-");
}
