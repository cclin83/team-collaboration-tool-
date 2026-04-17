const BASE = '/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export interface Member {
  id: string;
  name: string;
  avatar_color: string;
  total_score: number;
  speak_count: number;
  created_at: string;
}

export interface DrawResult {
  selected: Member;
  allMembers: { id: string; name: string; avatar_color: string }[];
}

export interface ScoreResult {
  score: number;
  encouragement: string;
  member: Member;
}

export interface SpeakRecord {
  id: string;
  member_id: string;
  member_name: string;
  avatar_color: string;
  score: number;
  encouragement: string;
  created_at: string;
}

export const api = {
  getMembers: (): Promise<Member[]> => request('/members'),
  addMember: (name: string, avatar_color?: string): Promise<Member> =>
    request('/members', { method: 'POST', body: JSON.stringify({ name, avatar_color }) }),
  updateMember: (id: string, data: Partial<Member>): Promise<Member> =>
    request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string): Promise<void> =>
    request(`/members/${id}`, { method: 'DELETE' }),
  batchImport: (names: string[]): Promise<Member[]> =>
    request('/members/batch', { method: 'POST', body: JSON.stringify({ names }) }),
  draw: (): Promise<DrawResult> =>
    request('/draw', { method: 'POST' }),
  giveScore: (member_id: string): Promise<ScoreResult> =>
    request('/score', { method: 'POST', body: JSON.stringify({ member_id }) }),
  getLeaderboard: (period: string = 'all'): Promise<Member[]> =>
    request(`/leaderboard?period=${period}`),
  getHistory: (): Promise<SpeakRecord[]> =>
    request('/history'),
  resetScores: (): Promise<void> =>
    request('/reset-scores', { method: 'POST' }),
  updateMemberScore: (id: string, total_score: number): Promise<Member> =>
    request(`/members/${id}/score`, { method: 'PUT', body: JSON.stringify({ total_score }) }),
};
