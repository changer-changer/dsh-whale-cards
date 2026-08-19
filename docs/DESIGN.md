# DSH 茶歇间 — 设计与接手指南

> 本文档面向接手的 AI/工程师：说明系统架构、关键决策、验证方法论，以及
> **当前未完成的工作清单**。项目代码索引已用 codebase-memory 建立
> （project: `home-cuizhixing-Projects-dsh-whale-cards`，526 节点 / 1326 边），
> 可用 `search_graph` / `trace_path` / `get_code_snippet` 查询。

## 1. 项目定位

「DSH 茶歇间」是一个安装到 DeepSeek Harness（DSH）Web 的本地游戏馆插件：
策展制小游戏 + 跨游戏陪伴角色「澜音」。等待编译/测试/长任务时打开玩一局，
随时收起，回来后从同一步继续。

仓库：`/home/cuizhixing/Projects/dsh-whale-cards`
remote：`https://github.com/changer-changer/dsh-whale-cards.git`（分支 `main`）

关键约束（用户明确要求）：
- 全自动完成，最后统一 `git commit + push`，不要中途问问题
- UI 必须人性化且好看（深夜港湾茶室统一主题，暗色 teal 调）
- 模型调用是唯一外部依赖；模型不可用时游戏照常可玩（降级本地台词）
- 无账号、无广告、无遥测、无联网对战

## 2. 架构总览

```
src/
├── client/            DSH Browser 入口：Shadow DOM 挂载/卸载、session 适配
│   ├── index.tsx        export inject = ['sessions', 'connection']；MountOptions
│   └── generated/art.ts 澜音头像（构建生成，勿手改）
├── teahouse/          茶歇间外壳
│   ├── TeahouseApp.tsx   大厅（策展卡）+ 游戏路由 + 澜音 dock 布局
│   ├── LanyinDock.tsx    聊天/记忆/模型 tab
│   ├── registry.ts       GAME_REGISTRY（新增游戏 = 一条注册 + PR）
│   ├── types.ts          GameModule / GameServices / GameManifest 契约，TEAHOUSE_CHANNEL
│   ├── rpc-client.ts     澜音聊天 RPC 客户端（走 Host 桥，client 无凭据）
│   ├── storage.ts        存档 v2：dsh-teahouse:save:<gameId>:v1 + v1 一次性迁移
│   ├── teahouse-styles.ts dth-* 全部样式（设计令牌集中于此，含窄屏媒体查询）
│   └── lanyin/           澜音：service（模型桥/降级）、memory（长期记忆）、persona（台词/表情）
├── games/             游戏模块（实现 GameModule 契约，lazy 加载）
│   ├── gin-rummy/      鲸牌茶歇（旗舰）：引擎在 src/game/，module 只做适配
│   ├── harbor-clash/   港湾对决（昆特式）：engine.ts 纯 TS + module.tsx
│   └── harbor-pairs/   海港记忆配对（模板游戏，新游戏作者从这里抄）
├── game/              Gin Rummy 引擎（纯 TS：牌/组合/计分/AI/持久化/模拟测试）
├── ui/                Gin Rummy 共享 UI（牌桌/控制器/台词/音效/任务提醒）
└── index.ts           host 侧：launcher 注册、Host 控件、game 路由
```

关键通道：`TEAHOUSE_CHANNEL = '/teahouse'`（host 与 client 的 RPC 桥）。
澜音模型对话：client 无凭据 → 经 channel 请求 host → host 调 DSH Host API。

## 3. GameModule 契约（新游戏必读）

`src/teahouse/types.ts` 定义，模板见 `src/games/harbor-pairs/module.tsx`：

```ts
interface GameManifest {
  id: string; title: string; tagline: string
  duration: string; intensity: 'light' | 'medium'
  why: string; glyph: string; accent: number   // accent = HSL hue
}
interface GameModule {
  manifest: GameManifest
  hasSave(): boolean        // slotExists(GAME_ID)
  clearSave(): void         // clearSlot(GAME_ID)
  View: ComponentType<GameViewProps>
}
interface GameViewProps { services: GameServices }
interface GameServices {
  lanyinRemark(event, text)        // 向澜音报对局时刻（新游戏请复用事件名）
  reportMatchResult({ won, draw }) // 计入大厅「茶歇统计」
  getPreference / setPreferences   // ginRummy 偏好 + stats
  taskNotice / dismissNotice       // 非阻塞任务提醒（不要暂停游戏）
}
```

添加新游戏的步骤（详见 `docs/game-author-guide.md`）：
1. `src/games/<id>/engine.ts`（纯 TS 逻辑，可注入 rng 便于测试）
2. `src/games/<id>/engine.test.ts`（引擎单测，必须覆盖规则/结算/存档往返）
3. `src/games/<id>/module.tsx`（View + GameModule；`useState(loadSlot)` + `useEffect(saveSlot)`）
4. `teahouse-styles.ts` 加 `dth-<id>-*` 样式（复用 `--dth-*` 令牌）
5. `registry.ts` 注册（lazy 加载）
6. README 更新（特性列表 + 规则摘要 + 可靠性测试条目）

## 4. 游戏设计要点

