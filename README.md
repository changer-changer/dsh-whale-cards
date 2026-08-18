# 鲸牌茶歇

「鲸牌茶歇」是一个可安装到 DeepSeek Harness（DSH）Web 的本地单人牌局插件。等待编译、测试或长任务时，可以和原创成年鲸鱼牌友「澜音」打一场三手 Gin Rummy；随时收起，回来后从同一步继续。

![原创成年鲸鱼牌友澜音与港湾牌桌](assets/lanyin-harbor.jpg)

- 经典双人 Gin Rummy，三手决胜
- 松弛、从容、敏锐三档本地 AI，不读取玩家手牌做决策
- 对局、偏好和统计保存在浏览器本地
- DSH 当前任务完成或需要确认时，只安静提醒一次
- 无账号、无广告、无联网对战、无模型调用、无外部分析
- 原创角色与港湾茶室美术，插件卸载/重载时完整移除自身 UI

## 要求

- DeepSeek Harness `0.1.0-rc.7` 兼容版本
- Node.js `^22.19.0` 或 `>=24.0.0`
- 可用的 `dsh` 和 pnpm；`dsh plugin` 会在 profile 内调用 pnpm

DSH 仍处于 developer preview。插件发布前应在目标 DSH 版本上重新运行构建、测试和真实 Web 冒烟测试。

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

`--dump-config` 的输出应包含 id 为 `whale-cards`、包名为 `dsh-whale-cards` 的一行。已经运行的 DSH Web 需要重启一次才能载入新包。

### 从预构建 tarball 安装

