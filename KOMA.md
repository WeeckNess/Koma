# Koma : hébergement, comptes et synchronisation

Application React/Vinext hébergée avec Sites et base Cloudflare D1 provisionnée par la plateforme. Aucun abonnement Cloudflare, Firebase ou fournisseur bibliographique payant n’a été ajouté. Les conditions et limites de l’hébergement Sites restent celles du compte utilisé ; ce projet ne promet pas une disponibilité ou une capacité illimitée.

## Fonctionnement

- Site consultable publiquement après ouverture autorisée par le propriétaire ; connexion ChatGPT requise pour les données personnelles.
- Collections privées par défaut, envies toujours privées. Invitations entre amis avec acceptation, refus, annulation et retrait. Les collections possédées sont visibles uniquement aux amis acceptés lorsque le partage est activé.
- Même base pour le site et les appareils Expo associés. Une association doit être explicitement approuvée dans le navigateur connecté. Le secret aléatoire de 256 bits est conservé dans le stockage sécurisé du téléphone ; seul son SHA-256 est conservé côté serveur. Association en attente : 10 minutes ; accès approuvé : 30 jours, révocable dans les préférences.
- Copie locale et file de mutations durables, envoi séquentiel, identifiants d’opération empêchant le rejeu, synchronisation au retour de l’application et périodiquement lorsqu’elle est ouverte. En cas de modifications concurrentes du statut, la dernière opération reçue par le serveur gagne. Une modification d’un tome supprimé ne le recrée pas.
- Sur le web déjà ouvert, les changements peuvent être mis en attente hors connexion. Lors d’un démarrage web sans réseau, une page de secours permet de consulter la dernière copie. Les API privées ne sont jamais mises dans le cache du service worker. La déconnexion web efface la copie locale ; un bouton permet aussi de l’effacer sur la page hors ligne.
- Sauvegarde avant la première modification de chaque journée active, conservée sept jours, avec restauration dans les préférences. Ce sont des copies dans la même base, pas une sauvegarde indépendante du fournisseur. Export/import JSON pour conserver une copie externe ; imports limités à 500 mangas et 2 Mo, sans écraser les ISBN existants.
- Catalogue : 5 547 ISBN Glénat indexés, fiches publiques consultées à la demande, Google Books/Open Library en complément, cache persistant partagé de 24 h et repli sur une fiche déjà enregistrée en cas de panne. Calendrier partiel actualisé à l’ouverture et mis en cache une heure. Les sources externes restent partielles.
- Fiches personnelles pour les éditions absentes ; propositions conservées pour vérification, sans publication automatique dans le catalogue commun.
- Limitation des recherches, imports, associations, invitations et écritures ; ISBN strictement vérifié, requêtes SQL paramétrées, autorisation par propriétaire et vérification d’origine sur les écritures de navigateur.
- `/api/health` vérifie la disponibilité de la base. Aucun service payant de surveillance ni système d’alerte externe n’a été activé.

## Contrôles

`npx tsc --noEmit`, build de production et tests `node scripts/test-api.mjs` sur base locale uniquement. Les tests couvrent séparation des comptes, confidentialité, ISBN, rejeu, origine, invitations, association/révocation, sauvegarde/restauration et import. Les migrations SQL sont append-only. Le compte fictif des tests ne correspond pas à un utilisateur hébergé.

Le scan matériel, l’association depuis un vrai téléphone et la restauration d’un incident fournisseur restent à valider sur les appareils et le compte de l’utilisateur. La compilation mobile ne constitue pas une validation matérielle.

## Hébergement et évolution

Les migrations hébergées sont appliquées par Sites lors du déploiement. La version web installable fonctionne sans le Mac. Expo Go conserve son besoin de serveur de développement ; une application Android autonome nécessite une compilation APK et iOS une distribution adaptée. Aucun accès payant aux boutiques n’est souscrit.

La couverture exhaustive des éditeurs, la reprise d’API privées de tiers et une garantie de disponibilité ne sont pas incluses. L’index Glénat est un instantané, à actualiser lors des livraisons ; les résultats de fiches sont rafraîchis à la demande. Les droits de redistribution des données et couvertures doivent être validés avec chaque source pour une distribution à grande échelle.
