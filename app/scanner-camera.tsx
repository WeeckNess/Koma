'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Flashlight,RefreshCw,ScanLine} from 'lucide-react';
import {configureCamera,reportedFocus} from '../lib/camera-focus';
import {openMobileCamera,stopCamera,visibleRegion,focusPoint} from '../lib/mobile-camera';
import {createBarcodeReader,startReadLoop} from '../lib/barcode-reader';

async function reader(){return createBarcodeReader(window as unknown as Parameters<typeof createBarcodeReader>[0],async()=>{
 const [{BrowserMultiFormatReader},{BarcodeFormat,DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
 const hints=new Map();hints.set(DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.CODE_128]);hints.set(DecodeHintType.TRY_HARDER,true);
 const decoder=new BrowserMultiFormatReader(hints);
 return canvas=>{try{return decoder.decodeFromCanvas(canvas).getText()}catch{return null}};
})}

export default function ScannerCamera({onCode}:{onCode:(isbn:string)=>void}){
 const [attempt,setAttempt]=useState(0),[device,setDevice]=useState(''),[live,setLive]=useState(true),[photoBusy,setPhotoBusy]=useState(false),[photoError,setPhotoError]=useState(''),[photoDetected,setPhotoDetected]=useState(false);
 const input=useRef<HTMLInputElement>(null),callback=useRef(onCode),mounted=useRef(true);callback.current=onCode;
 useEffect(()=>{mounted.current=true;const cancel=()=>setLive(true);input.current?.addEventListener('cancel',cancel);return()=>{mounted.current=false;input.current?.removeEventListener('cancel',cancel)}},[]);
 async function photo(file:File){
  setPhotoBusy(true);setPhotoError('');setPhotoDetected(false);let recognized=false;let bitmap:ImageBitmap|undefined;
  try{bitmap=await createImageBitmap(file);if(!mounted.current)return;
   const canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');if(!context)throw Error();context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const decoder=await reader();let isbn:string|null=null;for(let i=0;i<10&&!isbn&&mounted.current;i++)isbn=await decoder.read(canvas);
   if(!mounted.current)return;if(isbn){recognized=true;setPhotoDetected(true);callback.current(isbn)}else setPhotoError('Code-barres illisible sur cette photo. Photographiez le code en entier, sans reflet.');
  }catch{if(mounted.current)setPhotoError('Cette photo ne peut pas être lue. Réessayez ou saisissez l’ISBN.')}finally{bitmap?.close();if(mounted.current){setPhotoBusy(false);setLive(!recognized)}}
 }
 return <div className="scanner-camera android-scanner">{live?<CameraSession key={device+'|'+attempt} device={device} onDevice={setDevice} onCode={isbn=>callback.current(isbn)} onRestart={()=>setAttempt(n=>n+1)}/>:<div className="camera-frame"><div className="camera-photo-state"><Camera size={36}/><span>{photoBusy?'Lecture de la photo…':photoDetected?'Code reconnu · recherche du manga…':'Appareil photo du téléphone ouvert'}</span><button className="secondary" disabled={photoBusy} onClick={()=>setLive(true)}>Revenir au scan</button></div></div>}
 <div className="scan-photo-option"><label className="text-button"><Camera size={17}/>Utiliser l’appareil photo du téléphone<input ref={input} type="file" accept="image/*" capture="environment" disabled={photoBusy} onClick={()=>{setPhotoDetected(false);setLive(false)}} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void photo(file);else setLive(true)}}/></label><small>Si l’aperçu reste flou : prenez une photo nette du code-barres.</small></div>{photoError&&<p className="error" role="alert">{photoError}</p>}</div>
}

