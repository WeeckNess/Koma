import {editionInfo} from './series';
export type Counts={owned:number;read:number;series:number;friends:number};
export type Customization={theme:string;decoration:string};
export const themes=[{id:'classic',name:'Chêne clair',goal:''},{id:'walnut',name:'Noyer chaleureux',goal:'collector10'},{id:'forest',name:'Refuge végétal',goal:'reader10'},{id:'night',name:'Nuit étoilée',goal:'collector50'},{id:'paper',name:'Papier & encre',goal:'reader5'},{id:'sunset',name:'Lumière du soir',goal:'reader50'}];
export const decorations=[{id:'none',name:'Épuré',goal:''},{id:'plant',name:'Petite plante',goal:'first'},{id:'cat',name:'Chat de bibliothèque',goal:'explorer'},{id:'trophy',name:'Trophée de lecture',goal:'reader25'}];
export const goals:{id:string;name:string;description:string;metric:keyof Counts;target:number;xp:number;reward:string}[]=[
 {id:'first',name:'Le premier chapitre',description:'Ajouter votre premier manga.',metric:'owned',target:1,xp:20,reward:'Décoration Petite plante'},
 {id:'reader1',name:'Juste un chapitre de plus',description:'Marquer un premier tome comme lu.',metric:'read',target:1,xp:20,reward:'Badge Première lecture'},
 {id:'collector10',name:'L’étagère prend vie',description:'Réunir 10 tomes dans votre collection.',metric:'owned',target:10,xp:60,reward:'Thème Noyer chaleureux'},
 {id:'explorer',name:'Des univers plein la tête',description:'Collectionner 5 séries différentes.',metric:'series',target:5,xp:60,reward:'Décoration Chat de bibliothèque'},
 {id:'reader5',name:'Le plaisir de lire',description:'Avoir 5 tomes marqués comme lus.',metric:'read',target:5,xp:50,reward:'Thème Papier & encre'},
 {id:'reader50',name:'Des histoires plein la tête',description:'Avoir 50 tomes marqués comme lus.',metric:'read',target:50,xp:180,reward:'Thème Lumière du soir'},
 {id:'reader10',name:'Lecteur passionné',description:'Avoir 10 tomes marqués comme lus.',metric:'read',target:10,xp:80,reward:'Thème Refuge végétal'},
 {id:'social',name:'Les histoires se partagent',description:'Avoir un premier ami accepté.',metric:'friends',target:1,xp:30,reward:'Badge Compagnon de lecture'},
 {id:'reader25',name:'Marathon de lecture',description:'Avoir 25 tomes marqués comme lus.',metric:'read',target:25,xp:120,reward:'Décoration Trophée de lecture'},
 {id:'collector50',name:'Un monde sur mes étagères',description:'Réunir 50 tomes dans votre collection.',metric:'owned',target:50,xp:150,reward:'Thème Nuit étoilée'},
];
export function seriesKey(title:string){return title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s*(?:[·—-]\s*)?(?:edition originale\s*[-·—]?\s*)?(?:tome|vol\.?|volume)\s*\d+.*$/i,'').replace(/[·—-]\s*$/,'').trim()}
export function countBooks(books:{title:string;status?:string;read?:boolean;publisher?:string;language?:string;seriesTitle?:string;volume?:number;edition?:string}[],friends=0):Counts{const owned=books.filter(b=>b.status!=='wish');return {owned:owned.length,read:owned.filter(b=>b.read).length,series:new Set(owned.map(b=>editionInfo({isbn:'',author:'',cover:'',description:'',date:'',source:'',publisher:'',...b}).key)).size,friends}}
export function earnedNow(counts:Counts){return Object.fromEntries(goals.filter(g=>counts[g.metric]>=g.target).map(g=>[g.id,true]))}
export function experience(earned:Record<string,boolean>={}){return goals.reduce((sum,g)=>sum+(earned[g.id]?g.xp:0),0)}
export function unlocked(goal:string,earned:Record<string,boolean>={}){return !goal||earned[goal]===true}
