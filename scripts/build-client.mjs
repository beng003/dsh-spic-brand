// 把 assets/*.png 内联成 data-URI，注入 src/client.template.js，产出 lib/client.js。
//
// 纯客户端插件（dsh.client.platform = "web"）在浏览器里跑，读不到文件系统，
// 因此素材必须内联。改素材或改模板后重跑：  node scripts/build-client.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const uri = name =>
  'data:image/png;base64,' + readFileSync(join(ROOT, 'assets', name)).toString('base64')

const replacements = {
  __SPIC_MARK_URI__: uri('mark.png'),
  __SPIC_CN_URI__: uri('cn.png'),
  __SPIC_SPIC_URI__: uri('spic.png'),
}

let out = readFileSync(join(ROOT, 'src', 'client.template.js'), 'utf8')
for (const [token, value] of Object.entries(replacements)) {
  if (!out.includes(token)) throw new Error(`template is missing placeholder ${token}`)
  out = out.split(token).join(value)
}

mkdirSync(join(ROOT, 'lib'), { recursive: true })
writeFileSync(join(ROOT, 'lib', 'client.js'), out)

console.log('lib/client.js written:', Buffer.byteLength(out), 'bytes')
for (const [token, value] of Object.entries(replacements)) {
  console.log(' ', token, '->', value.length, 'chars')
}
