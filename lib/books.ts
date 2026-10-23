export type Book={isbn:string;title:string;seriesTitle?:string;volume?:number;edition?:string;author:string;cover:string;description:string;publisher:string;date:string;source:string;language?:string;sourceUrl?:string;checkedAt?:string;shelf?:string;position?:number;spineColor?:string;customCover?:string;spinePhoto?:string;readingState?:'to-read'|'reading'|'paused'|'abandoned'|'finished';queueOrder?:number;readAt?:string;pricePaidCents?:number;plannedPriceCents?:number;purchasedAt?:string;room?:string;cabinet?:string;location?:string;notes?:string;rating?:number;reviewShared?:boolean;coverageSeries?:string;coverageStart?:number;coverageEnd?:number};
export type Item=Book & {status:'owned'|'wish';read:boolean;created:string};
export const featured:Book[]=[
 ['9782723488525','One Piece · Tome 1','Eiichiro Oda','Glénat'],
 ['9782811611699','L’Attaque des Titans · Tome 1','Hajime Isayama','Pika'],
 ['9791032705544','Jujutsu Kaisen · Tome 1','Gege Akutami','Ki-oon'],
 ['9791032710838','Frieren · Tome 1','Kanehito Yamada & Tsukasa Abe','Ki-oon'],
 ['9782380710243','Spy × Family · Tome 1','Tatsuya Endo','Kurokawa'],
 ['9782809482317','Demon Slayer · Tome 1','Koyoharu Gotouge','Panini']
].map(([isbn,title,author,publisher])=>({isbn,title,author,publisher,cover:`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,description:'Recherchez cet ISBN pour consulter les informations de cette édition dans le catalogue.',date:'',source:'Sélection Koma · ISBN vérifiés',language:'fr'}));
export function validISBN(raw:string){const s=raw.replace(/[\s-]/g,'');if(/^97[89]\d{10}$/.test(s))return [...s].reduce((n,x,i)=>n+Number(x)*(i%2?3:1),0)%10===0;if(/^\d{9}[\dX]$/.test(s))return [...s].reduce((n,x,i)=>n+(x==='X'?10:Number(x))*(10-i),0)%11===0;return false;}

const covers:Record<string,string>={
'9782723488525':'https://media.hachette.fr/fit-in/500x500/imgArticle/GLENAT/2013/9782723488525-X.jpg',
'9782811611699':'https://media.hachette.fr/fit-in/500x500/imgArticle/PIKA/2013/9782811611699-X.jpg',
'9791032705544':'https://api.ki-oon.com/images/volumes/9791032705544.jpg',
'9791032710838':'https://api.ki-oon.com/images/volumes/9791032710838.jpg'
};
featured.forEach(b=>{if(covers[b.isbn])b.cover=covers[b.isbn]});

export const upcomingSelection:Book[]=[{isbn:'9782344071137',title:'One Piece · Tome 114',author:'Eiichiro Oda',publisher:'Glénat',date:'2026-12-02',cover:'',description:'Un nouveau tome de la quête du One Piece. Couverture non encore disponible sur le site de l’éditeur lors de la vérification.',source:'Glénat · date annoncée',language:'fr',sourceUrl:'https://www.glenat.com/glenat-manga/one-piece-edition-originale-tome-114-9782344071137/',checkedAt:'2026-10-11'}];

const localCovers:Record<string,string>={'9782723488525':'one-piece','9782811611699':'titans','9791032705544':'jujutsu','9791032710838':'frieren','9782380710243':'spy'};featured.forEach(b=>{if(localCovers[b.isbn])b.cover='/'+localCovers[b.isbn]+'.jpg'});

export function canonicalISBN(raw:string):string|null {
 const value=raw.replace(/[\s-]/g,'').toUpperCase();
 if(!validISBN(value))return null;
 if(value.length===13)return value;
 const base='978'+value.slice(0,9);
 const sum=[...base].reduce((n,x,i)=>n+Number(x)*(i%2?3:1),0);
 return base+((10-sum%10)%10);
}
