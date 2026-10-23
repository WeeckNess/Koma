import {requireChatGPTUser} from '../chatgpt-auth';
import Connect from './view';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{code?:string}>}) {const {code=''}=await searchParams;await requireChatGPTUser('/connect?code='+encodeURIComponent(code));return <Connect code={code}/>}
