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

const KEYWORDS_BY_CATEGORY = {
  "Limpeza e Higiene": [
    "detergente",
    "sabao",
    "amaciante",
    "agua sanitaria",
    "desinfetante",
    "esponja",
    "papel higienico",
    "creme dental",
    "pasta de dente",
    "escova de dente",
    "sabonete",
    "shampoo",
    "condicionador",
    "absorvente",
  ],
  "Padaria e Laticínios": [
    "pao",
    "pao de forma",
    "leite",
    "queijo",
    "manteiga",
    "requeijao",
    "iogurte",
    "coalhada",
    "creme de leite",
    "nata",
  ],
  Hortifruti: [
    "banana",
    "maca",
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
    "mostarda",
    "molho",
    "extrato",
    "atum",
    "milho",
    "ervilha",
    "biscoito",
    "bolacha",
  ],
  "Proteínas e Ovos": [
    "ovo",
    "ovos",
    "frango",
    "carne",
    "peixe",
    "linguica",
    "salsicha",
    "peru",
    "bacon",
    "presunto",
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

export function classifyShoppingCategory(name) {
  const normalizedName = normalizeShoppingText(name);
  if (!normalizedName) return "Geral";

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
