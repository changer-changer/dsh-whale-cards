# 茶歇间游戏作者指南

本指南面向想为「DSH 茶歇间」贡献新游戏的开发者。茶歇间是一个 DSH 插件内
的策展游戏馆：几个高质量小游戏 + 一个共享的陪伴角色「澜音」。游戏作者只
需要实现一个干净的 `GameModule` 契约，其余一切（挂载、存档、任务提醒、
澜音、主题）由茶歇间外壳（shell）负责。

## 架构原则

- **游戏永远不直接碰 DSH。** 不 import DSH 运行时、不读 `ctx`、不碰 session
  列表。游戏只与 `GameServices` 交互。
- **游戏是纯 React 视图 + 同步状态机。** 引擎逻辑与 React 分离（参考
  `src/game/`：纯 TS 引擎 + 独立测试），视图层负责渲染和派发动作。
- **存档按游戏隔离。** 每个游戏拥有自己的存档槽（`manifest.id` 即命名空
  间）。外壳负责持久化，游戏只提供 `saveState` / `loadState`。
- **可降级。** 澜音模型不可用时游戏必须照常可玩（本地台词降级），任务
  提醒必须非阻塞。

## GameModule 契约

契约定义在 `src/teahouse/types.ts`。每个游戏导出一个 `GameModule`：

```ts
interface GameModule {
  readonly manifest: GameManifest     // 大厅卡元数据
  readonly hasSave: () => boolean     // 同步探测——有存档可继续？
  readonly clearSave: () => void      // 大厅卡上「清除存档」时调用
  readonly View: ComponentType<GameViewProps>
}
```

### GameManifest（大厅卡元数据）

- `id`：稳定 id，kebab-case，同时是存档槽命名空间。**一旦发布不可改。**
- `title` / `tagline`：短、诚实。
- `duration`：一整局的大致分钟数，如 `"8–12 分钟"`。
- `intensity`：`'light' | 'medium' | 'heavy'`（思考负荷）。
- `why`：一句「为什么值得玩」，维护者口吻。
- `glyph`：大厅卡上的 emoji/字形。
- `accent`：0–360 的色相，用于大厅卡与外壳主题。

### GameServices（外壳注入给游戏的能力）

```ts
interface GameServices {
  lanyinAvailable(): boolean                 // LLM 往返当前是否可能
  lanyinRemark(event: string, context: string): void  // 澜音点评，绝不 throw，可无条件调用
  saveState(state: unknown): void            // 持久化到本游戏存档槽
  loadState<S>(): S | null                   // 读取本游戏存档
  taskNotice(): 'done' | 'needs_input' | null  // 非阻塞任务提醒
  clearTaskNotice(): void
  getPreference(key: string): unknown
  setPreferences(patch: Record<string, unknown>): void
  reportMatchResult(result: { won: boolean; draw?: boolean }): void
}
```

要点：

- `lanyinRemark` 由外壳合并、限流，**游戏可以在每个事件上无条件调用**。
  失败时自动落回本地台词。
- `saveState` / `loadState` 是同步的（外壳在内存 + localStorage 双写）。
  引擎关键状态变化后调用即可，无需节流——外壳按帧合并。
- `taskNotice` 只反映 DSH 当前任务状态，**绝不暂停游戏**，以非阻塞横幅
  呈现（`aria-live`，不抢焦点）。

## 添加一个新游戏（步骤）

1. **建目录**：`src/games/<game-id>/module.tsx`（参照 `gin-rummy/` 与
   `harbor-pairs/`）。引擎放 `src/game/` 或游戏目录内，必须是纯 TS。
2. **实现 GameModule**：manifest 字段齐全、诚实；`View` 是受控组件，
   通过 `GameServices` 完成一切副作用。
3. **注册**：在 `src/teahouse/registry.ts` 的 `GAME_REGISTRY` 加一条。
   外壳会 `lazy` 加载，只在打开时拉取。
4. **写测试**：
   - 引擎纯函数测试（状态机、合法动作、散牌计算、成组判断）。
   - 组件测试（`@testing-library/react`，参照 `teahouse.test.tsx`）：
     渲染、回合流转、存档恢复、澜音降级。
5. **质量清单（全部必过）**：
   - [ ] `npm run typecheck` 无错误
   - [ ] `npm test` 全绿（新测试覆盖引擎 + 视图关键路径）
   - [ ] `npm run build` 通过
   - [ ] 真实 DSH Web 冒烟：安装、打开、完整一局、刷新恢复、窄屏可玩
   - [ ] 控制台 0 错误 0 警告
   - [ ] 模型不可用时游戏仍可玩（本地台词降级）
   - [ ] 不读取玩家隐藏信息做 AI 决策（AI 只看公开牌面）
   - [ ] 新增注释按「已有 / BDD / 必要 / 不必要」四档说明；公共接口
         JSDoc 视为必要 API 文档
6. **提交**：代码 + 测试 + README（如需要）+ 本指南（如流程有变）。

## PR 要求

- **范围小**：一个 PR 一个游戏或一个修复。不要夹带重构。
- **契约冻结**：不改 `GameServices` / `GameManifest` 已发布字段；确需
  扩展时先讨论。
- **不引入新依赖**：除非有充分理由并在 PR 中说明。
- **不碰 DSH 内部**：游戏代码不得 import DSH 运行时。
- **存档兼容**：不得破坏已有存档槽的读取。
- **视觉**：沿用 `teahouse-styles.ts` 的设计令牌（暗色港湾 + 暖琥珀 +
  海玻璃青），保持大厅策展一致性。

## 验收清单（发布前）

功能：

- [ ] 大厅卡显示完整 manifest 字段，有「有存档」徽标时可继续
- [ ] 真实双人（玩家 + AI）完整手牌回合可打完一局
- [ ] 刷新页面不丢局：重进后牌局、比分、手数恢复
- [ ] 页面宽度 < 440px 时侧边栏自动收起，牌桌操作完整可用
- [ ] 收起茶歇间后 DSH 主界面完全可操作
- [ ] 控制台无错误

澜音集成：

- [ ] 对局中可「和澜音聊一句」，回复有局内语境
- [ ] 游戏事件会触发澜音点评（可降级到本地台词）
- [ ] 任务提醒是非阻塞横幅，不暂停、不抢焦点