import { Book, canonicalISBN } from './books';
import glenat from './data/glenat-index.json';

const index: Record<string, string> = glenat;
export function publisherURL(isbn: string) {
  const path = index[isbn];
  return path ? `https://www.glenat.com${path}` : null;
}
export function titleISBNs(query: string): string[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  return Object.entries(index).filter(([, path]) => {
    const title = normalize(path.replace(/-\d{13}\/$/, '').replace('/glenat-manga/', ''));
    return words.every(word => title.split(' ').some(token => token === word || (/^\d+$/.test(word) && Number(token) === Number(word))));
  }).slice(0, 6).map(([isbn]) => isbn);
}

// Only read public structured metadata, and require an exact edition identifier.
export function parsePublisherBook(html: string, isbn: string, sourceUrl: string, source='Glénat', defaultPublisher=source): Book | null {
  const allRecords:any[]=[];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const raw = JSON.parse(match[1]);
      const records = Array.isArray(raw) ? raw : raw['@graph'] || [raw];
      allRecords.push(...records);
    } catch { /* Ignore malformed structured data. */ }
  }
  for(const book of allRecords) {
    try {
        if (!['Book','Product'].includes(book['@type'])) continue;
        const url = book.url || book.offers?.url || '';
        const identifier = canonicalISBN(book.isbn || url.match(/(97[89]\d{10})\/?(?:\?.*)?$/)?.[1] || '');
        if (identifier !== isbn || !book.name) continue;
        const authors = Array.isArray(book.author) ? book.author : [book.author];
        const image = (typeof book.image === 'string' ? book.image : book.image?.url) || html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g,'&') || '';
        const breadcrumbs=allRecords.filter((record:any)=>record['@type']==='BreadcrumbList').flatMap((record:any)=>record.itemListElement||[]);
        const authorNames=authors.filter(Boolean).map((author: { name?: string }) => author.name || '').filter(Boolean);
        const publisher=book.publisher?.name||breadcrumbs.find((item:any)=>String(item.item||'').includes('/editeurs/'))?.name||({PIKA:'Pika',GLENAT:'Glénat',NOBINOBI:'nobi nobi !'} as Record<string,string>)[image.match(/imgArticle\/([^/]+)/)?.[1]||'']||defaultPublisher;
        return {
          isbn, title: book.name,
          author: [...new Set(authorNames)].join(', ')||breadcrumbs.filter((item:any)=>String(item.item||'').includes('/auteurs/')).map((item:any)=>item.name).join(', '),
          cover: image.startsWith('https://')&&!/placeholders?|indisponible|no[-_]?cover/i.test(image) ? image : '',
          description: '', publisher, language: 'fr',
          date: book.datePublished || '', source: source+' · fiche éditeur',
          sourceUrl, checkedAt: new Date().toISOString().slice(0, 10),
        };
    } catch { /* Never guess an edition from malformed records. */ }
  }
  return null;
}
export async function publisherBook(isbn: string): Promise<Book | null> {
  const url = publisherURL(isbn);
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('La fiche éditeur ne répond pas.');
    const result = parsePublisherBook(await response.text(), isbn, url);
    if (!result) throw new Error('La fiche éditeur a changé de format.');
    return result;
  } finally { clearTimeout(timeout); }
}
