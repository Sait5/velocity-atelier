import {writeFile} from 'node:fs/promises'
const slugs=['nightfall','tears-in-rain','hiraeth','convergence','catalyst','discovery','titan']
await Promise.all(slugs.map(async slug=>{
 const source=`https://www.scottbuckley.com.au/library/${slug}/`
 const page=await fetch(source);if(!page.ok)throw Error(`${slug}: ${page.status}`)
 const html=await page.text()
 if(!html.includes('creativecommons.org/licenses/by/4.0'))throw Error(`Missing license: ${slug}`)
 const url=html.match(/href="([^"]+\.mp3[^"]*)"/)?.[1]?.replace(/^http:/,'https:')
 if(!url)throw Error(`Missing original MP3: ${slug}`)
 const response=await fetch(url);if(!response.ok)throw Error(`${slug}: ${response.status}`)
 const bytes=Buffer.from(await response.arrayBuffer())
 if(bytes.length<1000000||!response.headers.get('content-type')?.includes('audio'))throw Error(`Invalid audio: ${slug}`)
 await writeFile(new URL(`../public/audio/sb-${slug}.mp3`,import.meta.url),bytes)
 console.log(slug,bytes.length,url)
}))
