import type { Metadata } from 'next';import './globals.css';
export const metadata:Metadata={title:'Koma — votre mangathèque',description:'Vos mangas, vos envies, votre univers. Scannez et retrouvez votre collection partout.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Koma',statusBarStyle:'default'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
