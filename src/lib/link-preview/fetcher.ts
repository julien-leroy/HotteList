import "server-only";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";
import { isPrivateAddress } from "./net";

// Récupération d'une page produit. Le serveur étant à la maison, on bloque toute
// adresse du réseau local, y compris après une redirection ou une résolution DNS piégée.

const TIMEOUT_MS = 7000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
};

export type FetchedPage = { url: URL; status: number; body: string; contentType: string };

// Résolution DNS qui refuse les adresses privées : la vérification a lieu
// au moment même de la connexion, donc impossible de la contourner.
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as (e: Error) => void)(err);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (!list.length || bad) {
      return (callback as (e: Error) => void)(new Error("Adresse refusée"));
    }
    if ((options as dns.LookupOptions).all) return (callback as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    (callback as (e: null, a: string, f: number) => void)(null, list[0].address, list[0].family);
  });
};

function fetchOnce(
  url: URL,
  headers: Record<string, string>,
): Promise<{ status: number; location?: string; body?: string; contentType?: string; cookies?: string[] }> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") return reject(new Error("Protocole refusé"));
    if (url.port && url.port !== "80" && url.port !== "443") return reject(new Error("Port refusé"));
    const bareHost = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(bareHost) && isPrivateAddress(bareHost)) return reject(new Error("Adresse refusée"));
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(url, { method: "GET", lookup: safeLookup, timeout: TIMEOUT_MS, headers }, (res) => {
      const status = res.statusCode ?? 0;
      const cookies = res.headers["set-cookie"];
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return resolve({ status, location: res.headers.location, cookies });
      }
      const contentType = String(res.headers["content-type"] ?? "");
      let stream: NodeJS.ReadableStream = res;
      const enc = String(res.headers["content-encoding"] ?? "");
      if (enc.includes("br")) stream = res.pipe(zlib.createBrotliDecompress());
      else if (enc.includes("gzip")) stream = res.pipe(zlib.createGunzip());
      else if (enc.includes("deflate")) stream = res.pipe(zlib.createInflate());
      const chunks: Buffer[] = [];
      let size = 0;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") });
      };
      stream.on("data", (c: Buffer) => {
        size += c.length;
        if (size > MAX_BYTES) {
          finish();
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      stream.on("end", finish);
      stream.on("error", (e) => (finished ? undefined : reject(e)));
    });
    req.on("timeout", () => req.destroy(new Error("Délai dépassé")));
    req.on("error", reject);
    req.end();
  });
}

/** Suit les redirections (en gardant les cookies posés en route, que certains sites exigent). */
export async function fetchPage(input: URL, extraHeaders: Record<string, string> = {}): Promise<FetchedPage> {
  let url = input;
  const jar = new Map<string, string>();
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const headers = { ...DEFAULT_HEADERS, ...extraHeaders };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetchOnce(url, headers);
    for (const c of res.cookies ?? []) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    if (res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return { url, status: res.status, body: res.body ?? "", contentType: res.contentType ?? "" };
  }
  throw new Error("Trop de redirections");
}
