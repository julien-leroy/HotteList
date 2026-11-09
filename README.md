# HotteList 🎁

Les listes de Noël de toute la famille, sans gâcher la surprise.

Chacun écrit ses souhaits ; les autres réservent en secret, se mettent à plusieurs, commentent et proposent des idées. Le destinataire ne voit jamais qui a réservé quoi, ni les commentaires, ni les idées des autres.

**Stack :** Next.js 16 (App Router, TypeScript) · SQLite via Prisma · Tailwind CSS 4 · Radix UI · dnd-kit · Node 24.

## Développement

```bash
nvm use                 # Node 24 (cf. .nvmrc)
cp .env.example .env    # puis mettre AUTH_SECRET=$(openssl rand -hex 32) et APP_URL=http://localhost:9000
npm install
npx prisma migrate dev  # crée data/hottelist.db
npm run dev             # http://localhost:9000
npm test                # tests des règles de visibilité et de la lecture des liens
```

## Où est quoi

| Dossier | Contenu |
|---|---|
| `src/lib/visibility.ts` | **Règles de visibilité et de droits** (module pur, testé). Tout ce que le navigateur reçoit passe par `giftsVisibleTo()`. |
| `src/lib/queries.ts` | Chargement des cadeaux d'une famille, contrôles d'appartenance et d'admin |
| `src/lib/auth.ts` | Mots de passe (scrypt), sessions en base, cookie `hl_session` |
| `src/lib/link-preview.ts` | Lecture d'un lien produit (titre, image, prix), avec blocage du réseau local |
| `src/app/actions/` | Actions serveur : comptes, familles, cadeaux, comptes gérés |
| `src/app/f/[slug]` | Page famille (et lien d'invitation) |
| `src/app/profil` | Mes listes par famille : glisser-déposer, déplacer ou copier |
| `deploy/` | Service systemd, script de mise à jour, sauvegarde, exemple Caddy |
| `docs/` | Architecture et guide de déploiement |

## Déploiement

Voir [`docs/deploiement.md`](docs/deploiement.md).

Mot de passe oublié sans admin disponible : `npm run reset-password -- <identifiant>` sur le serveur.
