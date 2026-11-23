# Pages produit de référence

Une paire de fichiers par cas : `<nom>.html` (la page) et `<nom>.json` (l'adresse et ce qu'on doit en tirer).
`tests/link-preview-sites.test.ts` les vérifie tous automatiquement.

Les pages présentes au départ sont **reconstituées** à partir de la structure connue de chaque site.
Pour les remplacer par de vraies pages (à faire depuis le serveur, qui a accès à Internet) :

```sh
npm run lien -- https://www.fnac.com/a17220436/... --save fnac
```

Le script enregistre la page et le résultat actuel ; relisez le `.json` avant de valider.
Quand un site change sa page et qu'un test casse, refaites la capture et ajustez `src/lib/link-preview/sites/<site>.ts`.
