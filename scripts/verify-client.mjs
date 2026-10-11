// 离线自检：不开浏览器，用最小 mock 跑一遍 lib/client.js 的 factory 与 apply。
//
// 目的：在把插件装进 profile 之前，先确认三件最容易把 GUI 搞崩的事——
//   1. factory 返回的是「函数或带 apply 方法的对象」（返回裸 {} 会让 DSH 起不来）；
//   2. 三个 slot 的 register 选项里 priority 是 -1（同 priority 注册会抛
//      single slot ... already has a registration ... lowest renders）；
//   3. 两个组件在给定 props 下能渲染出预期的 img/span 结构。
// 这里用的是假 React（createElement 返回 {type,props,children}），只验证形状，不验证视觉。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')

let captured = null
const styleTags = []
const headChildren = []

class FakeMutationObserver {
  constructor(cb) { this.cb = cb; FakeMutationObserver.instances.push(this) }
  observe() {}
  disconnect() { this.disconnected = true }
}
FakeMutationObserver.instances = []

const fakeDocument = {
  title: 'DeepSeek Harness',
  head: {
    appendChild(el) { headChildren.push(el); return el },
    querySelectorAll() { return [] },
  },
  querySelector(selector) { return selector === 'title' ? { tagName: 'TITLE' } : null },
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v },
      removeAttribute(k) { delete this.attributes[k] },
      getAttribute(k) { return k in this.attributes ? this.attributes[k] : null },
      appendChild(el) { (this.children ||= []).push(el); return el },
      remove() {},
    }
  },
}

// 假的 hero 头部：div.<hash>_titleGroup > [span 标语, span.<hash>_previewBadge]
// 两个都是纯文本 span，用来验证改写只命中标语、不碰「预览版」徽标。
const heroHeadline = { children: [], textContent: '探索未至之境' }
const heroPreviewBadge = { children: [], textContent: '预览版' }
const heroTitleGroup = { children: [heroHeadline, heroPreviewBadge] }
fakeDocument.body = { nodeName: 'BODY' }
fakeDocument.querySelectorAll = selector => (selector === '[class*="titleGroup"]' ? [heroTitleGroup] : [])

const sandbox = {
  window: {
    __ModuleLoader__: {
      load(entry) {
        captured = entry
      },
    },
  },
  document: fakeDocument,
  MutationObserver: FakeMutationObserver,
  console: { log() {}, error(...args) { errors.push(args) } },
}
const errors = []

// 用 vm 跑，避免污染本进程的全局
const vm = await import('node:vm')
const context = vm.createContext(sandbox)
new vm.Script(source, { filename: 'lib/client.js' }).runInContext(context)

const fail = message => { console.error('FAIL:', message); process.exitCode = 1 }
const ok = message => console.log('  ok —', message)

// ── 1. loader 契约 ────────────────────────────────────────────────────────
if (!captured) fail('window.__ModuleLoader__.load was never called')
else {
  if (captured.id !== 'dsh-spic-brand') fail(`loader id is ${captured.id}`)
  else ok('loader id = dsh-spic-brand')
}

// ── 2. factory 返回值 ─────────────────────────────────────────────────────
const fakeReact = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat(Infinity).filter(c => c !== null && c !== undefined) }
  },
}
const fakeRequire = spec => {
  if (spec === 'react') return fakeReact
  throw new Error(`unexpected require("${spec}") in the browser half`)
}
const exportsObject = captured.factory(fakeRequire)

if (typeof exportsObject.apply !== 'function' && (typeof exportsObject !== 'function' || typeof exportsObject.apply !== 'function')) {
  fail('factory did not return a function or an object with an "apply" method — this is exactly the shape that crashes DSH startup')
} else ok('factory returns an object with an "apply" method')
if (typeof exportsObject.apply !== 'function') fail('exports.apply is not a function')
else ok('exports.apply is a function')
if (Array.isArray(exportsObject.inject) && exportsObject.inject.includes('slots')) ok('exports.inject = ["slots"]')
else fail(`exports.inject is ${JSON.stringify(exportsObject.inject)}`)

// ── 3. apply 注册 ─────────────────────────────────────────────────────────
const effects = []
const injections = []
const registrations = []
const fakeCtx = {
  effect(fn, label) { const dispose = fn(); effects.push({ label, dispose }); return dispose },
  slots: {
    inject(name, callback) { injections.push(name); callback(); return () => {} },
    register(options, component) { registrations.push({ options, component }); return () => {} },
  },
}
exportsObject.apply(fakeCtx)

