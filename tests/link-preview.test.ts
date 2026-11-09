import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateAddress, parsePreview, normalizePrice } = await import("@/lib/link-preview");

describe("blocage du réseau local", () => {
  it.each(["127.0.0.1", "10.0.0.5", "192.168.1.10", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:192.168.0.1", "0.0.0.0"])(
    "%s est refusée",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "2a00:1450:4007:80c::200e", "8.8.8.8"])("%s est autorisée", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("lecture d'une page produit", () => {
  const base = new URL("https://www.fnac.com/a123/produit");

  it("lit les balises Open Graph", () => {
    const html = `<html><head><meta property="og:title" content="Casque audio">
      <meta property="og:image" content="/img/casque.jpg"><meta property="product:price:amount" content="79.99"></head></html>`;
    expect(parsePreview(html, base)).toEqual({
      title: "Casque audio",
      imageUrl: "https://www.fnac.com/img/casque.jpg",
      price: "79,99",
      siteOrigin: "fnac.com",
    });
  });

  it("lit le JSON-LD Product", () => {
    const html = `<title>x</title><script type="application/ld+json">{"@type":"Product","name":"Tente 2 places","image":["https://cdn.x/t.jpg"],"offers":{"price":"49.00"}}</script>`;
    const p = parsePreview(html, base);
    expect(p.imageUrl).toBe("https://cdn.x/t.jpg");
    expect(p.price).toBe("49,00");
  });

  it("normalise les prix", () => {
    expect(normalizePrice("1 299,00 €")).toBe("1299,00");
    expect(normalizePrice("EUR 12")).toBe("12");
    expect(normalizePrice("gratuit")).toBeNull();
  });
});
