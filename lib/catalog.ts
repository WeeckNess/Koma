import {env} from 'cloudflare:workers';
import {editionInfo} from './series';
import { Book, canonicalISBN, featured, upcomingSelection } from './books';
import verified from './data/verified-editions.json';
import { supplementalBooks,extraTitleISBNs } from './supplemental-catalog';
import { generalSearch } from './general-catalog';
import { publisherBook, titleISBNs } from './publisher-catalog';

const local: Book[] = [...verified, ...upcomingSelection, ...featured];
const cache = new Map<string, Book>();
const pending = new Map<string, Promise<Book[]>>();
function remember(books: Book[]) {
  for (const book of books) cache.set(book.isbn, book);
  return books;
}
async function lookup(isbn: string): Promise<Book[]> {
  try{const row:any=await env.DB!.prepare('SELECT data,expires FROM catalog_cache WHERE key=?').bind('edition:v1:'+isbn).first();if(row?.expires>Date.now()){const book=JSON.parse(row.data);if(canonicalISBN(book.isbn)===isbn)return remember([book])}}catch{/* Provider lookup remains usable without a persistent cache. */}
  const books=await resolveEdition(isbn);
  const normalized=books.map(book=>{const info=editionInfo(book);return {...book,seriesTitle:info.title,volume:info.volume??undefined,edition:info.edition}});
  if(normalized[0])try{await env.DB!.prepare('INSERT INTO catalog_cache (key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind('edition:v1:'+isbn,JSON.stringify(normalized[0]),Date.now()+7*86400000).run()}catch{}
  return normalized;
}
async function resolveEdition(isbn: string): Promise<Book[]> {
  const saved = cache.get(isbn) || local.find(book => book.isbn === isbn);
  if (saved) return [saved];
  let publisherFailed = false;
  try {
    const book = await publisherBook(isbn);
    if (book) return remember([book]);
  } catch { publisherFailed = true; }
  const extra=await supplementalBooks(isbn);
  const editions=(extra.length?extra:await generalSearch(isbn)).filter(book=>canonicalISBN(book.isbn)===isbn);
  const preferred=editions.find(book=>book.cover)||editions[0];
  const results=preferred?[{...preferred,author:preferred.author||editions.find(book=>book.author)?.author||'',publisher:preferred.publisher||editions.find(book=>book.publisher)?.publisher||''}]:[];
  if (!results.length && publisherFailed) throw new Error("La fiche de cet ISBN est indexée, mais sa source ne répond pas. Réessayez dans un instant.");
  return remember(results);
}
export async function searchBooks(input: string): Promise<Book[]> {
  const query = input.trim();
  if (!query) return [];
  const raw = query.replace(/[\s-]/g, '').toUpperCase();
  const isbn = canonicalISBN(raw);
  if (/^[\dX]{10,13}$/.test(raw) && !isbn)
    throw new Error('Cet ISBN est invalide. Vérifiez les chiffres.');
  if (isbn) {
    const existing = pending.get(isbn);
    if (existing) return existing;
    const request = lookup(isbn);
    pending.set(isbn, request);
    try { return await request; } finally { pending.delete(isbn); }
  }
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const words = normalize(query).trim().split(/\s+/);
  const known = local.filter(book => words.every(word => normalize(book.title + ' ' + book.author).split(/\s+/).some(token => token === word || (/^\d+$/.test(word) && Number(token) === Number(word)))));
  const results = await Promise.allSettled([
    generalSearch(query),
    ...[...new Set([...titleISBNs(query),...extraTitleISBNs(query)])].slice(0,6).filter(id => !known.some(book => book.isbn === id)).map(lookup),
  ]);
  const unique = new Map<string, Book>();
  for (const book of [...known, ...results.flatMap(result => result.status === 'fulfilled' ? result.value : [])]) {
    const id = canonicalISBN(book.isbn);
    if (id && !unique.has(id)) unique.set(id, { ...book, isbn: id });
  }
  if (!unique.size && results.every(result => result.status === 'rejected'))
    throw new Error('Les catalogues ne répondent pas. Vérifiez votre connexion puis réessayez.');
  return remember([...unique.values()]);
}
