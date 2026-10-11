// dsh-spic-brand —— 宿主（Node 侧）半身。
//
// 本插件全部行为都在浏览器半侧（lib/client.js）完成：占 sidebar.brand.mark、
// sidebar.brand.name、conversation.hero.brand.mark 三个 slot，外加 favicon 与窗口标题。
// 宿主侧因此只需要一个空 apply —— 但仍然要有，因为 cordis.patch.yml 的 insert
// 绑定的是裸包名这一行，客户端半身靠它携带（子路径行不会携带半身）。
export const inject = []

export function apply() {}
