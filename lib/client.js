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
    const MARK_URI = 'data:image/png;base64,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'
    const CN_URI = 'data:image/png;base64,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'
    const SPIC_URI = 'data:image/png;base64,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'

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
