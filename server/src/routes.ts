import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './database';
import { getRandomScore, getRandomEncouragement } from './encouragements';

const router = Router();

// ============ Members ============

// Get all members
router.get('/members', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('total_score', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Add a member
router.post('/members', async (req: Request, res: Response) => {
  const { name, avatar_color } = req.body;
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

  const id = uuidv4();
  const color = avatar_color || getRandomColor();

  const { error } = await supabase
    .from('members')
    .insert({ id, name, avatar_color: color });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  res.status(201).json(member);
});

// Update a member
router.put('/members/:id', async (req: Request, res: Response) => {
  const { name, avatar_color } = req.body;
  const { id } = req.params;

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (avatar_color !== undefined) updates.avatar_color = avatar_color;

  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  res.json(member);
});

// Delete a member
router.delete('/members/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  await supabase.from('speak_records').delete().eq('member_id', id);

  const { data, error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .select();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data || data.length === 0) { res.status(404).json({ error: 'Member not found' }); return; }
  res.json({ success: true });
});

// Batch import members
router.post('/members/batch', async (req: Request, res: Response) => {
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: 'Names array is required' });
    return;
  }

  const rows = names
    .filter((n: string) => n.trim())
    .map((n: string) => ({
      id: uuidv4(),
      name: n.trim(),
      avatar_color: getRandomColor(),
    }));

  const { error } = await supabase.from('members').insert(rows);
  if (error) { res.status(500).json({ error: error.message }); return; }

  const result = rows.map(r => ({ ...r, total_score: 0, speak_count: 0 }));
  res.status(201).json(result);
});

// ============ Draw (Random Pick) ============

router.post('/draw', async (_req: Request, res: Response) => {
  const { data: members, error } = await supabase
    .from('members')
    .select('*');

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!members || members.length === 0) {
    res.status(400).json({ error: 'No members available' });
    return;
  }

  // Get today's speak records for weight calculation
  const today = new Date().toISOString().split('T')[0];
  const { data: todayRecords } = await supabase
    .from('speak_records')
    .select('member_id')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`);

  const todaySpeakMap = new Map<string, number>();
  (todayRecords || []).forEach((r: any) => {
    todaySpeakMap.set(r.member_id, (todaySpeakMap.get(r.member_id) || 0) + 1);
  });

  // Calculate weights: base weight 1.0, halved for each time spoken today
  const weighted = members.map(m => {
    const timesSpoken = todaySpeakMap.get(m.id) || 0;
    const weight = Math.pow(0.5, timesSpoken);
    return { member: m, weight };
  });

  // Check if all have spoken - reset weights if so
  const allSpoken = weighted.every(w => w.weight < 1);
  if (allSpoken) {
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

  res.json({
    selected,
    allMembers: members.map(m => ({ id: m.id, name: m.name, avatar_color: m.avatar_color })),
  });
});

// ============ Score ============

router.post('/score', async (req: Request, res: Response) => {
  const { member_id } = req.body;
  if (!member_id) { res.status(400).json({ error: 'member_id is required' }); return; }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', member_id)
    .single();

  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }

  const score = getRandomScore();
  const encouragement = getRandomEncouragement();
  const id = uuidv4();

  const { error: insertErr } = await supabase
    .from('speak_records')
    .insert({ id, member_id, score, encouragement });

  if (insertErr) { res.status(500).json({ error: insertErr.message }); return; }

  const { error: updateErr } = await supabase
    .from('members')
    .update({
      total_score: member.total_score + score,
      speak_count: member.speak_count + 1,
    })
    .eq('id', member_id);

  if (updateErr) { res.status(500).json({ error: updateErr.message }); return; }

  const { data: updated } = await supabase
    .from('members')
    .select('*')
    .eq('id', member_id)
    .single();

  res.json({ score, encouragement, member: updated });
});

// ============ Leaderboard ============

router.get('/leaderboard', async (req: Request, res: Response) => {
  const period = req.query.period as string || 'all';

  if (period === 'all') {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('total_score', { ascending: false });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } else {
    let daysAgo = 7;
    if (period === 'month') daysAgo = 30;

    const since = new Date();
    since.setDate(since.getDate() - daysAgo);
    const sinceStr = since.toISOString();

    // Get speak records within the period
    const { data: records, error: recErr } = await supabase
      .from('speak_records')
      .select('member_id, score')
      .gte('created_at', sinceStr);

    if (recErr) { res.status(500).json({ error: recErr.message }); return; }

    // Aggregate scores per member
    const scoreMap = new Map<string, { total_score: number; speak_count: number }>();
    (records || []).forEach((r: any) => {
      const existing = scoreMap.get(r.member_id) || { total_score: 0, speak_count: 0 };
      existing.total_score += r.score;
      existing.speak_count += 1;
      scoreMap.set(r.member_id, existing);
    });

    // Get all members
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('*');

    if (memErr) { res.status(500).json({ error: memErr.message }); return; }

    const result = (members || []).map(m => ({
      ...m,
      total_score: scoreMap.get(m.id)?.total_score || 0,
      speak_count: scoreMap.get(m.id)?.speak_count || 0,
    }));

    result.sort((a, b) => b.total_score - a.total_score);
    res.json(result);
  }
});

// ============ History ============

router.get('/history', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('speak_records')
    .select('*, members(name, avatar_color)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Flatten the joined data to match the original format
  const records = (data || []).map((r: any) => ({
    id: r.id,
    member_id: r.member_id,
    score: r.score,
    encouragement: r.encouragement,
    created_at: r.created_at,
    member_name: r.members?.name,
    avatar_color: r.members?.avatar_color,
  }));

  res.json(records);
});

// ============ Reset all scores ============
router.post('/reset-scores', async (_req: Request, res: Response) => {
  const { error: recErr } = await supabase
    .from('speak_records')
    .delete()
    .neq('id', '');

  if (recErr) { res.status(500).json({ error: recErr.message }); return; }

  const { error: memErr } = await supabase
    .from('members')
    .update({ total_score: 0, speak_count: 0 })
    .neq('id', '');

  if (memErr) { res.status(500).json({ error: memErr.message }); return; }
  res.json({ success: true });
});

// ============ Bonus score for a member ============
router.post('/members/:id/bonus', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bonus } = req.body;

  if (bonus === undefined || typeof bonus !== 'number' || bonus <= 0) {
    res.status(400).json({ error: 'bonus is required and must be a positive number' });
    return;
  }

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }

  const { error } = await supabase
    .from('members')
    .update({ total_score: member.total_score + bonus })
    .eq('id', id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const { data: updated } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  res.json(updated);
});

// ============ Reset today's weights ============
router.post('/reset-weights', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('speak_records')
    .delete()
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// Helper
const COLORS = ['#FF6B35', '#F7C948', '#2EC4B6', '#E71D36', '#7B68EE', '#FF69B4', '#20B2AA', '#FF8C00', '#9370DB', '#3CB371'];
function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default router;
