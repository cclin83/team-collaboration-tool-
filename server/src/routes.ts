import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { getRandomScore, getRandomEncouragement } from './encouragements';

const router = Router();

// ============ Members ============

// Get all members
router.get('/members', (_req: Request, res: Response) => {
  const members = db.prepare('SELECT * FROM members ORDER BY total_score DESC').all();
  res.json(members);
});

// Add a member
router.post('/members', (req: Request, res: Response) => {
  const { name, avatar_color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const id = uuidv4();
  const color = avatar_color || getRandomColor();
  db.prepare('INSERT INTO members (id, name, avatar_color) VALUES (?, ?, ?)').run(id, name, color);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.status(201).json(member);
});

// Update a member
router.put('/members/:id', (req: Request, res: Response) => {
  const { name, avatar_color } = req.body;
  const { id } = req.params;
  db.prepare('UPDATE members SET name = COALESCE(?, name), avatar_color = COALESCE(?, avatar_color) WHERE id = ?')
    .run(name, avatar_color, id);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json(member);
});

// Delete a member
router.delete('/members/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM speak_records WHERE member_id = ?').run(id);
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json({ success: true });
});

// Batch import members
router.post('/members/batch', (req: Request, res: Response) => {
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: 'Names array is required' });
    return;
  }
  const insert = db.prepare('INSERT INTO members (id, name, avatar_color) VALUES (?, ?, ?)');
  const insertMany = db.transaction((nameList: string[]) => {
    const added = [];
    for (const name of nameList) {
      if (name.trim()) {
        const id = uuidv4();
        const color = getRandomColor();
        insert.run(id, name.trim(), color);
        added.push({ id, name: name.trim(), avatar_color: color, total_score: 0, speak_count: 0 });
      }
    }
    return added;
  });
  const result = insertMany(names);
  res.status(201).json(result);
});

// ============ Draw (Random Pick) ============

router.post('/draw', (_req: Request, res: Response) => {
  const members = db.prepare('SELECT * FROM members').all() as any[];
  if (members.length === 0) {
    res.status(400).json({ error: 'No members available' });
    return;
  }

  // Get today's speak records for weight calculation
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = db.prepare(
    "SELECT member_id, COUNT(*) as count FROM speak_records WHERE date(created_at) = ? GROUP BY member_id"
  ).all(today) as any[];

  const todaySpeakMap = new Map<string, number>();
  todayRecords.forEach((r: any) => todaySpeakMap.set(r.member_id, r.count));

  // Calculate weights: base weight 1.0, halved for each time spoken today
  const weighted = members.map(m => {
    const timesSpoken = todaySpeakMap.get(m.id) || 0;
    const weight = Math.pow(0.5, timesSpoken);
    return { member: m, weight };
  });

  // Check if all have spoken - reset weights if so
  const allSpoken = weighted.every(w => w.weight < 1);
  if (allSpoken) {
    // Find minimum speaks, give those people higher weight
    const minSpeaks = Math.min(...weighted.map(w => todaySpeakMap.get(w.member.id) || 0));
    weighted.forEach(w => {
      const timesSpoken = todaySpeakMap.get(w.member.id) || 0;
      w.weight = Math.pow(0.5, timesSpoken - minSpeaks);
    });
  }

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  let selected = weighted[0].member;
  for (const w of weighted) {
    random -= w.weight;
    if (random <= 0) {
      selected = w.member;
      break;
    }
  }

  // Return all members for the animation, with the selected one marked
  res.json({
    selected,
    allMembers: members.map(m => ({ id: m.id, name: m.name, avatar_color: m.avatar_color })),
  });
});

// ============ Score ============

router.post('/score', (req: Request, res: Response) => {
  const { member_id } = req.body;
  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id) as any;
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const score = getRandomScore();
  const encouragement = getRandomEncouragement();
  const id = uuidv4();

  db.prepare('INSERT INTO speak_records (id, member_id, score, encouragement) VALUES (?, ?, ?, ?)')
    .run(id, member_id, score, encouragement);

  db.prepare('UPDATE members SET total_score = total_score + ?, speak_count = speak_count + 1 WHERE id = ?')
    .run(score, member_id);

  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);

  res.json({ score, encouragement, member: updated });
});

// ============ Leaderboard ============

router.get('/leaderboard', (req: Request, res: Response) => {
  const period = req.query.period as string || 'all';

  let dateFilter = '';
  if (period === 'week') {
    dateFilter = "WHERE date(sr.created_at) >= date('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "WHERE date(sr.created_at) >= date('now', '-30 days')";
  }

  if (period === 'all') {
    const members = db.prepare(
      'SELECT * FROM members ORDER BY total_score DESC'
    ).all();
    res.json(members);
  } else {
    const members = db.prepare(`
      SELECT m.id, m.name, m.avatar_color, m.created_at,
        COALESCE(SUM(sr.score), 0) as total_score,
        COUNT(sr.id) as speak_count
      FROM members m
      LEFT JOIN speak_records sr ON m.id = sr.member_id
        ${dateFilter.replace('WHERE', 'AND')}
      GROUP BY m.id
      ORDER BY total_score DESC
    `).all();
    res.json(members);
  }
});

// ============ History ============

router.get('/history', (_req: Request, res: Response) => {
  const records = db.prepare(`
    SELECT sr.*, m.name as member_name, m.avatar_color
    FROM speak_records sr
    JOIN members m ON sr.member_id = m.id
    ORDER BY sr.created_at DESC
    LIMIT 100
  `).all();
  res.json(records);
});

// ============ Reset today's weights ============
router.post('/reset-weights', (_req: Request, res: Response) => {
  // Delete today's records to reset weights
  const today = new Date().toISOString().split('T')[0];
  db.prepare("DELETE FROM speak_records WHERE date(created_at) = ?").run(today);
  res.json({ success: true });
});

// Helper
const COLORS = ['#FF6B35', '#F7C948', '#2EC4B6', '#E71D36', '#7B68EE', '#FF69B4', '#20B2AA', '#FF8C00', '#9370DB', '#3CB371'];
function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default router;
