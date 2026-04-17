import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Member, DrawResult, ScoreResult } from '../api';
import Confetti from '../components/Confetti';

type Phase = 'idle' | 'spinning' | 'result' | 'scoring' | 'scored' | 'voluntary' | 'voluntaryScored';

export default function DrawPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [members, setMembers] = useState<{ id: string; name: string; avatar_color: string }[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBonusInput, setShowBonusInput] = useState(false);
  const [bonusValue, setBonusValue] = useState('');
  const [bonusGiven, setBonusGiven] = useState(false);
  const [voluntaryMemberId, setVoluntaryMemberId] = useState('');
  const [voluntaryResult, setVoluntaryResult] = useState<ScoreResult | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const spinInterval = useRef<number | null>(null);
  const spinTimeout = useRef<number | null>(null);

  useEffect(() => {
    api.getMembers().then(m => {
      setMembers(m.map(x => ({ id: x.id, name: x.name, avatar_color: x.avatar_color })));
    }).catch(() => {});
  }, []);

  const startDraw = useCallback(async () => {
    if (members.length === 0) {
      try {
        const m = await api.getMembers();
        if (m.length === 0) {
          alert('请先添加同事！去管理页面添加 👥');
          return;
        }
        setMembers(m.map(x => ({ id: x.id, name: x.name, avatar_color: x.avatar_color })));
      } catch {
        alert('请先添加同事！');
        return;
      }
    }

    setPhase('spinning');
    setSelected(null);
    setScoreResult(null);
    setShowConfetti(false);

    // Call API to get result
    let result: DrawResult;
    try {
      result = await api.draw();
    } catch {
      setPhase('idle');
      alert('抽取失败，请重试');
      return;
    }

    const allNames = result.allMembers;
    if (allNames.length > 0) {
      setMembers(allNames);
    }

    // Spinning animation: fast → slow → stop
    let speed = 50;
    let idx = 0;
    const totalDuration = 3000;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Easing: slow down as progress increases
      speed = 50 + progress * progress * 400;

      if (progress < 1) {
        idx = (idx + 1) % allNames.length;
        setDisplayName(allNames[idx].name);
        spinTimeout.current = window.setTimeout(tick, speed);
      } else {
        // Final: show selected
        setDisplayName(result.selected.name);
        setSelected(result.selected);
        setPhase('result');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    };

    tick();
  }, [members]);

  const giveScore = useCallback(async () => {
    if (!selected) return;
    setPhase('scoring');

    try {
      const result = await api.giveScore(selected.id);
      setScoreResult(result);
      setPhase('scored');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch {
      alert('积分发放失败');
      setPhase('result');
    }
  }, [selected]);

  const openVoluntary = useCallback(async () => {
    try {
      const m = await api.getMembers();
      setAllMembers(m);
      setVoluntaryMemberId('');
      setVoluntaryResult(null);
      setPhase('voluntary');
    } catch {
      alert('获取成员列表失败');
    }
  }, []);

  const giveVoluntaryScore = useCallback(async () => {
    if (!voluntaryMemberId) { alert('请选择一位同事'); return; }
    try {
      const result = await api.giveScore(voluntaryMemberId);
      const member = allMembers.find(m => m.id === voluntaryMemberId);
      setSelected(member ? { ...member } as Member : null);
      setVoluntaryResult(result);
      setPhase('voluntaryScored');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch {
      alert('积分发放失败');
    }
  }, [voluntaryMemberId, allMembers]);

  const giveBonus = useCallback(async () => {
    if (!selected) return;
    const bonus = parseInt(bonusValue);
    if (isNaN(bonus) || bonus <= 0) { alert('请输入大于0的加分数值'); return; }
    try {
      const updated = await api.bonusScore(selected.id, bonus);
      if (scoreResult) {
        setScoreResult({ ...scoreResult, member: updated });
      }
      if (voluntaryResult) {
        setVoluntaryResult({ ...voluntaryResult, member: updated });
      }
      setBonusGiven(true);
      setShowBonusInput(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch {
      alert('加分失败');
    }
  }, [selected, bonusValue, scoreResult, voluntaryResult]);

  const reset = () => {
    setPhase('idle');
    setSelected(null);
    setScoreResult(null);
    setVoluntaryResult(null);
    setVoluntaryMemberId('');
    setDisplayName('');
    setShowConfetti(false);
    setShowBonusInput(false);
    setBonusValue('');
    setBonusGiven(false);
  };

  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 40 }}>
      <Confetti active={showConfetti} />

      <h1 className="page-title">🎤 谁来发言？</h1>

      {/* Spinning / Result display */}
      <div style={{ minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 80, marginBottom: 20 }}>🎰</div>
              <p style={{ color: 'var(--text-light)', fontSize: 16, marginBottom: 30 }}>
                点击下方按钮，随机抽取一位同事发言
              </p>
              <p style={{ color: 'var(--text-light)', fontSize: 14 }}>
                当前共 {members.length} 位同事
              </p>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: 60, marginBottom: 30 }}
              >
                🎲
              </motion.div>
              <motion.div
                key={displayName}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--orange), var(--pink))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {displayName}
              </motion.div>
            </motion.div>
          )}

          {(phase === 'result' || phase === 'scoring') && selected && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 8 }}
                className="avatar avatar-xl"
                style={{
                  background: selected.avatar_color,
                  margin: '0 auto 20px',
                  fontSize: 54,
                  boxShadow: `0 8px 32px ${selected.avatar_color}44`,
                }}
              >
                {selected.name[0]}
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}
              >
                {selected.name}
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ fontSize: 18, color: 'var(--text-light)', marginBottom: 10 }}
              >
                🎤 请开始你的发言！
              </motion.div>
            </motion.div>
          )}

          {phase === 'voluntary' && (
            <motion.div
              key="voluntary"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 80, marginBottom: 20 }}>🙋</div>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>选择主动发言的同事</p>
              <select
                className="input"
                value={voluntaryMemberId}
                onChange={e => setVoluntaryMemberId(e.target.value)}
                style={{ maxWidth: 240, margin: '0 auto', display: 'block', fontSize: 16, padding: 12 }}
              >
                <option value="">-- 请选择 --</option>
                {allMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </motion.div>
          )}

          {(phase === 'scored' || phase === 'voluntaryScored') && (scoreResult || voluntaryResult) && (
            <motion.div
              key="scored"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                initial={{ scale: 0, rotateZ: -10 }}
                animate={{ scale: 1, rotateZ: 0 }}
                transition={{ type: 'spring', damping: 8, stiffness: 150 }}
                style={{ fontSize: 80, marginBottom: 10 }}
              >
                🎁
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #F7C948, #FF6B35)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: 8,
                }}
              >
                +{(scoreResult || voluntaryResult)!.score}
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--orange)',
                  marginBottom: 8,
                }}
              >
                {(scoreResult || voluntaryResult)!.encouragement}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ fontSize: 16, color: 'var(--text-light)' }}
              >
                {selected?.name} 当前总积分：{(scoreResult || voluntaryResult)!.member.total_score}
              </motion.div>
              {bonusGiven && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 18, color: '#2EC4B6', fontWeight: 700, marginTop: 8 }}
                >
                  ⭐ 已额外加 {bonusValue} 分！
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
        {phase === 'idle' && (
          <>
            <motion.button
              className="btn-primary"
              onClick={startDraw}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ fontSize: 24, padding: '18px 60px' }}
            >
              🎲 开始抽人
            </motion.button>
            <motion.button
              className="btn-secondary"
              onClick={openVoluntary}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ fontSize: 18, padding: '14px 40px' }}
            >
              🙋 主动发言
            </motion.button>
          </>
        )}

        {phase === 'result' && (
          <>
            <motion.button
              className="btn-primary"
              onClick={giveScore}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              🎁 发放积分
            </motion.button>
            <motion.button
              className="btn-secondary"
              onClick={startDraw}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              🔄 再抽一次
            </motion.button>
          </>
        )}

        {phase === 'voluntary' && (
          <>
            <motion.button
              className="btn-primary"
              onClick={giveVoluntaryScore}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🎁 发放积分
            </motion.button>
            <motion.button
              className="btn-secondary"
              onClick={reset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← 返回
            </motion.button>
          </>
        )}

        {(phase === 'scored' || phase === 'voluntaryScored') && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {!bonusGiven && !showBonusInput && (
              <motion.button
                className="btn-secondary"
                onClick={() => { setShowBonusInput(true); setBonusValue(''); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                ⭐ 额外加分
              </motion.button>
            )}
            {showBonusInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  className="input"
                  type="number"
                  placeholder="加分数值"
                  value={bonusValue}
                  onChange={e => setBonusValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && giveBonus()}
                  autoFocus
                  style={{ width: 100 }}
                />
                <button className="btn-primary" onClick={giveBonus} style={{ padding: '10px 20px' }}>
                  确认
                </button>
                <button className="btn-secondary" onClick={() => setShowBonusInput(false)} style={{ padding: '10px 20px' }}>
                  取消
                </button>
              </motion.div>
            )}
            <motion.button
              className="btn-primary"
              onClick={reset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              🎲 继续抽人
            </motion.button>
          </div>
        )}

        {phase === 'spinning' && (
          <div style={{ color: 'var(--text-light)', fontSize: 16 }}>
            抽取中...
          </div>
        )}
      </div>
    </div>
  );
}