### 港湾对决（harbor-clash）— 最新游戏
昆特式三局两胜卡牌对决，全部原创（机制致敬 Gwent，无 CDPR 素材）：
- 双方 16 张港湾卡组抽 10 张手牌；先赢两小局者胜，最多 3 小局
- 每回合出 1 张或过牌；双方都过 → 小局结算，战力高者 +1 胜，平局双方不得分
- 先手交替：第 1/3 小局玩家先，第 2 小局澜音先
- 四种卡能力：`horn`（在场牌 +1）、`draw`（出牌抽 1）、`fog`（对方下一张 -2）、`unit`
- AI：贪心（effectivePower 评分），落后且手牌潜力不足时 pass
- 引擎在 `engine.ts`：`createMatch(rng?)` / `playCard` / `pass` / `nextRound` / `aiDecide`，
  全部不可变更新、JSON 可序列化（存档直接 round-trip）
- 关键陷阱（已修复并有回归测试）：horn 分支必须从 hand 移除打出的牌；
  双方共用卡组，跨方 id 重复是正常设计（断言要按方隔离）

### 鲸牌茶歇（gin-rummy）— 旗舰
引擎在 `src/game/`（bicycle 计分 profile，openSpielCompat 交叉验证），
module 只做存档适配 + UI。三手决胜、三档 AI 难度、敲牌/undercut 等完整规则。

### 海港记忆配对（harbor-pairs）— 模板
8 对翻牌配对，3 分钟一局。结构最简，新游戏作者以此为例。

## 5. 存储与隐私

- 游戏存档：`localStorage['dsh-teahouse:save:<gameId>:v1']`（JSON，游戏自持格式）
- Shell 状态：`dsh-teahouse:shell:v1`；澜音记忆：`dsh-teahouse:lanyin:memory:v1`
- v1 迁移：`dsh-teahouse:migrated:v1` 标记，旧 `dsh-whale-cards:save:v1` 一次性搬进 gin-rummy slot 后删除
- **已知陷阱**：`saveSlot(GAME_ID, null)` 会把字符串 `"null"` 写进 localStorage，
  `slotExists` 因此返回 true → 大厅误显示「有存档」。新游戏模块若用
  `useState(loadSlot())` + 无条件 `useEffect(saveSlot)`，首次打开就会触发。
  真实验收时如遇此现象，属脏存档，先 `localStorage.removeItem(...)` 再验。

## 6. 开发环境与验证流程

```
npm run typecheck   # tsc --noEmit
npm test            # vitest（当前 69 passed）
npm run build       # tsdown → lib/（host + client）
```

DSH 真实环境：
- dsh web 是 systemd 用户服务 `dsh-web.service`，`http://localhost:3080`
- 插件已 link 到 `~/.dsh/profiles/web/package.json`
- 改完代码 → `npm run build` → `systemctl --user restart dsh-web.service` → 浏览器刷新
- **重启后前 6 秒**会有 events.mux / host.describe 连接错误（client 自动重试），
  属服务重启抖动，非插件问题；等 3-5 秒刷新一次即可得到干净页面

浏览器验收（playwright MCP）要点：
- 快照在 `~/.playwright-mcp/page-*.yml`；`browser_find` 的 ref 跨快照过期，
  每次点击前要重新 find
- 茶歇间 UI 在 Shadow DOM 里，`document.querySelector` 查不到——
  要写递归遍历 shadowRoot 的 helper（验收脚本里已有现成模式）
- 无 browser_wait：用 `bash sleep`
- 控制台检查：`browser_console_messages(level=error)` 应 0 错误

## 7. 当前状态（截至本会话）

已完成：
- 港湾对决全部代码 + 引擎测试（69/69 全绿）+ README 更新
- 真实 DSH 冒烟已通过：大厅新卡、intro、完整对局（horn/draw/fog/AI/pass 全验证）、
  第 2 小局先手交替、刷新恢复（有存档徽标 + 状态还原）、比赛结束 UI、
  再来一局、键盘数字选牌+Enter 出牌
- horn 重复卡 bug 已修复（有回归测试）
- 浏览器 localStorage 已清理干净（无脏存档）

**未完成（接手 AI 的任务清单）**：
1. 窄屏验收：视口 390×844，打开港湾对决，验证手牌/战场/按钮布局可用
   （playwright MCP 视口工具名未确认，可能需 `browser_set_viewport` 或直接
   用 `browser_navigate` 前 CDP 设置；如果工具名不对，可查 MCP 工具列表）
2. 控制台 0 错误最终确认（`browser_console_messages(level=error)`）
3. `git add -A && git commit && git push origin main`
   （commit message 风格参考历史：简洁英文，如 "Add Harbor Clash: Gwent-style duel"）
4. 更新 todo 全部完成 + 向用户简洁汇报（15 条式验收清单 + 测试 + push 结果）

## 8. 已知注意事项

- 注释纪律：新增注释按「已有/BDD/必要/不必要」四档自审；公共 API 的 JSDoc 属于必要
- 不要重构 Gin Rummy 引擎；不要给游戏直接 DSH Host 权限；不做独立插件/市场/排行榜
- 存档格式一旦发布，改动必须走版本化兼容策略（README 有约束）
- 测试不断言私有实现细节，走公开函数（engine 导出的 API）
- `src/client/generated/` 是构建产物，勿手改
