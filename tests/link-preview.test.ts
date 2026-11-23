import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateAddress, parsePreview, normalizePrice } = await import("@/lib/link-preview");
const { titleFromSlug } = await import("@/lib/link-preview/extractors");
const { priceForField } = await import("@/lib/link-preview/price");

describe("blocage du réseau local", () => {
  it.each(["127.0.0.1", "10.0.0.5", "192.168.1.10", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:192.168.0.1", "0.0.0.0"])(
    "%s est refusée",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "2a00:1450:4007:80c::200e", "8.8.8.8"])("%s est autorisée", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("lecture d'une page produit (site inconnu)", () => {
  const base = new URL("https://boutique.example/produits/casque");

  it("lit les balises Open Graph", () => {
    const html = `<html><head><meta property="og:title" content="Casque audio">
      <meta property="og:image" content="/img/casque.jpg"><meta property="product:price:amount" content="79.99"></head></html>`;
    expect(parsePreview(html, base)).toMatchObject({
      title: "Casque audio",
      imageUrl: "https://boutique.example/img/casque.jpg",
      price: "79,99",
      siteOrigin: "boutique.example",
      status: "complete",
    });
  });

  it("lit le JSON-LD Product", () => {
    const html = `<title>x</title><script type="application/ld+json">{"@type":"Product","name":"Tente 2 places","image":["https://cdn.x/t.jpg"],"offers":{"price":"49.00"}}</script>`;
    const p = parsePreview(html, base);
    expect(p.imageUrl).toBe("https://cdn.x/t.jpg");
    expect(p.price).toBe("49,00");
  });

  it("accepte une image ImageObject (et non « [object Object] »)", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Lampe","image":[{"@type":"ImageObject","contentUrl":"https://cdn.x/l.jpg"}]}</script>`;
    expect(parsePreview(html, base).imageUrl).toBe("https://cdn.x/l.jpg");
  });

  it("lit un JSON-LD un peu abîmé (retour à la ligne, virgule en trop)", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Thé
      vert","offers":{"price":"8.5",},}</script>`;
    expect(parsePreview(html, base)).toMatchObject({ title: "Thé vert", price: "8,50" });
  });

  it("retire le nom du site du titre", () => {
    const html = `<meta property="og:site_name" content="Nature &amp; Découvertes"><title>Télescope 70 mm | Nature &amp; Découvertes</title>`;
    expect(parsePreview(html, base).title).toBe("Télescope 70 mm");
  });

  it("passe les images en https et ignore les logos SVG", () => {
    expect(parsePreview(`<meta property="og:image" content="http://cdn.x/a.jpg">`, base).imageUrl).toBe("https://cdn.x/a.jpg");
    expect(parsePreview(`<meta property="og:image" content="https://cdn.x/logo.svg">`, base).imageUrl).toBeNull();
  });

  it("devine un titre depuis l'adresse quand la page ne dit rien", () => {
    const p = parsePreview("<html></html>", new URL("https://boutique.example/p/robot-aspirateur-connecte-x200"));
    expect(p.title).toBe("Robot aspirateur connecte x200");
  });

  it("garde la devise étrangère dans le prix", () => {
    const html = `<meta property="og:title" content="Mug"><meta property="product:price:amount" content="12.5"><meta property="product:price:currency" content="USD">`;
    expect(parsePreview(html, base)).toMatchObject({ price: "12,50 $", currency: "USD" });
  });
});

describe("prix", () => {
  it.each([
    ["1 299,00 €", "1299,00"],
    ["1.299,00 €", "1299,00"],
    ["1,299.00", "1299,00"],
    ["US $12.34", "12,34"],
    ["€ 42,17", "42,17"],
    ["309€99", "309"],
    ["EUR 12", "12"],
    ["1.299", "1299"],
    [49.9, "49,90"],
    ["0,00", null],
    ["gratuit", null],
  ])("%s → %s", (raw, expected) => expect(normalizePrice(raw)).toBe(expected));

  it("ajoute la devise si ce ne sont pas des euros", () => {
    expect(priceForField("12,34", "EUR")).toBe("12,34");
    expect(priceForField("12,34", "GBP")).toBe("12,34 £");
  });
});

describe("titre depuis un morceau d'adresse", () => {
  it.each([
    ["tente-de-camping-mh100-2-places", "Tente de camping mh100 2 places"],
    ["4567890123-pull-zara-taille-m", "Pull zara taille m"],
    ["Sony-WH-1000XM5-Casque", "Sony WH 1000XM5 Casque"],
    ["B09Y2MYL5C", null],
    ["2750123456", null],
  ])("%s → %s", (seg, expected) => expect(titleFromSlug(seg)).toBe(expected));
});