function CameraSession({device,onDevice,onCode,onRestart}:{device:string;onDevice:(id:string)=>void;onCode:(isbn:string)=>void;onRestart:()=>void}){
 const video=useRef<HTMLVideoElement>(null),box=useRef<HTMLDivElement>(null),camera=useRef<Awaited<ReturnType<typeof configureCamera>>|null>(null),callbacks=useRef({onCode,onRestart});callbacks.current={onCode,onRestart};
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[detected,setDetected]=useState(false),[devices,setDevices]=useState<MediaDeviceInfo[]>([]),[activeID,setActiveID]=useState(''),[torch,setTorch]=useState(false),[torchAvailable,setTorchAvailable]=useState(false),[zoom,setZoom]=useState(1),[zoomMax,setZoomMax]=useState(1),[toolsBusy,setToolsBusy]=useState(false),[details,setDetails]=useState({label:'',resolution:'',focus:'',engine:''});
 useEffect(()=>{
  let closed=false,decoded=false,stream:MediaStream|null=null,track:MediaStreamTrack|undefined,stopReading:(()=>void)|undefined,openingTimer:ReturnType<typeof setTimeout>|undefined;
  const element=video.current!;
  const cleanup=()=>{clearTimeout(openingTimer);stopReading?.();camera.current?.stop();camera.current=null;track?.removeEventListener('ended',ended);stopCamera(stream);if(element.srcObject===stream)element.srcObject=null};
  const ended=()=>{if(!closed&&!decoded){stopReading?.();setReady(false);setError('La caméra a été interrompue. Vous pouvez la relancer.')}};
  const visibility=()=>{if(document.hidden||closed||decoded)return;if(track?.readyState==='ended'){callbacks.current.onRestart();return}if(element.paused)void element.play().catch(()=>{})};
  document.addEventListener('visibilitychange',visibility);
  (async()=>{try{
   openingTimer=setTimeout(()=>{if(!closed&&!stream)setError('Autorisez la caméra dans Chrome, puis réessayez.')},12000);
   const opened=await openMobileCamera(navigator.mediaDevices,device,()=>closed);stream=opened.stream;clearTimeout(openingTimer);if(closed){cleanup();return}
   track=stream.getVideoTracks()[0];track.addEventListener('ended',ended);setDevices(opened.devices);setActiveID(track.getSettings().deviceId||'');
   // Focus belongs to the Android camera; configure continuous mode once.
   const control=await configureCamera(track);if(closed){control.stop();cleanup();return}camera.current=control;
   setTorchAvailable(control.capabilities.torch===true||Array.isArray(control.capabilities.torch)&&control.capabilities.torch.includes(true));
   const settings=track.getSettings() as MediaTrackSettings&{zoom?:number};setZoom(settings.zoom||1);setZoomMax(control.capabilities.zoom?.max||1);
   element.srcObject=stream;await element.play();if(closed){cleanup();return}
   const decoder=await reader();if(closed){cleanup();return}
   setDetails({label:track.label,resolution:settings.width+' × '+settings.height,focus:reportedFocus(track),engine:decoder.engine});setReady(true);setError('');
   const canvas=document.createElement('canvas');
   stopReading=startReadLoop(async()=>{
    if(element.readyState<2||!element.videoWidth||!box.current)return null;
    const vw=element.videoWidth,vh=element.videoHeight,rect=box.current.getBoundingClientRect();
    // Decode true camera pixels, not a screenshot of a stretched preview.
    const area=visibleRegion(vw,vh,rect.width,rect.height);
    const scale=Math.min(1,1600/area.width);canvas.width=Math.max(1,Math.round(area.width*scale));canvas.height=Math.max(1,Math.round(area.height*scale));
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return null;
    context.drawImage(element,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height);
    const isbn=await decoder.read(canvas);if(!closed)setDetails(previous=>previous.engine===decoder.engine?previous:{...previous,engine:decoder.engine});return isbn;
   },isbn=>{if(closed||decoded)return;decoded=true;setDetected(true);setReady(false);cleanup();callbacks.current.onCode(isbn)}, {visible:()=>!closed&&!document.hidden});
  }catch(e){if(closed||decoded)return;cleanup();setReady(false);const name=e instanceof Error?e.name:'';setError(name==='NotAllowedError'?'Autorisez la caméra dans Chrome pour scanner.':name==='NotFoundError'?'Cette caméra n’est pas disponible. Choisissez un autre objectif ou utilisez une photo.':'La caméra ne peut pas démarrer. Réessayez ou utilisez l’appareil photo du téléphone.')}})();
  return()=>{closed=true;document.removeEventListener('visibilitychange',visibility);cleanup()};
 },[device]);
 async function change(action:()=>Promise<boolean>,done:()=>void){if(toolsBusy)return;setToolsBusy(true);try{if(await action())done()}finally{setToolsBusy(false)}}
 return <><div ref={box} className={'camera-frame '+(ready?'running':'')}><video ref={video} autoPlay playsInline muted aria-label="Caméra arrière pour scanner un manga" onClick={e=>{if(!ready||!camera.current||!video.current||!box.current)return;const r=box.current.getBoundingClientRect();void camera.current.focusAt(focusPoint(video.current.videoWidth,video.current.videoHeight,r.width,r.height,e.clientX-r.left,e.clientY-r.top))}}/><div className="barcode-target"><i/><i/><i/><i/></div><span className="camera-hint">{detected?'Code reconnu · recherche du manga…':ready?'Placez le code entier dans le cadre':error?'Caméra indisponible':'Ouverture de la caméra arrière…'}</span>{error&&!ready&&<div className="camera-retry"><ScanLine size={42}/><button className="primary" onClick={onRestart}><RefreshCw size={18}/>Réessayer</button></div>}</div>
 <p className="scan-distance">Gardez environ 20 à 30 cm de distance. Rapprochez doucement jusqu’à ce que le code soit net.</p>
 <div className="scanner-tools">{detected&&<button className="secondary" onClick={onRestart}><ScanLine size={17}/>Scanner à nouveau</button>}{torchAvailable&&<button className="secondary" disabled={!ready||toolsBusy} aria-pressed={torch} onClick={()=>void change(()=>camera.current?.torch(!torch)||Promise.resolve(false),()=>setTorch(!torch))}><Flashlight size={17}/>{torch?'Éteindre':'Lumière'}</button>}{zoomMax>=2&&<div className="scanner-zoom" aria-label="Zoom caméra">{[1,2].map(value=><button key={value} disabled={!ready||toolsBusy} aria-pressed={Math.abs(zoom-value)<.1} onClick={()=>void change(()=>camera.current?.zoom(value)||Promise.resolve(false),()=>setZoom(value))}>{value}×</button>)}</div>}</div>
 <details className="scanner-help"><summary>Image floue ? Vérifier la caméra</summary><p>Reculez légèrement et utilisez le zoom 2× s’il est disponible. Évitez les reflets sur la couverture.</p>{devices.length>1&&<label className="camera-choice">Objectif<select aria-label="Choisir l’objectif du scanner" value={activeID||device} onChange={e=>onDevice(e.target.value)}>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||'Caméra '+(i+1)}</option>)}</select></label>}<button className="text-button" onClick={onRestart}><RefreshCw size={16}/>Relancer la caméra</button>{details.label&&<small>Objectif : {details.label}<br/>Image : {details.resolution}<br/>Focus signalé : {details.focus}<br/>Lecteur : {details.engine}</small>}</details>{error&&<p role="alert" className="error">{error}</p>}</>
}
