# DSH 茶歇间

「DSH 茶歇间」是一个可安装到 DeepSeek Harness（DSH）Web 的本地游戏馆
插件：几个策展级小游戏 + 一个共享的原创陪伴角色「澜音」。等待编译、
测试或长任务时，随时打开来一局；随时收起，回来后从同一步继续。

![原创成年鲸鱼牌友澜音与港湾牌桌](assets/lanyin-harbor.jpg)

- **策展游戏馆**：大厅里的小游戏统一主题（深夜港湾茶室），存档按游戏
  隔离，打开即续。
  - **鲸牌茶歇**：经典双人 Gin Rummy，三手决胜，完整敲牌、Gin、undercut 与 layoff。
  - **港湾对决**：三航线阵型对决，用同色、连号和同点组合争夺两座航标。
  - **潮汐拾光**：三轮 push-your-luck 收藏对决，在连携加分与重复险象之间取舍。
- **双模式**：经典模式全部使用本地规则与确定性 AI，不消耗 Token；Agent
  模式由每局独立的真实 DSH Agent Session 扮演澜音并作出合法决策。
- **澜音**：跨游戏陪伴角色。真实模型聊天、可查看的 Soul、浏览器持久化
  长期记忆、随局势变化的台词与表情；凭据始终留在 DSH Host。
- **不打扰**：DSH 任务完成或需要确认时只显示一次非阻塞提醒，绝不暂停
  游戏、不抢焦点。
- **无账号、无广告、无联网对战、无遥测**；模型调用是唯一的外部依赖，
  且模型不可用时游戏照常可玩（降级为本地台词）。

## 要求

- DeepSeek Harness `0.1.0-rc.7` 兼容版本
- Node.js `^22.19.0` 或 `>=24.0.0`
- 可用的 `dsh` 和 pnpm；`dsh plugin` 会在 profile 内调用 pnpm

DSH 仍处于 developer preview。插件发布前应在目标 DSH 版本上重新运行构建、
测试和真实 Web 冒烟测试。

## 安装

### 从本地仓库安装

```sh
git clone <this-repository-url>
cd <this-repository>/dsh-whale-cards
npm ci
npm run build

dsh plugin --profile web add .
dsh --profile web --dump-config
dsh web
```

`--dump-config` 的输出应包含 id 为 `whale-cards`、包名为 `dsh-whale-cards`
的一行。已经运行的 DSH Web 需要重启一次才能载入新包。

### 从预构建 tarball 安装

