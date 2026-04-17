// Lucky/fun score pool
export const SCORE_POOL = [6, 8, 18, 66, 68, 88, 99, 100, 168, 520, 666, 888, 999];

// Encouragement messages
export const ENCOURAGEMENTS = [
  '太棒了！👏',
  '说得好！🎯',
  '精彩发言！✨',
  '你是全场最靓的仔！🌟',
  '言之有物！💎',
  '一针见血！🎯',
  '妙语连珠！🔥',
  '掌声送给你！👏👏👏',
  '这个观点很有深度！🧠',
  '太有才了！🏆',
  '说到点子上了！💡',
  '全场最佳！🥇',
  '你的发言价值连城！💰',
  '听君一席话，胜读十年书！📚',
  '这波操作满分！💯',
  '你就是团队的MVP！🏅',
  '发言界的天花板！🚀',
  '这个insight绝了！🔮',
  '你说的都对！😎',
  '请收下我的膝盖！🙇',
];

export function getRandomScore(): number {
  return SCORE_POOL[Math.floor(Math.random() * SCORE_POOL.length)];
}

export function getRandomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}
