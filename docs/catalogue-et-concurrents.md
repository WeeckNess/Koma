# Koma — étude catalogue et évolution du produit

Analyse du 18 octobre 2026. Périmètre : sources publiques officielles de quatre applications représentatives, et examen des adaptateurs réellement présents dans Koma. Ce document ne prétend pas recenser toutes les applications existantes ni connaître leurs systèmes internes non publiés.

## Ce que font les applications comparables

| Application | Parcours documenté | Organisation observable | Ce qui est établi sur le catalogue |
|---|---|---|---|
| MangaCollec | Collection, recherche et planning | Série → édition → tomes, avec distinction tomes parus / à paraître | Les fiches publiques montrent cette structure. Les pages consultées ne fournissent pas de contrat d’API publique réutilisable ni une liste vérifiable de tous leurs fournisseurs. |
| Bubble | Scanner un code-barres, ouvrir la série, sélectionner les tomes possédés | Séries, albums, éditions, envies et manquants | Une édition absente peut faire l’objet d’une demande d’ajout. Les pages consultées ne révèlent pas un flux permettant de reprendre intégralement leur catalogue. |
| Bdphile | Gestion de collection et contributions | Séries, albums, éditions et collection personnelle | Présentation communautaire et enrichissement par contributions. Aucun accès global réutilisable au catalogue établi dans cette étude. |
| CLZ Comics | Scan, recherche de série ou d’un numéro, sélection des numéros | Série → numéro → variante, avec couverture | CLZ nomme sa base Core, décrit ses responsables de contenu et la correction des couvertures. Elle ne se réduit pas à une API universelle de livres. |

Sources primaires :
- [MangaCollec](https://www.mangacollec.com/) et [fiche d’édition Minecraft](https://www.mangacollec.com/editions/33c13f7f-f104-400a-8fd8-1527297d5f17).
- [Bubble : ajouter une collection](https://help.bubblebd.com/fr/articles/1816914-ajouter-une-ou-plusieurs-collections).
- [Bubble : choisir son édition](https://help.bubblebd.com/fr/articles/4640891-choisir-son-edition).
- [Bdphile](https://www.bdphile.fr/) et [enrichissement par contributions](https://www.bdphile.fr/blog/view/70/).
- [CLZ : fonctionnement du catalogue](https://clz.com/comics/mobile).
- [CLZ : travail des responsables de contenu et corrections de couvertures](https://clz.com/blog/newsletter/2024/10/31/clz-news-we-are-now-clz-new-website-at-clz-com).

## Conclusion et méthode appliquée

L’avantage visible de ces produits est un catalogue structuré, entretenu et corrigé, complété par une interface qui montre la série avant les tomes. L’étude ne justifie pas l’affirmation qu’ils utilisent tous une même API accessible gratuitement. Aucun catalogue privé de concurrent n’a été copié, aucun accès privé n’a été utilisé.

Koma reprend cette organisation : vue principale par séries/éditions, tomes possédés classés numériquement, compte exact et distinction des langues et éditions identifiables (standard, deluxe, perfect…). Le modèle accepte des métadonnées explicites de série, édition et numéro de tome. Les anciennes fiches sont regroupées par analyse de titre ; ce regroupement reste une estimation lorsque les métadonnées d’origine sont ambiguës. La bibliothèque décorative devient secondaire.

Le catalogue continue d’utiliser les dix sources configurées : Glénat, Google Books, Open Library, BnF, Pika, nobi nobi !, Hachette, Inventaire, openBD et Penguin Random House. Leurs périmètres restent différents. Les index Pika, nobi et Hachette ont été rafraîchis : 6 979, 1 127 et 5 579 liens ISBN respectivement. Avec l’index Glénat existant (5 547), cela représente 13 654 ISBN uniques indexés. Un lien indexé n’est pas une fiche entièrement importée ni une couverture validée ; ce chiffre ne représente donc pas 13 654 couvertures garanties, et ne se compare pas directement au nombre de mangas d’un concurrent.

Les éditions résolues sont désormais conservées individuellement sept jours dans le cache partagé, avec leurs champs de série, édition et tome. Seules des fiches issues des sources de catalogue entrent dans ce cache ; les fiches personnelles ne sont pas publiées automatiquement. Les propositions personnelles restent soumises à vérification.

## Couvertures cohérentes et rapides

- Correspondance par ISBN exact : pas de remplacement par la couverture d’un autre tome ou d’une autre édition.
- Suppression de l’utilisation d’une image de « work » Open Library avec l’ISBN arbitraire d’une édition.
- Priorité aux couvertures de face BnF et aux visuels dédiés ; rejet des liens explicitement marqués mockup, packshot, 3D ou dos de couverture.
- Vérification de la taille et du rapport largeur/hauteur avant affichage ; un rendu carré de produit ne remplace pas automatiquement une couverture.
- Affichage dans un cadre uniforme, sans déformation, découpe arbitraire ou effet de livre en perspective.
- Sources initiales testées en parallèle, plutôt que douze secondes d’attente avant chaque repli ; concurrence limitée pour éviter de saturer la connexion.
- Miniatures demandées lorsque le fournisseur expose un redimensionnement connu ; préchargement à proximité de l’écran.
- Source qui fonctionne mémorisée par ISBN et visuel personnel, pour stabiliser le résultat d’une page à l’autre ; cache local borné de 250 images sur les domaines de couverture connus.
- Données privées et API de collection toujours exclues du cache du service worker.

Limites : les heuristiques ne reconnaissent pas à coup sûr chaque photographie 3D sans indication dans son URL. Un premier chargement ne peut pas être instantané sur tous les réseaux. Une panne simultanée des sources, une édition non répertoriée ou une couverture non publiée nécessitent encore un visuel provisoire ou une correction. Le cache du navigateur peut être effacé par l’utilisateur ou le système.

## Ce qui reste nécessaire pour atteindre une couverture comparable

Un référentiel complet demande un flux bibliographique réutilisable et maintenu, ou un travail d’import et de vérification continu auprès des éditeurs. Il reste à mesurer la couverture sur un échantillon représentatif, à structurer explicitement les séries ambiguës, à mettre en place une modération des corrections et à actualiser automatiquement les annonces. Aucune parité de volume avec MangaCollec ou Bubble, aucune absence absolue de bugs et aucune disponibilité de 100 % des couvertures ne sont annoncées.
