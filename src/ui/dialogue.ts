export type DialogueEvent =
  | 'ai_gin'
  | 'ai_knock'
  | 'ai_take_discard'
  | 'chat'
  | 'greeting'
  | 'human_gin'
  | 'human_knock'
  | 'human_take_discard'
  | 'match_draw'
  | 'match_loss'
  | 'match_win'
  | 'task_done'
  | 'task_needs_input'

const LINES: Readonly<Record<DialogueEvent, readonly string[]>> = {
  greeting: ['牌已经温好了。', '慢慢想，我不催。', '今晚海面很安静。'],
  chat: ['这手有点意思。', '别急，牌还会变。', '我可看见你犹豫了。', '再看一眼散牌分？'],
  human_take_discard: ['看得很准嘛。', '这张果然被你盯上了。', '明牌也敢拿，有想法。'],
  ai_take_discard: ['这张我就收下啦。', '谢谢你的临时补丁。', '嗯，正好用得上。'],
  human_knock: ['这么快？那我检查了。', '敲得很果断。', '好，摊牌吧。'],
  ai_knock: ['我先敲啦。', '风向差不多了。', '来，看看散牌。'],
  human_gin: ['漂亮，十张都归位了。', 'Gin。这个收尾很干净。'],
  ai_gin: ['这次是我的 Gin。', '刚好，一张不散。'],
  match_draw: ['今晚的潮位，刚好一样高。', '平局。下一次再分个高低？'],
  match_win: ['漂亮。下次我记住这手。', '今晚的风在你那边。'],
  match_loss: ['差一点。牌局很公平。', '这次我先拿下啦。'],
  task_done: ['那边好像忙完了。', '工作完成了，要回去看看吗？'],
  task_needs_input: ['DSH 在等你确认。', '那边需要你处理一下。'],
}

export function dialogueLine(event: DialogueEvent, seed: number, index = 0): string {
  const pool = LINES[event]
  const mixed = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ event.length) >>> 0
  return pool[mixed % pool.length] as string
}