const expectedSlots = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark']
for (const name of expectedSlots) {
  const reg = registrations.find(r => r.options.name === name)
  if (!reg) { fail(`no registration for ${name}`); continue }
  if (reg.options.priority !== -1) fail(`${name} priority is ${reg.options.priority}, expected -1 (same-priority registration throws)`)
  else ok(`${name} registered at priority -1`)
  if (!injections.includes(name)) fail(`${name} was registered without ctx.slots.inject`)
}
if (registrations.length !== 3) fail(`expected 3 registrations, got ${registrations.length}`)

// ── 4. 组件渲染形状 ───────────────────────────────────────────────────────
const markReg = registrations.find(r => r.options.name === 'sidebar.brand.mark')
const markNode = markReg.component({ size: 24, className: 'hero-fish' })
if (markNode.type !== 'img') fail(`SpicMark renders <${markNode.type}>, expected <img>`)
else {
  if (!String(markNode.props.src).startsWith('data:image/png;base64,')) fail('SpicMark src is not an inlined data-URI')
  else ok(`SpicMark src is an inlined ${String(markNode.props.src).length}-char data-URI`)
  if (markNode.props.style.height !== '24px') fail(`SpicMark height is ${markNode.props.style.height}`)
  else ok(`SpicMark at size 24 -> height 24px / width ${markNode.props.style.width}`)
  if (!String(markNode.props.className).includes('hero-fish')) fail('SpicMark dropped the host className')
  else ok('SpicMark keeps the host className')
}
const markFallback = markReg.component({})
if (markFallback.props.style.height !== '24px') fail(`SpicMark without size fell back to ${markFallback.props.style.height}`)
else ok('SpicMark falls back to 24px when the host passes no size')

const nameReg = registrations.find(r => r.options.name === 'sidebar.brand.name')
const nameNode = nameReg.component({})
if (nameNode.type !== 'span') fail(`SpicBrandName renders <${nameNode.type}>, expected <span>`)
else ok(`SpicBrandName renders a span with ${nameNode.children.length} children`)

// ── 5. favicon / 标题的副作用与清理 ───────────────────────────────────────
const labels = effects.map(e => e.label)
if (!labels.some(l => l.includes('styles'))) fail('no styles effect registered')
else ok('styles effect registered')
if (!labels.some(l => l.includes('favicon'))) fail('no favicon effect registered')
else ok('favicon effect registered')
if (!labels.some(l => l.includes('title'))) fail('no title effect registered')
else ok('title effect registered')
if (!labels.some(l => l.includes('hero-headline'))) fail('no hero-headline effect registered')
else ok('hero-headline effect registered')
if (fakeDocument.title !== '国家电投') fail(`document.title is ${JSON.stringify(fakeDocument.title)}, expected 国家电投`)
else ok('document.title rewritten to 国家电投')

// ── 6. hero 标语改写 ──────────────────────────────────────────────────────
if (heroHeadline.textContent !== '风光无限，国家电投') fail(`hero headline is ${JSON.stringify(heroHeadline.textContent)}, expected 风光无限，国家电投`)
else ok('hero headline rewritten to 风光无限，国家电投')
if (heroPreviewBadge.textContent !== '预览版') fail(`preview badge was touched: ${JSON.stringify(heroPreviewBadge.textContent)}`)
else ok('preview badge left untouched (预览版)')

const observers = FakeMutationObserver.instances
if (observers.length !== 2) fail(`expected 2 MutationObservers (title + hero), got ${observers.length}`)
else ok('title and hero observers installed')
// 重渲染模拟：React 把标语写回原文后，observer 回调应当再改一次
heroHeadline.textContent = '探索未至之境'
for (const observer of observers) observer.cb()
if (heroHeadline.textContent !== '风光无限，国家电投') fail(`hero headline not corrected after re-render: ${JSON.stringify(heroHeadline.textContent)}`)
else ok('hero headline corrected after a simulated re-render')
if (errors.length) fail(`console.error called: ${errors.map(e => e[0]).join(' | ')}`)

console.log(process.exitCode === 1 ? '\nFAILED' : '\nall checks passed')
