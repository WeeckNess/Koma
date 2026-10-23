import {cameraCapabilities} from './camera-focus';
export function rearCameraScore(label:string){
 const name=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/front|avant|facetime|selfie|user/.test(name))return -100;
 let score=/back|rear|arriere|environment|world/.test(name)?30:0;
 if(/main|principal|standard|wide angle|grand angle/.test(name))score+=20;
 if(/ultra|0[.,]5|macro|depth/.test(name))score-=90;
 if(/telephoto|teleobjectif|telelens/.test(name))score-=70;
 return score;
}
export function preferredRear(devices:Pick<MediaDeviceInfo,'deviceId'|'label'>[],currentID:string){
 const current=devices.find(d=>d.deviceId===currentID),best=[...devices].sort((a,b)=>rearCameraScore(b.label)-rearCameraScore(a.label))[0];
 if(!best||best.deviceId===currentID||rearCameraScore(best.label)<30)return null;
 return rearCameraScore(best.label)>(current?rearCameraScore(current.label):0)?best.deviceId:null;
}
export function stopCamera(stream:MediaStream|null){stream?.getTracks().forEach(track=>track.stop())}
export async function openMobileCamera(media:Pick<MediaDevices,'getUserMedia'|'enumerateDevices'>,requested:string,isClosed:()=>boolean){
 let stream:MediaStream|null=null;
 const open=async(id:string)=>{
  const value=await media.getUserMedia({audio:false,video:{...(id?{deviceId:{exact:id}}:{facingMode:{ideal:'environment'}}),width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:24,max:30}}});
  if(isClosed()){stopCamera(value);throw Error('Camera session closed')}return value;
 };
 try{
  stream=await open(requested);
  const devices=await media.enumerateDevices().then(list=>list.filter(d=>d.kind==='videoinput'&&!!d.deviceId)).catch(()=>[]);
  if(isClosed())throw Error('Camera session closed');
  if(!requested){
   const track=stream.getVideoTracks()[0],id=track?.getSettings().deviceId||'';
   const candidate=preferredRear(devices,id);
   if(candidate){stopCamera(stream);stream=null;try{stream=await open(candidate)}catch(error){if(isClosed())throw error;stream=await open('')}}
   // An explicit "none" means no autofocus on this lens. Unknown capabilities
   // do not mean a fixed-focus camera. Probe at most two clearly rear alternatives.
   const modes=cameraCapabilities(stream.getVideoTracks()[0]).focusMode;
   if(modes?.includes('none')&&!modes.includes('continuous')){
    const currentID=stream.getVideoTracks()[0].getSettings().deviceId;
    for(const option of devices.filter(d=>d.deviceId!==currentID&&rearCameraScore(d.label)>=30).sort((a,b)=>rearCameraScore(b.label)-rearCameraScore(a.label)).slice(0,2)){
     stopCamera(stream);stream=null;try{stream=await open(option.deviceId)}catch(error){if(isClosed())throw error;continue}
     if(cameraCapabilities(stream.getVideoTracks()[0]).focusMode?.includes('continuous'))break;
    }
    if(!stream)stream=await open('');
   }
  }
  if(isClosed())throw Error('Camera session closed');
  return {stream,devices};
 }catch(error){stopCamera(stream);throw error}
}
// Map the on-screen viewfinder to the true camera pixels (object-fit: cover).
export function visibleRegion(vw:number,vh:number,boxW:number,boxH:number){
 const scale=Math.max(boxW/vw,boxH/vh),visibleW=boxW/scale,visibleH=boxH/scale;
 const width=visibleW*.88,height=visibleH*.32;
 return {x:(vw-width)/2,y:(vh-height)/2,width,height};
}
export function focusPoint(vw:number,vh:number,boxW:number,boxH:number,x:number,y:number){
 const scale=Math.max(boxW/vw,boxH/vh);
 return {x:Math.max(0,Math.min(1,((vw-boxW/scale)/2+x/scale)/vw)),y:Math.max(0,Math.min(1,((vh-boxH/scale)/2+y/scale)/vh))};
}
