// dsh-spic-brand —— 浏览器半侧（手写 lazy-CJS，零构建）。
//
// 契约（不可改）：factory 的返回值会被 cordis 直接当作插件 apply 使用，
// 必须是函数或带 apply 方法的对象。返回裸 {} 会让整个 GUI 启动失败：
//   invalid plugin, expect function or object with an "apply" method, received object
//
// 为什么是 lazy-CJS 而不是 ESM：dsh-client-modules 只在「首次 import/require」
// 时物化 factory（factory(require) → exports，结果在 loadCache 里 memo）。所以
// 所有副作用（样式注入等）都必须写在 factory 闭包内。
//
// 素材是内联 data-URI：浏览器半侧读不到文件系统。由 scripts/build-client.mjs
// 从 assets/*.png 注入三个占位符，改素材后重跑即可。
window.__ModuleLoader__.load({
  id: 'dsh-spic-brand',
  factory: require => {
    const module = { exports: {} }
    const exports = module.exports

    const React = require('react')
    const h = React.createElement

    // ── 资产 ──────────────────────────────────────────────────────────────
    // mark：丝带图形标 83x104 透明 PNG，保留国家电投红/绿/橙原色。
    // cn / spic：「国家电投」「SPIC」的墨迹蒙版（白底 → 白色 RGB + 墨迹 alpha），
    //            交给 CSS mask 着色，浅色/深色主题自动跟随 --dsw-alias-label-primary。
    const MARK_URI = '__SPIC_MARK_URI__'
    const CN_URI = '__SPIC_CN_URI__'
    const SPIC_URI = '__SPIC_SPIC_URI__'

    // 图形标本体比例（83 / 104）。槽位给的 size 是「请求的方形边长」，
    // 本插件是竖版徽记，因此把 size 当高度用，宽度按比例收缩，避免撑破 24px 品牌行。
    const MARK_RATIO = 83 / 104

    const CSS = `
.dsh-spic-mark{display:block;flex:none;object-fit:contain;user-select:none;-webkit-user-drag:none}
.dsh-spic-name{
  --spic-cn:url("${CN_URI}");
  --spic-spic:url("${SPIC_URI}");
  display:inline-flex;align-items:center;gap:6px;min-width:0
}
.dsh-spic-cn{
  display:block;flex:none;height:18px;width:calc(18px * 176 / 39);
  background-color:currentColor;
  -webkit-mask-image:var(--spic-cn);-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat;
  mask-image:var(--spic-cn);mask-size:contain;mask-position:center;mask-repeat:no-repeat
}
.dsh-spic-badge{
  display:inline-flex;align-items:center;justify-content:center;flex:none;
  height:12px;padding:0 4px;border-radius:3px;
  background:var(--dsw-alias-label-primary)
}
.dsh-spic-badge-mark{
  display:block;height:7px;width:calc(7px * 131 / 35);
  background-color:var(--dsw-alias-label-primary-inverted);
  -webkit-mask-image:var(--spic-spic);-webkit-mask-size:contain;-webkit-mask-position:center;-webkit-mask-repeat:no-repeat;
  mask-image:var(--spic-spic);mask-size:contain;mask-position:center;mask-repeat:no-repeat
}
`

    // ── 品牌组件 ──────────────────────────────────────────────────────────
    /** 图形标。占 sidebar.brand.mark（宽/窄侧栏共用）与 conversation.hero.brand.mark。 */
    function SpicMark(props) {
      const asked = Number(props && props.size)
      const size = Number.isFinite(asked) && asked > 0 ? asked : 24
      const className = props && props.className ? 'dsh-spic-mark ' + props.className : 'dsh-spic-mark'
      return h('img', {
        src: MARK_URI,
        alt: '国家电投',
        draggable: false,
        className,
        style: { height: size + 'px', width: Math.round(size * MARK_RATIO * 100) / 100 + 'px' },
      })
    }

    /** 字标。占 sidebar.brand.name —— 原内容是这个槽的回退版本徽标，整体被替换。 */
    function SpicBrandName() {
      return h('span', { className: 'dsh-spic-name' }, [
        h('span', { key: 'cn', className: 'dsh-spic-cn', role: 'img', 'aria-label': '国家电投' }),
        h('span', { key: 'badge', className: 'dsh-spic-badge' },
          h('span', { className: 'dsh-spic-badge-mark', role: 'img', 'aria-label': 'SPIC' })),
      ])
    }

    // ── 浏览器标签：favicon 与窗口标题 ────────────────────────────────────
    // 这两项不在 slot 体系内（官方 brand 包 README 亦确认「浏览器标题是构建环境的事」），
    // 所以只能在本插件自己的 effect 里直接改，并在卸载时还原。
    function installFavicon() {
      const head = document.head
      if (head === null) return () => {}
      const links = Array.from(head.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'))
      const saved = links.map(el => ({
        el,
        href: el.getAttribute('href'),
        type: el.getAttribute('type'),
        media: el.getAttribute('media'),
      }))
      const made = []
      for (const item of saved) {
        item.el.setAttribute('href', MARK_URI)
        item.el.setAttribute('type', 'image/png')
        item.el.removeAttribute('media')
      }
      if (saved.length === 0) {
        const el = document.createElement('link')
        el.setAttribute('rel', 'icon')
        el.setAttribute('type', 'image/png')
        el.setAttribute('href', MARK_URI)
        head.appendChild(el)
        made.push(el)
      }
      return () => {
        for (const item of saved) {
          if (item.href === null) item.el.removeAttribute('href'); else item.el.setAttribute('href', item.href)
          if (item.type === null) item.el.removeAttribute('type'); else item.el.setAttribute('type', item.type)
          if (item.media === null) item.el.removeAttribute('media'); else item.el.setAttribute('media', item.media)
        }
        for (const el of made) el.remove()
      }
    }

    /** 把标题里的产品名换成「国家电投」（ui-layout 的 DocumentTitle 会反复重写它）。 */
    function installTitle() {
      const titleEl = document.querySelector('title')
      if (titleEl === null) return () => {}
      const atLoad = document.title
      const sep = ' — '
      const cut = atLoad.lastIndexOf(sep)
      let product = cut >= 0 ? atLoad.slice(cut + sep.length) : atLoad
      if (product === '' || !/deepseek/i.test(product)) product = 'DeepSeek Harness'
      const pattern = new RegExp(product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const rewrite = () => {
        const now = document.title
        const next = now.replace(pattern, '国家电投')
        if (next !== now) document.title = next
      }
      rewrite()
      const observer = new MutationObserver(rewrite)
      observer.observe(document.head, { subtree: true, childList: true, characterData: true })
      return () => observer.disconnect()
    }

    // ── 会话首屏标语：探索未至之境 → 风光无限国家电投 ──────────────────────
    // 这句标语不是 slot，而是 conversation locale 命名空间里的 hero.headline 条目
    // （@deepseek-ai/dsh-client-ui-conversation 的 zh 字典："hero.headline": "探索未至之境"）。
    // locale 服务对同一 ns/locale 二次注册会抛
    //   locale namespace "conversation" already has locale "zh"
    // 且注册表没有 override/priority 机制，所以这里只能在 DOM 层按文本精确替换。
    //
    // 作用域收得很紧：只认 hero 头部那个纯文本 span —— 父元素 class 含 "titleGroup"
    // （CSS Module 的 <hash>_titleGroup，本地名后缀稳定），且自身没有元素子节点。
    // 这样聊天记录/工作区名里出现的同样字样不会被误改。
    const HERO_HEADLINES = {
      '探索未至之境': '风光无限，国家电投',
      '风光无限国家电投': '风光无限，国家电投',
      'Into the Unknown': '风光无限，国家电投',
    }

    function rewriteHeroHeadline() {
      const groups = document.querySelectorAll('[class*="titleGroup"]')
      for (const group of groups) {
        for (const node of Array.from(group.children)) {
          if (node.children.length > 0) continue
          const text = node.textContent
          if (text === null) continue
          const next = HERO_HEADLINES[text.trim()]
          if (next === undefined || text === next) continue
          node.textContent = next
        }
      }
    }

    /** React 每轮重渲染都会把标语写回原文，所以整段是「先改一次 + 持续纠正」。 */
    function installHeroHeadline() {
      rewriteHeroHeadline()
      const observer = new MutationObserver(rewriteHeroHeadline)
      observer.observe(document.body, { subtree: true, childList: true, characterData: true })
      return () => observer.disconnect()
    }

    // ── 插件本体 ──────────────────────────────────────────────────────────
    const inject = ['slots']

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style')
        style.setAttribute('data-plugin', 'dsh-spic-brand')
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-spic-brand: styles')

      // priority: -1 —— single 槽「lowest renders」，同 priority 注册会抛
      //   single slot "..." already has a registration ... register at a different
      //   priority to shadow it (lowest renders)
      // 官方 @deepseek-ai/dsh-client-ui-brand-official 占 sidebar 两个槽（priority 0），
      // 用 -1 遮蔽它；hero 槽官方特意不注册，-1 同样是「只比自己低的让位」的稳妥选择。
      ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(
        { name: 'sidebar.brand.mark', priority: -1 }, SpicMark))
      ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register(
        { name: 'sidebar.brand.name', priority: -1 }, SpicBrandName))
      ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register(
        { name: 'conversation.hero.brand.mark', priority: -1 }, SpicMark))

      ctx.effect(() => {
        try { return installFavicon() } catch (error) { console.error('dsh-spic-brand: favicon', error); return () => {} }
      }, 'dsh-spic-brand: favicon')
      ctx.effect(() => {
        try { return installTitle() } catch (error) { console.error('dsh-spic-brand: title', error); return () => {} }
      }, 'dsh-spic-brand: title')
      ctx.effect(() => {
        try { return installHeroHeadline() } catch (error) { console.error('dsh-spic-brand: hero headline', error); return () => {} }
      }, 'dsh-spic-brand: hero-headline')
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = 'spic-brand'
    return module.exports
  },
})
