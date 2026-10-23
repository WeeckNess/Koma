export type CoverCandidate = {url:string;source:string;retrievedAt?:string};

// Official BnF cover service: exact commercial edition, never a series-level image.
// Both dimensions are required: width alone can return an almost empty image.
export function bnfCover(isbn:string):CoverCandidate {
 return {url:`https://openapi.bnf.fr/couverture/image/image/recupererImage?EAN=${isbn}&couverture=1&taille=originale&largeur=600&hauteur=900`,source:'Bibliothèque nationale de France',retrievedAt:new Date().toISOString().slice(0,10)};
}

