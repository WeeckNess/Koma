import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const modules=new Map();function load(path){path=resolve(path);if(modules.has(path))return modules.get(path);const module={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(p=>load(resolve(dirname(path),p+'.ts')),module,module.exports);modules.set(path,module.exports);return module.exports}
const {RELEASE_PUBLISHERS,releaseMonths,calendarURL,parseReleasePage,upcomingOnly,parisDay}=load('lib/release-feed.ts');
const today=parisDay(),books=[],failures=[];let pagesRead=0;
for(const p of RELEASE_PUBLISHERS)for(const month of releaseMonths(today)){
 let max=1;for(let page=1;page<=max;page++)try{const url=calendarURL(p,month,page),r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);const result=parseReleasePage(await r.text(),p,month,page,today);max=result.pages;books.push(...result.books);pagesRead++;console.log(p.id,month,page,result.books.length)}catch(error){failures.push({publisher:p.id,month,page,error:error.message});console.warn(p.id,month,page,error.message)}
}
if(!pagesRead)throw Error('No verified publisher planning; existing snapshot preserved.');
const file='lib/data/upcoming-releases.json',result={checkedAt:today,pagesRead,failures,books:upcomingOnly(books,today)};writeFileSync(file+'.tmp',JSON.stringify(result,null,2)+'\n');renameSync(file+'.tmp',file);console.log('Saved',result.books.length,'upcoming exact ISBN editions.');
