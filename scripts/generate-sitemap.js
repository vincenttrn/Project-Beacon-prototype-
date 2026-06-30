import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const baseUrl = (process.env.VITE_SITE_URL || 'https://localhost').replace(/\/$/, '')

const routes = [
  { path: '/', priority: '1.0' },
  { path: '/workshops', priority: '0.9' },
  { path: '/workshops/alarm-bot', priority: '0.9' },
  { path: '/resources', priority: '0.8' },
  { path: '/enquire', priority: '0.8' },
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route.path === '/' ? '/' : route.path}</loc>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join('\n\n')}
</urlset>
`

const robots = `User-agent: facebookexternalhit
Allow: /

User-agent: Facebot
Allow: /

User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`

writeFileSync(join(publicDir, 'sitemap.xml'), sitemap)
writeFileSync(join(publicDir, 'robots.txt'), robots)

console.log(`Generated sitemap and robots.txt for ${baseUrl}`)
