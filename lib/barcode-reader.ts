import {canonicalISBN} from './books';
type Code={rawValue:string;format?:string};
type Detector={detect:(source:CanvasImageSource|Blob)=>Promise<Code[]>};
type DetectorConstructor={new(options:{formats:string[]}):Detector;getSupportedFormats:()=>Promise<string[]>};
type Fallback=(canvas:HTMLCanvasElement)=>string|null;
async function bounded<T>(promise:Promise<T>){let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Native reader timed out'),{name:'NativeReaderTimeout'})),1500)})])}finally{clearTimeout(timer)}}
export function isbnFromCodes(codes:Code[]){for(const code of codes){const isbn=canonicalISBN(code.rawValue||'');if(isbn)return isbn}return null}
export async function createBarcodeReader(scope:{BarcodeDetector?:DetectorConstructor},loadFallback:()=>Promise<Fallback>){
 let detector:Detector|null=null,failures=0,frames=0,engine='Compatibilité',fallback:Fallback|null=null;
 try{if(scope.BarcodeDetector){const formats=await bounded(scope.BarcodeDetector.getSupportedFormats());if(formats.includes('ean_13')){detector=new scope.BarcodeDetector({formats:['ean_13',...formats.includes('code_128')?['code_128']:[]]});engine='Android / navigateur'}}}catch{}
 let running=false;
 async function read(canvas:HTMLCanvasElement){
  if(running)return null;running=true;frames++;
  try{
   if(detector){try{const isbn=isbnFromCodes(await bounded(detector.detect(canvas)));failures=0;if(isbn)return isbn}catch(error){if((error instanceof Error&&error.name==='NativeReaderTimeout')||++failures>=3){detector=null;engine='Compatibilité'}}}
   // Native detection first. An occasional fallback also handles devices whose
   // native decoder silently fails on otherwise valid EAN-13 images.
   if(!detector||frames%10===0){fallback??=await loadFallback();return canonicalISBN(fallback(canvas)||'')}
   return null;
  }finally{running=false}
 }
 return {read,get engine(){return engine}};
}
export function startReadLoop(read:()=>Promise<string|null>,found:(isbn:string)=>void,options:{visible:()=>boolean;schedule?:(cb:()=>void,ms:number)=>ReturnType<typeof setTimeout>;cancel?:(id:ReturnType<typeof setTimeout>)=>void}){
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
 const schedule=options.schedule||setTimeout,cancel=options.cancel||clearTimeout;
 async function next(){if(stopped)return;try{if(options.visible()){const isbn=await read();if(!stopped&&isbn){stopped=true;found(isbn);return}}}catch{/* A frame error must not stop the scanner. */}if(!stopped)timer=schedule(()=>void next(),120)}
 void next();return ()=>{stopped=true;if(timer!==undefined)cancel(timer)};
}
