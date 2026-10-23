export type CameraCapabilities=MediaTrackCapabilities&{focusMode?:string[];pointsOfInterest?:unknown;zoom?:{min:number;max:number;step?:number};torch?:boolean|boolean[]};
type CameraSettings=MediaTrackSettings&{focusMode?:string;zoom?:number;torch?:boolean};
type CameraConstraint=MediaTrackConstraintSet&{focusMode?:string;pointsOfInterest?:{x:number;y:number}[];zoom?:number;torch?:boolean};
export function cameraCapabilities(track:MediaStreamTrack):CameraCapabilities{try{return track.getCapabilities?.()||{}}catch{return {}}}
export function reportedFocus(track:MediaStreamTrack){try{return (track.getSettings() as CameraSettings).focusMode||'non exposé'}catch{return 'non exposé'}}
// Android's camera HAL owns continuous AF. Configure it once; there is no
// timer, no focus-mode oscillation and no stream restart when a user taps.
export async function configureCamera(track:MediaStreamTrack){
 const capabilities=cameraCapabilities(track);let closed=false;
 let tail:Promise<unknown>=Promise.resolve();
 const apply=(patch:CameraConstraint)=>{
  const request=tail.catch(()=>{}).then(async()=>{if(closed||track.readyState!=='live')return false;
   const base={...track.getConstraints()};
   const advanced=(base.advanced||[]).map(value=>{const clean={...value} as Record<string,unknown>;for(const key of Object.keys(patch))delete clean[key];return clean}).filter(value=>Object.keys(value).length);
   for(const key of Object.keys(patch))delete (base as Record<string,unknown>)[key];
   try{await track.applyConstraints({...base,advanced:[...advanced,patch]});return !closed&&track.readyState==='live'}catch{return false}
  });tail=request;return request;
 };
 if(capabilities.focusMode?.includes('continuous'))await apply({focusMode:'continuous'});
 return {
  capabilities,focus:reportedFocus(track),
  // Metering-point support is optional; never pretend an unsupported tap has focused.
  async focusAt(point:{x:number;y:number}){if(!capabilities.pointsOfInterest)return false;return apply({pointsOfInterest:[{x:Math.max(0,Math.min(1,point.x)),y:Math.max(0,Math.min(1,point.y))}]})},
  async zoom(value:number){const range=capabilities.zoom;if(!range||!Number.isFinite(value))return false;return apply({zoom:Math.max(range.min,Math.min(range.max,value))})},
  async torch(value:boolean){if(!(capabilities.torch===true||Array.isArray(capabilities.torch)&&capabilities.torch.includes(true)))return false;return apply({torch:value})},
  stop(){closed=true},
 };
}
