// Presentation policy is shared by the API and browser. Product mockups are never
// converted into a front cover: an alternative exact-ISBN source is required.
export function usableCover(url:string){return !!url&&!/placeholders?|indisponible|no[-_]?cover|mock[-_ ]?up|packshot|(?:^|[\/_-])3d(?:[\/_? .-]|$)|quatrieme|4e-couv|back[-_]cover/i.test(url)}
export function thumbnail(url:string){
 if(url.includes('media.hachette.fr/'))return url.replace(/\/fit-in\/\d+x\d+\//,'/fit-in/360x540/');
 if(url.includes('openapi.bnf.fr/'))return url.replace(/largeur=\d+/,'largeur=320').replace(/hauteur=\d+/,'hauteur=480');
 return url.replace(/^http:/,'https:');
}
export function coverScore(url:string){
 if(/^\/[a-z0-9-]+\.jpg$/i.test(url))return 0;
 if(url.includes('openapi.bnf.fr/'))return 1;
 if(url.includes('images.penguinrandomhouse.com/'))return 2;
 if(url.includes('covers.openlibrary.org/')||url.includes('books.google.'))return 3;
 return 4;
}