可以直接从 [GitHub Releases](https://github.com/changer-changer/dsh-whale-cards/releases)
下载已验证的 `dsh-whale-cards-0.1.1.tgz`，也可以自行构建：

发布者先执行：

```sh
cd dsh-whale-cards
npm ci
npm test
npm run build
npm pack
```

用户安装生成的 tarball：

```sh
dsh plugin --profile web add ./dsh-whale-cards-0.1.1.tgz
dsh --profile web --dump-config
dsh web
```

预构建 tarball 不需要授权安装时运行第三方构建脚本，也是当前最适合内测和
离线分发的形式。本 README 不假定该包已经发布到 npm registry。

### 从 Git commit 安装

只安装审阅过并锁定的 commit：

```sh
dsh plugin --profile web add github:<owner>/<repository>#<commit-sha>
```

Git 安装获得的是源码，包内 `prepare` 会在安装时执行构建。pnpm 10+ 默认
可能阻止该脚本；请先审阅源码，再把 pnpm 错误信息给出的**确切包键**加入
该 Web profile 的 `pnpm-workspace.yaml` `allowBuilds`，然后重试。不要安装
会随分支更新的未固定引用。

### 卸载

```sh
dsh plugin --profile web remove dsh-whale-cards
```

重启 DSH Web 后插件 UI 即被移除。为避免卸载操作擅自删除用户数据，浏览器
本地存档会保留；清理方式见「隐私与本地数据」。

## 使用

1. 打开 `dsh web`。点击浮动入口展开游戏馆；点击入口右侧「直达」可直接
   进入你配置的默认游戏。
2. 在大厅选择游戏：没有存档时开始新对局；有未完成对局时游戏卡显示
   「有存档」徽标，打开即可继续。
3. 大厅可选择「经典模式」或「Agent 模式」，并设置「直达」按钮默认打开
   的游戏。Agent 模式会使用所选模型并消耗 Token。
4. Agent 对局中可以直接点「教我这一步」「认真点」「放我一马」，也可以
   自由聊天；这些话会进入当前牌局的同一个 Session，并影响澜音接下来的
   表达与策略倾向，但不能绕过本地规则。
5. 澜音会记住你明确让她记住的事（记忆 tab 可查看、编辑、删除）；Soul
   tab 能查看她的人格、当前牌局 Session 和上下文策略。
6. 任何时候都可以收起。牌局被冻结并保存，刷新页面、切换 DSH 会话或
   稍后重新打开都可恢复。

### 鲸牌茶歇 · 规则摘要

本游戏使用标准 52 张扑克的经典 Gin Rummy 核心规则，并把一场比赛固定为
三手：

- 双方每手各拿 10 张；每回合先摸一张，再弃一张。
- 三张或四张同点数牌组成一组 `set`。
- 三张以上同花连续牌组成一顺 `run`。A 只作低牌，可组成 A-2-3，不能组成
  Q-K-A。
- 未进入任何组合的牌是“散牌”。A 计 1 点，2–10 按牌面计分，J/Q/K 各计
  10 点。
- 弃牌后散牌总分不超过 10 可敲牌；散牌为 0 是 Gin。
- 普通敲牌后，对手可把适合的散牌接到敲牌者的组合上。敲牌者散牌更少时，
  获得双方最终散牌差值。
- 对手散牌等于或少于敲牌者时发生 undercut：对手获得 10 分奖励再加差值。
- Gin 不允许对手接牌：Gin 方获得 20 分奖励再加对手散牌分。
- 牌墙到达且无人合法结束时，本手平局、双方 0 分。

刚从弃牌区拿起的明牌，本回合不能原样弃回。牌堆只剩两张时不能再摸暗牌：
如果拿明牌后能立即合法敲牌，可以这样结束；否则选择结束本手。

代码中另有 `openSpielCompat` 计分 profile，用于与公开规则引擎交叉验证；
玩家默认对局使用上述 `bicycle` profile。规则与验证来源见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 潮汐拾光

三轮 push-your-luck 收藏对决：

- 每次行动选择继续潜航或收帆；收帆会保存本轮得分。
- 宝物分为月珠、赤珊、灯火、星图四类；同类越多，连携加分越高，集齐
  四类另有奖励。
- 风暴、暗礁、回流是三种险象。同一种险象在本轮第二次出现会立即翻船，
  本轮得分清零。
- 玩家与澜音依次完成本轮潜航，三轮总分更高者获胜。

### 港湾对决 · 规则摘要

原创的三航线阵型对决：

- 双方轮流把一张手牌部署到北灯塔、主航道或南灯塔；每条航线每方最多三张。
- 双方在同一航线都完成三张后立刻比较阵型。强度从高到低为：同色连号、
  同点三张、同色三张、连号三张、普通合力；同级先比点数总和，再比高牌。
- 率先控制两条航线的一方获胜。对方已经部署的牌是公开信息；仍在手中的牌
  始终不可见。
- 经典模式使用本地阵型评估器选择牌与航线；Agent 模式把自己的手牌、公开
  牌面和全部合法部署交给澜音 Agent 决策。

## 公平性

- 发牌使用浏览器随机种子；每场 seed 和完整牌序随存档固定，难度不会改牌。
- 任何对手的决策视图都只包含自己的手牌、牌堆数量和双方已经公开的动作，
  不把玩家隐藏手牌发送给本地 AI 或模型。
- Agent 只能从本轮引擎生成的合法动作 ID 中选择；最终出牌、摸牌、弃牌、
  计分和胜负全部由浏览器本地规则引擎校验和执行。
- Agent 调用失败或模型暂时不可用时，会自动回退到经典模式的本地决策，
  不会卡住或破坏存档。

## 隐私与本地数据

经典模式不调用模型，也不消耗 Token：

- 不发送遥测、不加载 CDN、不包含广告 SDK。
- 只在内存中观察开局时当前 session 的 `running` 与 `pendingInteraction`
  状态，用于完成/待处理提醒。
- 港湾美术随 client bundle 以内嵌 data URL 提供，音效在本地合成。
- 不创建账号、cookie、云存档或跨设备标识。

**聊天和 Agent 模式会调用 DSH 配置的模型**：请求经 DSH Host RPC 通道
`/teahouse` 转发；API 凭据只存在于 Host，客户端代码不接触凭据。每场
Agent 对局创建独立 Session，结束后释放实时句柄；上下文压缩沿用 Harness
自身策略，长期记忆只注入最近 12 条可见条目。

Agent 额外拥有两个只读工具：按短语搜索用户的 DSH 会话（最多 5 条），以及
查看所选会话最近 12 条可读文本。只有当用户在对话中问到其他任务或 Session
时模型才需要调用它们；工具不提供工作区文件写入、命令执行或任意全局工具。
这意味着 Agent 模式可能把被查到的会话片段发送给当前所选模型，请按该模型
服务的隐私条款使用。

浏览器 `localStorage` 的键为：

```text
dsh-teahouse:shell:v1        # 外壳偏好与统计
dsh-teahouse:<game-id>:v1    # 每个游戏的存档槽
dsh-teahouse:migrated:v1     # 旧版存档迁移标记
dsh-whale-cards:save:v1      # 旧版 v1 存档（首次运行自动迁移后删除）
```

数据留在 DSH Web 的同源浏览器存储中，其他同源页面脚本理论上也能访问；
不要把它当作机密存储。如需彻底删除，在 DSH Web 的浏览器开发者工具中
执行后刷新：

```js
localStorage.removeItem('dsh-teahouse:shell:v1')
localStorage.removeItem('dsh-teahouse:gin-rummy:v1')
localStorage.removeItem('dsh-teahouse:harbor-pairs:v1')
localStorage.removeItem('dsh-teahouse:harbor-clash:v1')
localStorage.removeItem('dsh-teahouse:migrated:v1')
localStorage.removeItem('dsh-whale-cards:save:v1')
```

## DSH 接入方式

- `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- patch 向 Web profile 插入唯一的 `whale-cards` Loader 行。
- Host 入口 `src/index.ts` 注册 `/teahouse` RPC 通道：模型列表、普通聊天和
  Agent 生命周期（start/turn/chat/event/end）。每场牌局通过 DSH Agent
  Registry 创建一个独立 Session。
- 每个牌局 Agent 只注册 `play_game_action`、`search_sessions`、
  `inspect_session` 三个作用域工具；继承的全局工具全部显式禁用。牌局工具
  只接受本轮合法动作 ID，由本地引擎执行真实状态变更。
- Browser 入口注入官方 `sessions`、`connection` 服务：投影任务运行/待处理
  状态，把完成/待输入事件回调给当前 Agent Session，并把澜音服务绑定到
  Host RPC 桥。
- UI 在 `document.body` 下创建单一 Shadow DOM，样式与 DSH 页面隔离。
- Cordis effect 卸载时执行 React `unmount()` 并删除 host；事件、计时器
  和音频也由各自 effect 清理。
- 规则、经典 AI、存档、台词、美术和声音全部包含在插件 client bundle 中；
  Agent 只负责选择合法动作和生成角色表达。

## 开发与验证

```sh
npm ci                 # 按 package-lock.json 安装
npm run typecheck      # TypeScript 静态检查
npm test               # Vitest 单元、集成与生命周期测试
npm run build          # 生成内嵌美术、类型检查并构建 Host/Browser
npm pack --dry-run     # 检查实际发布文件
```

其他脚本：

```sh
npm run generate:assets  # assets/lanyin-harbor.jpg → src/client/generated/art.ts
npm run build:preview    # 独立预览构建（预览页自动轮播任务提醒状态）
npm run prepare          # Git 依赖安装时使用的自包含构建
```

主要目录：

```text
src/game/          牌、组合搜索、计分状态机、本地 AI、存档与模拟测试
src/games/         游戏模块（gin-rummy、harbor-clash、harbor-pairs），实现 GameModule 契约
src/teahouse/      茶歇间外壳：大厅、GameServices、澜音 dock、RPC、存档
src/ui/            共享 UI：牌桌、控制器、台词、音效和 DSH 任务提醒
src/client/        DSH Browser 入口、Shadow DOM 挂载与清理
assets/            原创分发美术
docs/              美术生成记录与游戏作者指南
lib/               构建产物，不手工编辑
```

可靠性测试包括：

- 52 张牌唯一性、确定性洗牌、组合搜索和 layoff 优化
- 摸牌/弃牌/敲牌/两张牌墙、Gin 和 undercut 计分
- 版本化存档在任意决策点的精确恢复与坏数据拒绝
- AI 不接收玩家手牌的决策边界
- 96 个固定 seed、两种计分 profile、三档难度的完整三手模拟；每一步检查
  牌不丢不重、手牌数量、牌墙、得分和结算阶段，并以 256 次状态转换
  为不死循环上限
- 港湾对决：三航线部署、五级阵型比较、夺塔终局、合法动作边界与本地 AI
- 潮汐拾光：宝物连携、风险概率、翻船、收帆、三轮结算与本地 AI
- 茶歇间外壳：大厅策展、一键直达、双模式、澜音降级台词、Soul、记忆增删、
  每局 Agent Session、牌局快捷对话和任务提醒非阻塞
- DSH client Shadow DOM 挂载、session 适配与卸载零残留

新增游戏行为时，请通过 `src/game` 导出的公开函数写测试，不断言私有实现
细节。游戏规则改动必须同时更新本 README、模拟测试和版本化存档兼容策略。

### 添加新游戏

茶歇间是策展制。新游戏的完整指南（`GameModule` 契约、`GameServices`、
注册步骤、质量清单、PR 要求）见 [docs/game-author-guide.md](docs/game-author-guide.md)。

### 美术再生成

原创澜音美术使用 Codex 内置 `imagegen`、且没有输入参考图。精确 prompt、
原始 PNG、项目源副本、优化 JPEG、SHA-256 和再生成检查清单记录在
[docs/art-generation.md](docs/art-generation.md)。不要直接编辑生成的
`src/client/generated/art.ts`。

## 许可证与来源

项目代码以 [MIT License](LICENSE) 发布。澜音角色与港湾茶室美术为本项目
专门创作。

没有复制或打包 `Small-tailqwq/dsh-deep-whale` 的代码、美术、角色设计、
台词或音频；它不是本插件依赖。OpenSpiel、RLCard、Bicycle 和社区 DSH
项目只作为规则、验证或交互研究来源，具体边界见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
