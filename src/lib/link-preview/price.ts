// Lecture des prix, quel que soit leur format : « 1 299,00 € », « 1.299,00 », « US $12.34 », 49.9…

const CURRENCIES: [RegExp, string][] = [
  [/€|\beur\b/i, "EUR"],
  [/£|\bgbp\b/i, "GBP"],
  [/\bchf\b/i, "CHF"],
  [/\bcad\b|ca\s?\$/i, "CAD"],
  [/\busd\b|us\s?\$|\$/i, "USD"],
];

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF", CAD: "$ CA" };

export function currencyOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw);
  if (/^[A-Z]{3}$/.test(s.trim())) return s.trim();
  for (const [re, code] of CURRENCIES) if (re.test(s)) return code;
  return null;
}

/** Prix au format du site : chiffres, virgule décimale, deux décimales s'il y en a (« 1299,00 », « 12 »). */
export function normalizePrice(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/[\s  ]/g, "");
  const m = s.match(/\d[\d.,']*/);
  if (!m) return null;
  const n = m[0].replace(/[.,']+$/, "");
  let int = n;
  let dec = "";
  const lastDot = n.lastIndexOf(".");
  const lastComma = n.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // les deux : le dernier est le séparateur décimal
    const at = Math.max(lastDot, lastComma);
    int = n.slice(0, at);
    dec = n.slice(at + 1);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = n.split(sep);
    const tail = parts[parts.length - 1];
    if (parts.length === 2 && tail.length <= 2) {
      int = parts[0];
      dec = tail;
    }
    // sinon : séparateur de milliers (« 1.299 », « 1,299,000 »)
  }
  int = int.replace(/[.,']/g, "").replace(/^0+(?=\d)/, "");
  if (!int || (/^0+$/.test(int) && (!dec || /^0+$/.test(dec)))) return null;
  return dec ? `${int},${dec.padEnd(2, "0").slice(0, 2)}` : int;
}

/** Texte rangé dans le champ « Prix » : nombre seul en euros, sinon nombre + devise. */
export function priceForField(price: string | null, currency: string | null) {
  if (!price) return null;
  if (!currency || currency === "EUR") return price;
  return `${price} ${SYMBOL[currency] ?? currency}`;
}