可以直接从 [GitHub Releases](https://github.com/changer-changer/dsh-whale-cards/releases) 下载已验证的 `dsh-whale-cards-0.1.0.tgz`，也可以自行构建：

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
dsh plugin --profile web add ./dsh-whale-cards-0.1.0.tgz
dsh --profile web --dump-config
dsh web
```

预构建 tarball 不需要授权安装时运行第三方构建脚本，也是当前最适合内测和离线分发的形式。本 README 不假定该包已经发布到 npm registry。

### 从 Git commit 安装

只安装审阅过并锁定的 commit：

```sh
dsh plugin --profile web add github:<owner>/<repository>#<commit-sha>
```

Git 安装获得的是源码，包内 `prepare` 会在安装时执行构建。pnpm 10+ 默认可能阻止该脚本；请先审阅源码，再把 pnpm 错误信息给出的**确切包键**加入该 Web profile 的 `pnpm-workspace.yaml` `allowBuilds`，然后重试。不要安装会随分支更新的未固定引用。

### 卸载

```sh
dsh plugin --profile web remove dsh-whale-cards
```

重启 DSH Web 后插件 UI 即被移除。为避免卸载操作擅自删除用户数据，浏览器本地存档会保留；清理方式见“隐私与本地数据”。

## 使用

1. 打开 `dsh web`，使用页面中的「鲸牌」浮动入口展开牌桌。
2. 没有存档时开始一场新牌局；有未完成牌局时继续即可。
3. 轮到你摸牌时，选择盖着的牌堆或弃牌区最上方的明牌。
4. 摸牌后点选一张手牌，再选择「弃牌」；当散牌不超过 10 点时，也可以选择「敲牌」。
5. 每手结算后进入下一手；三手结束后比较累计得分。
6. 任何时候都可以收起。牌局被冻结并保存，刷新页面、切换 DSH 会话或稍后重新打开都可恢复。

刚从弃牌区拿起的明牌，本回合不能原样弃回。牌堆只剩两张时不能再摸暗牌：如果拿明牌后能立即合法敲牌，可以这样结束；否则选择结束本手。

键盘可用 `1`–`9` / `0` 选择第 1–10 张手牌，`Enter` 执行当前弃牌（牌墙强制敲牌时执行敲牌），`Esc` 依次关闭偏好/规则面板或收起牌桌。所有主要操作也都是原生按钮，可用 `Tab` 和 `Enter` 操作。

牌桌偏好保存在本地，包括：

- AI 难度：`relaxed`（松弛）、`steady`（从容，默认）、`sharp`（敏锐）
- AI 演出速度：普通或快速
- 声音：开或静音；音效由浏览器 Web Audio 即时合成
- 澜音台词浓度：安静、适量或健谈

开始牌局时，插件会记住当时 DSH 的当前任务。该任务从运行变为完成，或出现 approval / question / plan review 等待处理状态时，牌桌只显示一次非阻塞提醒；它不会自动关闭牌局，也不会替用户批准操作。

## 规则摘要

本插件使用标准 52 张扑克的经典 Gin Rummy 核心规则，并把一场比赛固定为三手：

- 双方每手各拿 10 张；每回合先摸一张，再弃一张。
- 三张或四张同点数牌组成一组 `set`。
- 三张以上同花连续牌组成一顺 `run`。A 只作低牌，可组成 A-2-3，不能组成 Q-K-A。
- 未进入任何组合的牌是“散牌”。A 计 1 点，2–10 按牌面计分，J/Q/K 各计 10 点。
- 弃牌后散牌总分不超过 10 可敲牌；散牌为 0 是 Gin。
- 普通敲牌后，对手可把适合的散牌接到敲牌者的组合上。敲牌者散牌更少时，获得双方最终散牌差值。
- 对手散牌等于或少于敲牌者时发生 undercut：对手获得 10 分奖励再加差值。
- Gin 不允许对手接牌：Gin 方获得 20 分奖励再加对手散牌分。
- 牌墙到达且无人合法结束时，本手平局、双方 0 分。

代码中另有 `openSpielCompat` 计分 profile，用于与公开规则引擎交叉验证；玩家默认对局使用上述 `bicycle` profile。规则与验证来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 公平性

- 发牌使用浏览器随机种子；每场 seed 和完整牌序随存档固定，难度不会改牌。
- AI 的决策视图只包含它自己的手牌、弃牌顶牌、牌堆数量和双方已经公开的动作，不把玩家手牌传给决策函数。
- 三档难度只改变拿明牌、保留组合、规避送牌和敲牌时机。
- 游戏逻辑、AI 和计分全部在浏览器本地运行，不调用 LLM，也不会因为网络或 DSH 模型状态改变结果。

## 隐私与本地数据

插件默认完全离线：

- 不发送网络请求，不加载 CDN，不包含遥测或广告 SDK。
- 不读取 DSH 对话、提示词、工具参数、工具结果、代码或工作区文件。
- 只在内存中观察开局时当前 session 的 `running` 与 `pendingInteraction` 状态，用于完成/待处理提醒。
- 港湾美术随 client bundle 以内嵌 data URL 提供，音效在本地合成。
- 不创建账号、cookie、云存档或跨设备标识。

浏览器 `localStorage` 的键为：

```text
dsh-whale-cards:save:v1
```

其中保存当前完整牌局（seed、牌序、双方手牌、得分、回合和公开动作）、面板开关、难度/声音/台词偏好，以及本地局数、胜场和熟悉度。数据留在 DSH Web 的同源浏览器存储中，其他同源页面脚本理论上也能访问；不要把它当作机密存储。

如需彻底删除存档，在 DSH Web 的浏览器开发者工具中执行后刷新：

```js
localStorage.removeItem('dsh-whale-cards:save:v1')
```

## DSH 接入方式

- `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- patch 向 Web profile 插入唯一的 `whale-cards` Loader 行。
- Host 入口 `src/index.ts` 无副作用；游戏不在 DSH Host 中启动服务。
- Browser 入口注入官方 `sessions` 服务，只投影任务运行/待处理状态。
- UI 在 `document.body` 下创建单一 Shadow DOM，样式与 DSH 页面隔离。
- Cordis effect 卸载时执行 React `unmount()` 并删除 host；事件、计时器和音频也由各自 effect 清理。
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
npm run prepare          # Git 依赖安装时使用的自包含构建
```

主要目录：

```text
src/game/        牌、组合搜索、计分状态机、本地 AI、存档与模拟测试
src/ui/          牌桌、控制器、台词、音效和 DSH 任务提醒
src/client/      DSH Browser 入口、Shadow DOM 挂载与清理
assets/          原创分发美术
docs/            美术生成与来源记录
lib/             构建产物，不手工编辑
```

可靠性测试包括：

- 52 张牌唯一性、确定性洗牌、组合搜索和 layoff 优化
- 摸牌/弃牌/敲牌/两张牌墙、Gin 和 undercut 计分
- 版本化存档在任意决策点的精确恢复与坏数据拒绝
- AI 不接收玩家手牌的决策边界
- 96 个固定 seed、两种计分 profile、三档难度的完整三手模拟；每一步检查牌不丢不重、手牌数量、牌墙、得分和结算阶段，并以 256 次状态转换为不死循环上限
- DSH client Shadow DOM 挂载、session 适配与卸载零残留

新增游戏行为时，请通过 `src/game` 导出的公开函数写测试，不断言私有实现细节。游戏规则改动必须同时更新本 README、模拟测试和版本化存档兼容策略。

### 美术再生成

原创澜音美术使用 Codex 内置 `imagegen`、且没有输入参考图。精确 prompt、原始 PNG、项目源副本、优化 JPEG、SHA-256 和再生成检查清单记录在 [docs/art-generation.md](docs/art-generation.md)。不要直接编辑生成的 `src/client/generated/art.ts`。

## 许可证与来源

项目代码以 [MIT License](LICENSE) 发布。澜音角色与港湾茶室美术为本项目专门创作。

没有复制或打包 `Small-tailqwq/dsh-deep-whale` 的代码、美术、角色设计、台词或音频；它不是本插件依赖。OpenSpiel、RLCard、Bicycle 和社区 DSH 项目只作为规则、验证或交互研究来源，具体边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
