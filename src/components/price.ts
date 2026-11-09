/** Valeur numérique d'un prix saisi librement (« 79,99 », « env. 30 € »…), ou null. */
export function priceValue(price: string | null) {
  const m = price?.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}
