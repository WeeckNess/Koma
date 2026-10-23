# Koma — outils de collection et de lecture

La collection reste l’entrée principale. L’onglet **Mon quotidien**, dans Ma mangathèque, rassemble les usages annexes. Les couleurs, polices, cartes et cinq onglets principaux existants sont conservés.

| Fonction | Accès | Comportement |
| --- | --- | --- |
| Mode librairie | Collection → Mode librairie | Vérification immédiate d’un ISBN possédé ou souhaité sur la copie locale ; avertissement sur les autres éditions. Sans réseau, les correspondances non vérifiables sont indiquées, jamais inventées. |
| Ajout par lots | Collection → Ajouter par lots | Recherche dans les index éditeurs, récupération des fiches exactes par ISBN, filtre d’édition, choix explicite, ajout sans écrasement. Pagination de 12 fiches. |
| Import | Collection → Importer | CSV ou JSON, aperçu, ISBN invalides et doublons bloqués, vérification facultative des fiches. Maximum 500 tomes et 2 Mo par import. Les fiches personnelles non vérifiées restent personnelles. |
| Suivi sans possession | Toute fiche → Suivre la série | Suivi séparé de la collection, distinct par édition et langue. Les séries suivies rejoignent le filtre Mes séries du calendrier. |
| Sorties et reports | Mon quotidien → Mes alertes | Vérification à l’ouverture/actualisation ; récapitulatif quotidien ou hebdomadaire dans l’app, reports de date dédupliqués. |
| Rappels sur téléphone | Mon quotidien → Mes séries suivies | Abonnement ICS privé, révocable, limité aux annonces des séries suivies. Rappel la veille. Actualisation et affichage des alertes gérés par l’app Calendrier du téléphone. Ce n’est pas un service de notifications push Koma. |
| Prêts | Mon quotidien → Mes prêts / Amis | Suivi manuel avec date souhaitée et retour, historique, demandes entre amis acceptés avec collection partagée, acceptation/refus et alertes dans Koma. Aucune messagerie externe automatique. |
| Cadeaux | Mes envies → Partager mes envies | Partage désactivé par défaut, lien indépendant et révocable. Réservation atomique pour éviter les cadeaux en double ; réservations masquées au propriétaire. Clé d’annulation conservée sur l’appareil du proche. Aucune commande passée. |
| Comparaison d’amis | Amis → Collection → Comparer | ISBN en commun, envies présentes chez l’ami, découvertes et demande de prêt. |
| Pile à lire | Mon quotidien → À lire | En cours, en pause, abandonné, terminé, et mise en tête de pile. L’état lu/non lu et le rangement restent indépendants. |
| Budget | Mon quotidien → Mon budget | Prix payés et dates saisis par le propriétaire, prévisions pour les envies datées avec prix renseigné ; prix manquants explicités. Pas de cote de revente inventée. |
| Bibliothèque évolutive | Collection → Bibliothèque / Succès | Décors et rangement existants ; nouveaux thèmes déblocables à 5 et 50 lectures. |
| Emplacement physique | Fiche → Mon exemplaire | Pièce, meuble et emplacement précis. Données privées, exclues du partage entre amis. |
| Contributions | Fiche → Signaler / Mon quotidien → Catalogue | Proposition et source, suivi privé en attente de vérification. Aucun remplacement public automatique ; la validation éditoriale des propositions reste une intervention humaine. |
| Bilan | Mon quotidien → Mon bilan | Lectures datées et ajouts du mois, favoris notés, objectif personnel et carte PNG partageable. Les anciennes lectures sans événement daté ne sont pas rétroactivement inventées. |
| Recommandations | Mon quotidien → À lire | Trois suggestions, avec raison : auteur connu, collection partagée d’un ami ou sélection découverte. Aucune API d’IA payante. |
| Photos de tranches | Fiche → Mon exemplaire | Compression JPEG sur l’appareil, stockage R2 privé ; affichage dans la bibliothèque. Maximum 1 000 photos par compte. Sans photo : représentation graphique, pas une vraie tranche prétendue. |

## Données et confidentialité

- D1 : tables ajoutées par les migrations 0005 et 0006. Les migrations précédentes et les données de collection sont conservées.
- R2 : liaison `BUCKET`, photos servies uniquement au propriétaire ou à un ami autorisé quand la photo est encore associée à un tome possédé et partagé.
- Le budget, les dates d’achat, les notes privées et les emplacements précis ne sont pas exposés dans les collections d’amis.
- Le partage cadeau expose seulement les envies et les informations publiques d’édition, jamais la collection possédée ni le budget.
- Les calendriers ICS utilisent un lien secret révocable ; seul le sous-ensemble de sorties suivies y figure.
- L’import n’écrase pas les exemplaires existants. Les sauvegardes JSON existantes restent disponibles ; le nouvel export CSV inclut les informations personnelles de chaque exemplaire.

## Vérification

- `node scripts/test-reader.mjs` : ISBN, éditions/coffrets, CSV/JSON, montants, confidentialité, ordre de lecture, bilan et ICS.
- `KOMA_TEST_URL=http://127.0.0.1:3006 node scripts/test-reader-api.mjs` : API compilée locale, comptes isolés de test, réservations concurrentes et révocations, prêts, photos R2, alertes et imports.
- `scripts/test-api.mjs`, `scripts/test-releases.mjs`, `scripts/test-series.mjs`, `scripts/test-catalog-providers.mjs`, `scripts/test-camera-focus.mjs` : régressions des fonctions existantes.
- Les identités simulées de test sont exclusivement autorisées sur localhost. Ne jamais exécuter les tests de mutation contre le site publié.
