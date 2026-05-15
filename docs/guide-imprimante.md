# Imprimante à tickets — Guide d'installation

Ce guide explique comment connecter une imprimante à tickets à TaapR. Une fois
configurée, **les tickets s'impriment tout seuls** à chaque nouvelle commande
payée.

TaapR supporte deux options. Choisissez selon votre budget et votre matériel :

| Option | Modèles | Prix indicatif | Installation | Avantage |
|---|---|---|---|---|
| **WiFi (Epson)** | Epson TM-m30III | ~280–350 € | 10 min, aucun ordi | Imprime sans poste, branchez et oubliez |
| **USB (ESC/POS)** | Xprinter XP-T80A · Epson TM-T20III · Star TSP143IIIU | ~70 € / 150 € / 200 € | 5 min, sur l'écran cuisine | 2 à 4 fois moins cher |

Comptez environ 10 minutes. Aucune compétence technique nécessaire.

---

## Étape 1 — Allumer et charger l'imprimante

1. Branchez l'imprimante sur une prise.
2. Ouvrez le capot, placez le rouleau de papier, refermez.
3. Allumez l'imprimante (interrupteur sur le côté).

---

## Étape 2 — Connecter l'imprimante au WiFi

1. Sur l'imprimante allumée, **maintenez le bouton « Feed »** (avance papier)
   quelques secondes : un ticket sort avec les **informations réseau** de
   l'imprimante.
2. Suivez la notice Epson fournie pour connecter l'imprimante à **votre réseau
   WiFi** (via l'application *Epson TM Utility* sur smartphone, ou l'assistant
   réseau Epson).
3. Une fois connectée, refaites un appui long sur « Feed » : le ticket doit
   maintenant afficher une **adresse IP** (par ex. `192.168.1.42`). Notez-la.

> L'imprimante et l'appareil que vous utilisez doivent être sur **le même
> réseau WiFi**.

---

## Étape 3 — Créer l'imprimante dans TaapR

1. Connectez-vous à votre espace TaapR.
2. Allez dans **Réglages → Matériel**.
3. Cliquez sur **« Nouvelle imprimante »**.
4. Donnez-lui un nom (ex. : *Cuisine* ou *Comptoir*) puis **Créer**.
5. Une fenêtre affiche une **adresse (URL)** et un **jeton**.
   **Copiez l'URL** — vous en avez besoin à l'étape suivante.

> Cette URL ne s'affiche qu'**une seule fois**. Si vous la perdez, supprimez
> l'imprimante et recréez-la.

---

## Étape 4 — Coller l'URL dans l'imprimante

1. Sur votre ordinateur ou tablette, ouvrez un navigateur et tapez l'**adresse
   IP de l'imprimante** (notée à l'étape 2) dans la barre d'adresse.
2. La page de configuration de l'imprimante Epson s'ouvre.
3. Allez dans le menu **« Server Direct Print »** (Impression directe serveur).
4. **Activez** la fonction.
5. Dans le champ **URL**, collez l'adresse copiée depuis TaapR.
6. Laissez l'**intervalle d'interrogation** sur une valeur courte
   (3 à 5 secondes recommandé).
7. **Enregistrez**. L'imprimante redémarre.

---

## Étape 5 — Vérifier que tout fonctionne

1. Retournez dans **Réglages → Matériel** dans TaapR.
2. À côté de votre imprimante, le statut doit passer à **« En ligne »** (pastille
   verte) au bout de quelques secondes.
3. Cliquez sur **« Imprimer un test »** : un petit ticket de test doit sortir de
   l'imprimante en quelques secondes.

Si le ticket sort : **c'est terminé, votre imprimante est prête.**

---

## Réglages de l'imprimante

Dans **Réglages → Matériel**, pour chaque imprimante vous pouvez activer ou
désactiver :

- **Imprimer le ticket cuisine automatiquement** — un ticket sort à chaque
  nouvelle commande payée (recommandé pour la cuisine).
- **Imprimer le reçu client automatiquement** — un reçu détaillé avec les prix
  sort à chaque commande payée.
- **Imprimante active** — désactivez-la temporairement sans la supprimer.

Vous pouvez ajouter **plusieurs imprimantes** (ex. une en cuisine, une au
comptoir) et régler chacune indépendamment.

---

## Au quotidien

- **Impression automatique** : dès qu'une commande est payée, le ticket sort
  tout seul.
- **Réimprimer un ticket** : sur l'écran cuisine, le bouton imprimante en haut
  de chaque ticket renvoie le ticket cuisine. Sur une commande au comptoir, le
  bouton **« Imprimer le reçu »** renvoie le reçu client.
- Ces boutons fonctionnent autant de fois que nécessaire.

---

## En cas de problème

**Le statut reste « Hors ligne »**
- Vérifiez que l'imprimante est allumée et connectée au WiFi.
- Vérifiez que la fonction « Server Direct Print » est bien **activée** dans la
  configuration de l'imprimante.
- Vérifiez que l'URL collée est **exacte et complète**.

