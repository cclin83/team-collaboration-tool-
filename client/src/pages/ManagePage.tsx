import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Member } from '../api';

export default function ManagePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [batchText, setBatchText] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = () => {
    api.getMembers().then(setMembers).catch(() => {});
  };

  const addMember = async () => {
    if (!newName.trim()) return;
    try {
      await api.addMember(newName.trim());
      setNewName('');
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const batchImport = async () => {
    const names = batchText.split(/[,，\n]/).map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    try {
      await api.batchImport(names);
      setBatchText('');
      setShowBatch(false);
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`确定删除 ${name} 吗？积分记录也会一起删除`)) return;
    try {
      await api.deleteMember(id);
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await api.updateMember(editingId, { name: editName.trim() });
      setEditingId(null);
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetAllScores = async () => {
    if (!confirm('确定要清零所有人的积分吗？此操作不可撤销！')) return;
    try {
      await api.resetScores();
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const startEditScore = (m: Member) => {
    setEditingScoreId(m.id);
    setEditScore(String(m.total_score));
  };

  const saveScore = async () => {
    if (!editingScoreId) return;
    const score = parseInt(editScore);
    if (isNaN(score) || score < 0) { alert('请输入有效的积分数值'); return; }
    try {
      await api.updateMemberScore(editingScoreId, score);
      setEditingScoreId(null);
      loadMembers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">👥 同事管理</h1>

      {/* Add single member */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="input"
            placeholder="输入同事姓名..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMember()}
          />
          <motion.button
            className="btn-primary"
            onClick={addMember}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ padding: '12px 28px', fontSize: 15, whiteSpace: 'nowrap' }}
          >
            ➕ 添加
          </motion.button>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setShowBatch(!showBatch)}
          >
            📋 批量导入
          </button>
          <button
            className="btn-danger"
            onClick={resetAllScores}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            🔄 全员积分清零
          </button>
        </div>

        <AnimatePresence>
          {showBatch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 16 }}>
                <textarea
                  className="input"
                  placeholder="每行一个姓名，或用逗号分隔&#10;例如：张三，李四，王五"
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <motion.button
                    className="btn-primary"
                    onClick={batchImport}
                    whileTap={{ scale: 0.95 }}
                    style={{ padding: '10px 24px', fontSize: 14 }}
                  >
                    确认导入
                  </motion.button>
                  <button className="btn-secondary" onClick={() => setShowBatch(false)}>
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Member list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F0F0F0', fontWeight: 700, color: 'var(--text-light)' }}>
          共 {members.length} 位同事
        </div>
        <AnimatePresence>
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 24px',
                borderBottom: i < members.length - 1 ? '1px solid #F0F0F0' : 'none',
              }}
            >
              <div
                className="avatar"
                style={{ background: m.avatar_color }}
              >
                {m.name[0]}
              </div>

              {editingId === m.id ? (
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button className="btn-secondary" onClick={saveEdit} style={{ padding: '8px 16px' }}>
                    ✓
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '8px 16px' }}>
                    ✕
                  </button>
                </div>
              ) : editingScoreId === m.id ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                  <span style={{ fontSize: 13, color: 'var(--text-light)' }}>积分：</span>
                  <input
                    className="input"
                    type="number"
                    value={editScore}
                    onChange={e => setEditScore(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveScore()}
                    autoFocus
                    style={{ width: 80 }}
                  />
                  <button className="btn-secondary" onClick={saveScore} style={{ padding: '8px 16px' }}>
                    ✓
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingScoreId(null)} style={{ padding: '8px 16px' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                      积分 {m.total_score} · 发言 {m.speak_count} 次
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => startEditScore(m)}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    🎯 改分
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => startEdit(m)}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => deleteMember(m.id, m.name)}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    🗑️ 删除
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {members.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-light)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👻</div>
            <p>还没有同事，快添加一些吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}
