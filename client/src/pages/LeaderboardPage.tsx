import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Member } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];
const PERIODS = [
  { key: 'all', label: '全部' },
  { key: 'month', label: '本月' },
  { key: 'week', label: '本周' },
];

export default function LeaderboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [period, setPeriod] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const load = useCallback(() => {
    api.getLeaderboard(period).then(setMembers).catch(() => {});
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Auto refresh every 10s
  useEffect(() => {
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const containerClass = isFullscreen ? 'fullscreen' : '';

  return (
    <div className={containerClass}>
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="page-title" style={{ margin: 0 }}>🏆 积分排行榜</h1>
          <button
            className="btn-secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? '退出全屏' : '📺 投屏模式'}
          </button>
        </div>

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 30 }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '8px 24px',
                borderRadius: 50,
                fontWeight: 700,
                fontSize: 14,
                background: period === p.key ? 'linear-gradient(135deg, var(--orange), #FF8C5A)' : 'white',
                color: period === p.key ? 'white' : 'var(--text-light)',
                border: period === p.key ? 'none' : '2px solid #E8E8E8',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {members.length >= 3 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: isFullscreen ? 40 : 20,
            marginBottom: 40,
            padding: '0 20px',
          }}>
            {[1, 0, 2].map((rank) => {
              const m = members[rank];
              if (!m) return null;
              const heights = [180, 140, 120];
              const sizes = isFullscreen
                ? ['120px', '100px', '90px']
                : ['90px', '72px', '64px'];
              return (
                <motion.div
                  key={m.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: rank * 0.2, type: 'spring', damping: 12 }}
                  style={{ textAlign: 'center', flex: '0 0 auto' }}
                >
                  <div className={rank === 0 ? 'shimmer' : ''} style={{ fontSize: isFullscreen ? 48 : 36, marginBottom: 8 }}>
                    {MEDALS[rank]}
                  </div>
                  <div
                    className="avatar"
                    style={{
                      width: sizes[rank],
                      height: sizes[rank],
                      fontSize: isFullscreen ? 40 : 30,
                      background: m.avatar_color,
                      margin: '0 auto 8px',
                      boxShadow: rank === 0 ? `0 8px 24px ${m.avatar_color}66` : undefined,
                    }}
                  >
                    {m.name[0]}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: isFullscreen ? 22 : 17, marginBottom: 4 }}>
                    {m.name}
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: rank * 0.2 + 0.3, type: 'spring' }}
                    style={{
                      fontWeight: 900,
                      fontSize: isFullscreen ? 28 : 22,
                      background: 'linear-gradient(135deg, #F7C948, #FF6B35)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {m.total_score}
                  </motion.div>
                  <div style={{
                    width: isFullscreen ? 120 : 80,
                    height: heights[rank],
                    background: rank === 0
                      ? 'linear-gradient(180deg, #FFD700, #FFA500)'
                      : rank === 1
                        ? 'linear-gradient(180deg, #C0C0C0, #A0A0A0)'
                        : 'linear-gradient(180deg, #CD7F32, #A0522D)',
                    borderRadius: '12px 12px 0 0',
                    marginTop: 8,
                    opacity: 0.8,
                  }} />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <AnimatePresence>
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: isFullscreen ? '18px 32px' : '14px 24px',
                  borderBottom: i < members.length - 1 ? '1px solid #F0F0F0' : 'none',
                  background: i < 3 ? '#FFFBF0' : 'white',
                }}
              >
                <div style={{
                  width: 36,
                  fontWeight: 900,
                  fontSize: isFullscreen ? 22 : 18,
                  color: i < 3 ? 'var(--orange)' : 'var(--text-light)',
                  textAlign: 'center',
                }}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </div>
                <div
                  className="avatar"
                  style={{
                    background: m.avatar_color,
                    width: isFullscreen ? 52 : 42,
                    height: isFullscreen ? 52 : 42,
                    fontSize: isFullscreen ? 22 : 18,
                  }}
                >
                  {m.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: isFullscreen ? 20 : 16 }}>{m.name}</div>
                  <div style={{ fontSize: isFullscreen ? 14 : 12, color: 'var(--text-light)' }}>
                    发言 {m.speak_count} 次
                  </div>
                </div>
                <div style={{
                  fontWeight: 900,
                  fontSize: isFullscreen ? 24 : 20,
                  background: 'linear-gradient(135deg, #F7C948, #FF6B35)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {m.total_score}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {members.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏜️</div>
              <p>还没有数据，快去抽人发言吧！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