**Rien ne s'imprime alors que le statut est « En ligne »**
- Vérifiez qu'il reste du papier et que le capot est bien fermé.
- Vérifiez que **« Imprimer le ticket cuisine automatiquement »** est activé.
- Faites un **« Imprimer un test »** pour isoler le problème.

**Le ticket sort mais le texte est illisible / mal coupé**
- Vérifiez que le rouleau est bien du papier thermique **80 mm**.
- Vérifiez qu'il est placé dans le bon sens (face imprimable vers le haut).

**L'imprimante était en ligne puis ne répond plus**
- Coupure WiFi ou imprimante éteinte : les tickets en attente s'impriment
  automatiquement dès qu'elle revient en ligne.

Si le problème persiste, contactez le support TaapR.

---

# Option économique — Imprimante USB

Si vous voulez équiper votre établissement pour moins cher, vous pouvez
brancher une **imprimante thermique USB ESC/POS** sur l'ordinateur ou la
tablette qui sert d'**écran cuisine**. C'est l'écran cuisine, ouvert dans
Chrome, qui pilote l'imprimante.

## Modèles compatibles

Toutes les imprimantes thermiques 80 mm qui parlent **ESC/POS USB**
fonctionnent. Trois modèles que nous avons documentés :

| Modèle | Prix indicatif | Notes |
|---|---|---|
| **Xprinter XP-T80A** | ~70 € | Option la moins chère, large diffusion en POS, fiable pour le prix |
| **Epson TM-T20III USB** | ~150 € | Bon compromis fiabilité / prix, garantie 2 ans, drivers irréprochables |
| **Star TSP143IIIU** | ~200 € | Référence POS, autocutter rapide, robustesse haut de gamme |

Tous : papier thermique **80 mm**, autocutter, USB.

## Prérequis

- Un **ordinateur ou une tablette** qui restera allumé pendant le service avec
  l'écran cuisine ouvert.
- **Chrome ou Edge** (Safari n'est pas supporté — WebUSB est une API Chromium).
- L'écran cuisine TaapR ouvert sur `https://www.taapr.fr/admin/<votre-resto>`.

## Étape 1 — Brancher l'imprimante

1. Branchez l'imprimante sur le secteur, mettez du papier 80 mm, fermez le
   capot.
2. Branchez le câble USB sur l'ordinateur / tablette qui affiche l'écran
   cuisine.
3. Allumez l'imprimante.

## Étape 2 — Créer l'imprimante dans TaapR

1. Ouvrez **Réglages → Matériel**.
2. Cliquez **« Nouvelle imprimante »**, choisissez le type **« USB (ESC/POS) »**,
   donnez-lui un nom (« Cuisine » par exemple), puis **Créer**.
3. Une carte d'imprimante apparaît, marquée **non appairée**.

## Étape 3 — Appairer l'imprimante avec Chrome

1. Sur la carte de l'imprimante, cliquez **« Appairer l'imprimante USB »**.
2. Chrome affiche une fenêtre listant les périphériques USB détectés. Choisissez
   votre imprimante, puis **« Se connecter »**.
3. Le badge passe en **« Appairée »**.

## Étape 4 — Ouvrir l'écran cuisine

1. Sur le même ordinateur / tablette, ouvrez l'écran **Commandes** (page
   d'accueil de l'admin TaapR).
2. Un petit indicateur **« Stations USB · 1/1 en ligne »** apparaît en bas à
   droite : l'imprimante est prête.
3. Faites un **« Imprimer un test »** depuis Réglages → Matériel pour vérifier
   qu'un ticket sort bien.

> **Important :** l'imprimante n'imprime que tant que l'onglet **Commandes**
> est ouvert sur ce poste. Si vous fermez l'onglet ou éteignez l'ordinateur,
> les tickets s'accumulent et s'impriment dès le retour en ligne.

## En cas de problème (USB)

**« Imprimante USB introuvable » dans le bandeau en bas**
- Vérifiez que le câble est bien branché et que l'imprimante est allumée.
- Rechargez la page. Si le problème persiste, retournez dans Réglages →
  Matériel et cliquez **« Réappairer »**.

**Rien ne s'imprime**
- Vérifiez que l'onglet Commandes est ouvert sur le poste branché à
  l'imprimante.
- Vérifiez le bandeau « Stations USB » en bas à droite : un message en orange
  indique pourquoi.
- Dans Chrome, ouvrez `chrome://device-log` pour voir les éventuelles erreurs
  USB.

**« Jeton manquant sur ce poste »**
- Le jeton est stocké sur le navigateur du poste qui a créé l'imprimante. Si
  vous changez de poste, ré-appairez l'imprimante depuis Réglages → Matériel
  sur le nouveau poste (le bouton **« Réappairer »** régénère ce qu'il faut).

**Caractères bizarres (é, €) imprimés en `?`**
- Tous les modèles documentés supportent l'encodage CP858 (utilisé par TaapR).
  Si un caractère sort incorrectement, contactez le support.

Si le problème persiste, contactez le support TaapR.
