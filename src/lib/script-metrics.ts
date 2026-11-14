/**
 * Largeur des caractères de Damion, la police manuscrite des titres (en millièmes d'em), générée depuis la police.
 * Sert à savoir si un titre tient sur une ligne en manuscrit, et à quelle taille.
 */
const CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĂıŒœˆ˚˜̀́̃̄̈–—‘’‚“”„•…‹›⁄⁴€™−";
const ADV = [234,468,416,674,635,864,546,328,446,332,340,624,360,481,357,436,438,359,438,391,477,432,479,425,471,506,398,347,649,737,662,441,906,646,631,507,682,564,417,652,716,525,614,779,633,889,746,655,582,642,595,584,496,583,473,670,531,473,804,472,436,383,522,500,510,480,442,315,472,344,247,461,438,234,237,469,258,641,464,414,478,416,412,298,258,453,391,556,353,438,414,396,448,497,680,266,315,445,646,436,423,537,490,823,425,651,799,828,293,596,525,438,391,510,453,606,357,554,359,414,767,1183,1053,1305,460,646,646,646,646,646,646,991,507,564,564,564,564,525,525,525,525,594,746,655,655,655,655,655,616,566,583,583,583,583,473,531,510,480,480,480,480,480,480,663,315,344,344,344,344,234,234,234,234,479,464,414,414,414,414,414,398,414,453,453,453,453,438,479,438,646,234,772,576,596,596,596,0,0,0,0,0,434,687,258,299,426,423,458,520,529,727,518,573,408,477,551,833,565];
const MAP = new Map<string, number>();
for (let i = 0; i < CHARS.length; i++) MAP.set(CHARS[i], ADV[i]);

/** Vrai si tous les caractères du texte existent dans Damion (sinon le titre passe en Merienda). */
export function scriptCanRender(text: string): boolean {
  for (const ch of text) if (ch !== " " && !MAP.has(ch)) return false;
  return true;
}

/** Largeur du texte en em, en Damion (caractère inconnu : 0,5 em). */
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
