# DSH 茶歇间

「DSH 茶歇间」是一个可安装到 DeepSeek Harness（DSH）Web 的本地游戏馆
插件：几个策展级小游戏 + 一个共享的原创陪伴角色「澜音」。等待编译、
测试或长任务时，随时打开来一局；随时收起，回来后从同一步继续。

![原创成年鲸鱼牌友澜音与港湾牌桌](assets/lanyin-harbor.jpg)

- **策展游戏馆**：大厅里的小游戏统一主题（深夜港湾茶室），存档按游戏
  隔离，打开即续。
  - **鲸牌茶歇**：经典双人 Gin Rummy，三手决胜，松弛/从容/敏锐三档本地 AI。
  - **港湾对决**：昆特式三局两胜卡牌对决，16 张港湾卡、四种能力，考验时机与判断。
  - **港湾配对**：轻量的翻牌配对，适合更短的间隙。
- **澜音**：跨游戏陪伴角色。真实模型聊天（走 DSH Host RPC 桥，凭据不
  出 Host）、长期记忆、随局势变化的台词与表情。
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

1. 打开 `dsh web`，点击右下角「茶歇间」浮动入口展开游戏馆。
2. 在大厅选择游戏：没有存档时开始新对局；有未完成对局时游戏卡显示
   「有存档」徽标，打开即可继续。
3. 任何游戏里都可以「和澜音聊一句」；桌面右下角的澜音 dock 提供完整
   聊天、记忆管理和模型选择。
4. 澜音会记住你告诉她的事（记忆 tab 可查看/删除），换模型只需在设置里
   下拉选择——模型选择与聊天都通过 DSH Host 桥执行，客户端不接触凭据。
5. 任何时候都可以收起。牌局被冻结并保存，刷新页面、切换 DSH 会话或
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

### 港湾配对

翻牌配对小游戏，规则写在游戏内「规则」面板。适合一分钟级别的间隙。

### 港湾对决 · 规则摘要

原创的昆特式卡牌对决（机制致敬 Gwent，卡牌与美术全部原创，无 CDPR 素材）：

- 双方从固定的 16 张港湾卡组各抽 10 张手牌，进行三小局对决，先赢两局者胜。
- 每回合出 1 张牌或过牌（免战本小局）；双方都过牌后，小局结束，场上总战力
  高者赢下小局；平局则双方都不得分。
- 小局之间重新发牌，先手交替（第 1/3 小局玩家先手，第 2 小局澜音先手）。
- 四种卡牌能力：普通战力牌；**港务长**（✦）打出时己方在场牌 +1；**信风商船**
  （⛵）出牌时从卡组抽 1 张；**雾灯**（🌫）点亮后对方下一张出牌战力 -2。
- 澜音的 AI 为贪心策略：按有效战力出牌，落后且手牌不足以反超时选择过牌。
- 手牌出完的一方自动过牌；三小局后若双方各胜一局，比赛平局。

## 公平性

## 公平性

- 发牌使用浏览器随机种子；每场 seed 和完整牌序随存档固定，难度不会改牌。
- AI 的决策视图只包含它自己的手牌、弃牌顶牌、牌堆数量和双方已经公开的
  动作，不把玩家手牌传给决策函数。
- 三档难度只改变拿明牌、保留组合、规避送牌和敲牌时机。
- 游戏逻辑、AI 和计分全部在浏览器本地运行；模型不可用时不影响对局结果。

## 隐私与本地数据

插件默认不发起任何网络请求：

- 不发送遥测、不加载 CDN、不包含广告 SDK。
- 不读取 DSH 对话、提示词、工具参数、工具结果、代码或工作区文件。
- 只在内存中观察开局时当前 session 的 `running` 与 `pendingInteraction`
  状态，用于完成/待处理提醒。
- 港湾美术随 client bundle 以内嵌 data URL 提供，音效在本地合成。
- 不创建账号、cookie、云存档或跨设备标识。

**模型聊天是唯一的联网行为**：聊天请求经 DSH Host RPC 通道 `/teahouse`
转发，由 Host 使用其自身模型配置完成；API 凭据只存在于 Host，客户端
代码不接触凭据，聊天内容也不会离开你的 DSH 实例。

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
localStorage.removeItem('dsh-teahouse:migrated:v1')
localStorage.removeItem('dsh-whale-cards:save:v1')
```

## DSH 接入方式

- `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- patch 向 Web profile 插入唯一的 `whale-cards` Loader 行。
- Host 入口 `src/index.ts` 注册 `/teahouse` RPC 通道：模型列表与聊天转发
  （通过 DSH LLM 服务），并持有连接会话注册表；不启动其他服务。
- Browser 入口注入官方 `sessions`、`connection` 服务：投影任务运行/待处理
  状态，并把澜音服务绑定到 Host RPC 桥。
- UI 在 `document.body` 下创建单一 Shadow DOM，样式与 DSH 页面隔离。
- Cordis effect 卸载时执行 React `unmount()` 并删除 host；事件、计时器
  和音频也由各自 effect 清理。
- 规则、AI、持久化、台词、美术和声音全部包含在插件 client bundle 中。

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
- 港湾对决：出牌/过牌流转、号令/扬帆/雾灯能力、小局结算与平局、比赛终局
  与 AI 决策边界，存档 JSON 往返
- 茶歇间外壳：大厅策展、澜音降级台词、记忆增删、任务提醒非阻塞
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