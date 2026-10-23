# Scanner Android / Chrome / PWA — 20 octobre 2026

Cette refonte remplace la tentative précédente de reconfigurer le focus toutes les 2,5 secondes. Ce minuteur, les passages au mode single-shot et le redémarrage de caméra déclenché par un simple toucher ont été supprimés.

## Capture et mise au point

Un seul flux caméra arrière reste ouvert pendant le scan. Après autorisation, les libellés d’objectifs sont examinés : une caméra arrière explicitement principale est préférée à une caméra ultra grand angle, macro ou téléobjectif. Il s’agit d’une heuristique sur les noms exposés par le fabricant, pas d’une identification matérielle garantie. Si la piste signale explicitement un mode de focus « none », au plus deux autres caméras clairement arrière sont examinées, en libérant l’ancienne avant d’ouvrir la suivante. Une absence de capacités n’est pas interprétée comme la preuve d’un objectif à focus fixe. Le choix manuel est accessible dans l’aide.

Le mode continuous est demandé une seule fois lorsqu’il est exposé ; le système caméra Android pilote ensuite la mise au point. Aucun timer ne modifie le focus. Les paramètres rapportés par la piste sont consultables, sans prétendre que l’image est nette. Le zoom et la torche sont proposés uniquement s’ils sont exposés. Un toucher ne demande un point de mesure que si cette capacité est signalée ; il ne change pas le mode de focus et ne redémarre pas le flux.

## Lecture mobile

BarcodeDetector est sélectionné à l’exécution lorsque le navigateur confirme le support d’EAN-13. Le lecteur JavaScript ZXing est chargé uniquement en repli : API absente, erreurs natives répétées, ou essai périodique lorsque le lecteur natif ne trouve rien. La présence de Chrome sur Android ne suffit pas à présumer que l’API est disponible.

Le cadre horizontal est projeté dans les vrais pixels du flux, en tenant compte du recadrage object-fit: cover. Le décodage ne parcourt pas une capture d’écran étirée et ne cherche pas de codes dans l’arrière-plan hors cadre. Les lectures sont asynchrones et séquentielles ; la suivante attend la précédente. Un ISBN doit passer son contrôle de clé. Après détection, le flux s’arrête et un seul résultat est transmis à la recherche.

## Solution de secours par appareil photo Android

« Utiliser l’appareil photo du téléphone » libère le flux vidéo et ouvre une saisie fichier avec capture=environment. Selon Chrome et Android, cela lance l’application photo arrière ou une interface de choix. La photo est décodée localement avec le même lecteur, en limitant sa résolution de travail ; elle n’est pas téléversée. L’annulation ou l’échec permet de reprendre le scan. Un succès conserve l’arrêt de caméra pendant la recherche du manga.

## Validation et limites

Tests : absence de minuteur de focus et de changement périodique de mode ; préservation des contraintes ; sélection de caméra et libération des anciennes acquisitions ; géométrie du cadre ; lecteur natif disponible/absent/en erreur ; repli ZXing ; ISBN invalide ; absence de lectures concurrentes ; absence d’émission après fermeture ; vérification TypeScript et compilation. L’interface est examinée en format mobile.

Aucun téléphone Android n’est connecté à l’environnement de développement. Ces tests ne constituent donc pas une validation optique sur l’appareil de l’utilisateur. La variante exacte de caméra, les reflets, la distance minimale de mise au point et les capacités exposées restent des facteurs à vérifier sur ce téléphone. Le changement concerne le site/PWA ; Expo n’a pas été modifié.

Références officielles :
- [Chrome — Shape Detection / BarcodeDetector](https://developer.chrome.com/docs/capabilities/shape-detection)
- [MDN — BarcodeDetector et détection des capacités](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)
- [W3C — Image Capture, focusMode continuous](https://www.w3.org/TR/image-capture/)
- [W3C — Media Capture et sélection de périphérique](https://w3c.github.io/mediacapture-main/getusermedia)
- [W3C — HTML Media Capture](https://www.w3.org/TR/html-media-capture/)
