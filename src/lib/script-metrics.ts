/**
 * Largeur des caractères de Santa Natale (en millièmes d'em), générée depuis la police.
 * Sert à savoir si un titre tient sur une ligne en manuscrit, et à quelle taille.
 */
const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¨©«­®°±²³´·¸¹º»¼½¾¿ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞàáâãäåçèéêëìíîïðñòóôõö÷øùúûüýþÿıŠšŸŽž̧̀́̂̃̄̇̈̊̌";
const ADV = [248,484,287,676,574,1729,1729,185,471,435,309,418,1729,418,1729,586,1729,1729,1729,1729,1729,1729,1729,1729,1729,1729,222,275,322,299,322,555,766,791,876,537,801,540,791,498,725,594,529,954,660,984,821,597,725,646,769,551,507,709,651,905,752,553,723,552,348,543,265,418,119,572,507,382,675,482,392,569,537,248,252,525,363,857,570,547,499,542,509,367,259,537,393,755,630,586,592,460,85,460,277,248,484,245,817,542,418,297,142,418,256,254,119,128,243,193,247,542,586,586,586,555,791,791,791,791,791,791,545,540,540,540,540,594,594,594,594,811,821,597,597,597,597,597,390,589,709,709,709,709,553,767,572,572,572,572,572,572,510,482,482,482,482,265,273,279,278,649,570,527,527,505,516,547,418,537,537,537,537,537,586,520,586,267,551,367,553,723,592,119,119,253,277,418,142,245,142,265,243];
const MAP = new Map<string, number>();
for (let i = 0; i < CHARS.length; i++) MAP.set(CHARS[i], ADV[i]);

/**
 * La version gratuite de Santa Natale remplace les chiffres, « , . % & » par un tampon
 * « PERSONAL USE ONLY » et n'a pas œ æ ni les tirets longs : un titre qui en contient passe en Merienda.
 */
const NOT_IN_SCRIPT = /[0-9,.%&œæŒÆ–—]/;
export function scriptCanRender(text: string): boolean {
  if (NOT_IN_SCRIPT.test(text)) return false;
  for (const ch of text) if (ch !== " " && !MAP.has(ch)) return false;
  return true;
}

/** Largeur du texte en em, en Santa Natale (caractère inconnu : 0,5 em). */
export function scriptWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) w += MAP.get(ch) ?? 500;
  return w / 1000;
}

/**
 * Règle des titres : le manuscrit seulement s'il tient sur une ligne à une taille confortable,
 * sinon une police sobre (Fraunces). `room` = largeur disponible au pire (téléphone), en px.
 */
export function listTitleProps(text: string, maxPx: number, room = 290, minPx = 26) {
  const w = scriptWidthEm(text) * 1.05;
  const px = Math.floor(Math.min(maxPx, room / w));
  return px >= minPx && scriptCanRender(text)
    ? { className: "list-title", style: { fontSize: px } }
    : { className: "list-title-sober", style: { fontSize: Math.round(Math.min(maxPx * 0.6, 28)) } };
}
