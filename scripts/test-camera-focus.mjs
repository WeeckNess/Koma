import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const modules=new Map();
function load(path){path=resolve(path);if(modules.has(path))return modules.get(path);const module={exports:{}};const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(p=>load(resolve(dirname(path),p+'.ts')),module,module.exports);modules.set(path,module.exports);return module.exports}
const {configureCamera}=load('lib/camera-focus.ts');
const {rearCameraScore,preferredRear,openMobileCamera,visibleRegion,focusPoint}=load('lib/mobile-camera.ts');
const {createBarcodeReader,startReadLoop,isbnFromCodes}=load('lib/barcode-reader.ts');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function makeTrack(modes=['continuous'],extras={}){const calls=[];return {calls,readyState:'live',getCapabilities:()=>({focusMode:modes,...extras}),getSettings:()=>({focusMode:'continuous',deviceId:'main',zoom:1}),getConstraints:()=>({width:{ideal:1920},deviceId:{exact:'main'},advanced:[{torch:true}]}),applyConstraints:async c=>{calls.push(c)},stop(){this.readyState='ended'}}}
const track=makeTrack(['continuous','single-shot'],{pointsOfInterest:[],zoom:{min:1,max:4},torch:true});
const originalTimeout=globalThis.setTimeout;globalThis.setTimeout=()=>{throw Error('focus must not schedule a timer')};
const control=await configureCamera(track);await settle();globalThis.setTimeout=originalTimeout;
assert.equal(track.calls.length,1);assert.equal(track.calls[0].advanced.at(-1).focusMode,'continuous');assert.deepEqual(track.calls[0].deviceId,{exact:'main'});assert.equal(track.calls[0].advanced[0].torch,true);
await control.focusAt({x:2,y:-1});assert.deepEqual(track.calls.at(-1).advanced.at(-1),{pointsOfInterest:[{x:1,y:0}]});assert.ok(!track.calls.some(c=>c.advanced.at(-1).focusMode==='single-shot'),'never cycle modes');
await control.zoom(99);assert.equal(track.calls.at(-1).advanced.at(-1).zoom,4);control.stop();assert.equal(await control.torch(true),false);
const unsupported=makeTrack([]);const automatic=await configureCamera(unsupported);assert.equal(unsupported.calls.length,0);assert.equal(await automatic.focusAt({x:.5,y:.5}),false);assert.equal(unsupported.calls.length,0);automatic.stop();
const cameras=[{deviceId:'front',label:'Front Camera'},{deviceId:'ultra',label:'Back ultra wide camera'},{deviceId:'main',label:'Back Camera Main'},{deviceId:'tele',label:'Back telephoto'}];
assert.equal(preferredRear(cameras,'ultra'),'main');assert.equal(preferredRear(cameras,'main'),null);assert.equal(preferredRear([{deviceId:'a',label:''},{deviceId:'b',label:''}],'a'),null);assert.ok(rearCameraScore('Caméra arrière principale')>rearCameraScore('Caméra arrière ultra grand angle'));
const opened=[];let active=0,maxActive=0;
const media={getUserMedia:async constraints=>{assert.equal(constraints.audio,false);const id=constraints.video.deviceId?.exact||'ultra';const t=makeTrack();t.getSettings=()=>({deviceId:id});const stream={getVideoTracks:()=>[t],getTracks:()=>[t]};const stop=t.stop.bind(t);t.stop=()=>{if(t.readyState==='live')active--;stop()};active++;maxActive=Math.max(active,maxActive);opened.push({id,t});return stream},enumerateDevices:async()=>cameras.map(c=>({...c,kind:'videoinput'}))};
const camera=await openMobileCamera(media,'',()=>false);assert.deepEqual(opened.map(x=>x.id),['ultra','main']);assert.equal(opened[0].t.readyState,'ended');assert.equal(maxActive,1);camera.stream.getTracks().forEach(t=>t.stop());
await assert.rejects(()=>openMobileCamera(media,'',()=>true));assert.equal(active,0,'late acquisition must be stopped');
const region=visibleRegion(1920,1080,390,350);assert.ok(region.x>0&&region.y>0&&region.x+region.width<=1920&&region.y+region.height<=1080);assert.deepEqual(focusPoint(1920,1080,390,350,195,175),{x:.5,y:.5});
assert.equal(isbnFromCodes([{rawValue:'9782723492592'},{rawValue:'9782723492591'}]),'9782723492591');
let fallbackLoads=0,nativeCalls=0;
class Native{static async getSupportedFormats(){return ['ean_13','qr_code']}constructor(options){assert.deepEqual(options.formats,['ean_13'])}async detect(){nativeCalls++;return [{rawValue:'9782723492591'}]}}
const native=await createBarcodeReader({BarcodeDetector:Native},async()=>{fallbackLoads++;return ()=>null});assert.equal(await native.read({}),'9782723492591');assert.equal(fallbackLoads,0);assert.equal(nativeCalls,1);
class QRonly{static async getSupportedFormats(){return ['qr_code']}constructor(){throw Error('EAN-13 unavailable')}}
const formatsFallback=await createBarcodeReader({BarcodeDetector:QRonly},async()=>()=> '9782723492591');assert.equal(await formatsFallback.read({}),'9782723492591');
const fallback=await createBarcodeReader({},async()=>{fallbackLoads++;return ()=>'9782723492591'});assert.equal(await fallback.read({}),'9782723492591');
class Failing{static async getSupportedFormats(){return ['ean_13']}async detect(){throw Error('native error')}}
const degraded=await createBarcodeReader({BarcodeDetector:Failing},async()=>()=> '9782723492591');assert.equal(await degraded.read({}),null);assert.equal(await degraded.read({}),null);assert.equal(await degraded.read({}),'9782723492591');assert.equal(degraded.engine,'Compatibilité');
class Empty{static async getSupportedFormats(){return ['ean_13']}async detect(){return []}}
const intermittent=await createBarcodeReader({BarcodeDetector:Empty},async()=>()=>'9782723492591');for(let i=0;i<9;i++)assert.equal(await intermittent.read({}),null);assert.equal(await intermittent.read({}),'9782723492591');
// Frame scheduling cannot overlap work, emit twice, or emit after closing.
const jobs=new Map();let nextID=0,resolveFrame,reads=0;const found=[];
const options={visible:()=>true,schedule:cb=>{jobs.set(++nextID,cb);return nextID},cancel:id=>jobs.delete(id)};
const stop=startReadLoop(()=>{reads++;return new Promise(r=>resolveFrame=r)},isbn=>found.push(isbn),options);assert.equal(reads,1);assert.equal(jobs.size,0);resolveFrame(null);await settle();assert.equal(jobs.size,1);const entry=jobs.entries().next().value;jobs.delete(entry[0]);entry[1]();assert.equal(reads,2);stop();resolveFrame('9782723492591');await settle();assert.equal(found.length,0);assert.equal(jobs.size,0);
let count=0;startReadLoop(async()=> '9782723492591',()=>count++,options);await settle();assert.equal(count,1);assert.equal(jobs.size,0);
console.log('OK: one-time AF without timers, no mode cycling, camera selection/release, ROI geometry, native EAN detection, ZXing fallback, non-overlapping frames and cancellation.');
