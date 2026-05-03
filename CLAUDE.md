# Foodshop / TaapR — agent notes

## PRs et branche de base

Le repo a souvent plusieurs PR stackées (ex. `main ← #62 ← #63 ← #64`). La PR
en cours qui sert de "trunk" change donc fréquemment.

**Avant de créer une PR :**

1. Lister les PR ouvertes pour repérer la chaîne :
   ```bash
   GH_TOKEN= gh pr list --json number,title,baseRefName,headRefName,state
   ```
2. Identifier la branche au sommet (la plus en aval, dont la `headRefName`
   n'est la `baseRefName` d'aucune autre PR) — c'est l'« actuelle à jour ».
3. Rebaser sur `origin/<cette-branche>` et créer la PR avec
   `--base <cette-branche>` (pas `main`).

Si l'utilisateur indique explicitement une branche ("la dernière à jour est
`yfassi/foo`"), prendre celle-là sans deviner.

## Authentification GitHub CLI

`GH_TOKEN` est défini dans l'environnement et pointe sur l'org `DeskeoTech`,
qui n'est **pas collaborateur du repo `yfassi/foodshop`**. Toutes les
commandes `gh` qui touchent au repo doivent être lancées en désactivant le
token :

```bash
GH_TOKEN= gh pr create ...
GH_TOKEN= gh pr list ...
```

Sans ça, `gh pr create` renvoie `must be a collaborator`. Le keyring contient
le compte `yfassi` qui prend le relais quand `GH_TOKEN` est vide.

## Supabase

- Project ref : `modisknrblsddpmzmhja` (n'apparaît pas dans `list_projects` du
  MCP — l'org Vercel est différente). Pour interroger la base, utiliser le
  service-role key depuis `.env.local` avec `@supabase/supabase-js` :

  ```bash
  set -a && source .env.local && set +a && node --input-type=module -e "..."
  ```

- Les `restaurants` sont liés à `auth.users(id)` via `owner_id`. Un user peut
  désormais en posséder plusieurs (cf. switcher dans `AdminShell`).
