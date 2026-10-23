"""Refresh exact ISBN -> public publisher pages; no private endpoints or image crawl."""
import json, re, urllib.request
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]

def read(url):
    with urllib.request.urlopen(url,timeout=25) as response:
        return response.read().decode('utf-8')
def locations(url):
    return re.findall(r'<loc>(.*?)</loc>',read(url))
def isbn_url(url):
    match=re.search(r'(97[89]\d{10})/?$',url)
    if not match:return None
    value=match[1]
    if sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(value))%10:return None
    return value
sources={}
for key,host in [('pika','www.pika.fr'),('nobi','www.nobi-nobi.fr')]:
    urls=locations('https://'+host+'/products.xml')
    sources[key]={isbn_url(u):u.removeprefix('https://'+host) for u in urls if isbn_url(u)}
    print(key,len(sources[key]),flush=True)
# Keep the distributor's manga-relevant prefix ranges to avoid importing unrelated books.
manga_prefixes=('97828116','97910433','978237349','978238496','97823440','97827234')
sources['hachette']={}
for url in locations('https://www.hachette.fr/sitemap.xml'):
    if re.search(r'/products-\d+\.xml$',url):
        for u in locations(url):
            isbn=isbn_url(u)
            if isbn and isbn.startswith(manga_prefixes):sources['hachette'][isbn]=u.removeprefix('https://www.hachette.fr')
print('hachette',len(sources['hachette']),flush=True)
output=ROOT/'lib/data/extra-publisher-index.json'
output.write_text(json.dumps({'checkedAt':date.today().isoformat(),'sources':sources},ensure_ascii=False,separators=(',',':'))+'\n')
print('Written',output.stat().st_size,'bytes',flush=True)
