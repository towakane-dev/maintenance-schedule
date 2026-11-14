export type User = { id: string; username: string; role: 'admin' | 'superadmin' };
export type UserRecord = User & { email: string | null; createdAt: string };
export type Asset = {
  id: string; code: string; name: string; category: string; company: string;
  area: string; location: string; brand: string; model: string; serial: string;
  year: string; owner: string; condition: string; notes: string;
};
export type Schedule = {
  id: string; assetId: string; code: string; machine: string; area: string;
  activity: string; type: string; frequency: string; due: string; pic: string; picEmail: string | null;
  completionNote: string | null;
  complete: boolean; finished: string | null; createdAt: string;
};
export type ActivityLog = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { username: string } | null;
};
export type Notification = { id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string; schedule: { code: string; machine: string; activity: string; due: string } };
export type PaginatedActivityLogs = { items: ActivityLog[]; total: number };

// Satu refresh berjalan bersamaan di antara banyak request yang gagal 401.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  refreshPromise ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(url: string, options?: RequestInit, retried = false): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (response.status === 401 && !retried && !url.startsWith('/api/auth/login') && !url.startsWith('/api/auth/refresh')) {
    if (await tryRefresh()) return request<T>(url, options, true);
  }
  // Respons bisa kosong/bukan JSON (mis. koneksi putus di tengah jalan atau error proxy) —
  // jangan biarkan response.json() melempar TypeError mentah ke UI.
  let body: { error?: string } | null = null;
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
  }
  if (!response.ok) throw new Error(body?.error || `Permintaan gagal (HTTP ${response.status}).`);
  return body as T;
}

export const api = {
  me: () => request<{ user: User }>('/api/auth/me'),
  login: (data: { username: string; password: string }) => request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  createUser: (data: { username: string; password: string; role: User['role']; email?: string }) => request<{ user: User }>('/api/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { username?: string; password?: string; role?: User['role']; email?: string }) => request<{ user: User }>(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<void>(`/api/auth/users/${id}`, { method: 'DELETE' }),
  users: () => request<UserRecord[]>('/api/auth/users'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  assets: () => request<Asset[]>('/api/assets'),
  schedules: () => request<Schedule[]>('/api/schedules'),
  activityLogs: (page = 1, limit = 10, filters: { user?: string; action?: string; entity?: string; from?: string; to?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return request<PaginatedActivityLogs>(`/api/activity-logs?${params.toString()}`);
  },
  notifications: () => request<Notification[]>('/api/notifications'),
  markNotificationRead: (id: string) => request<void>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<void>('/api/notifications/read-all', { method: 'PATCH' }),
  createAsset: (data: Omit<Asset, 'id'>) => request<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(data) }),
  importAssets: (data: Omit<Asset, 'id'>[]) => request<Asset[]>('/api/assets/import', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id: string, data: Partial<Omit<Asset, 'id'>>) => request<Asset>(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id: string) => request<void>(`/api/assets/${id}`, { method: 'DELETE' }),
  createSchedule: (data: { assetId: string; activity: string; type: string; frequency: string; due: string; pic: string; picEmail?: string | null; completionNote?: string | null; complete: boolean; finished: string | null }) => request<Schedule>('/api/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: Partial<Omit<Schedule, 'id' | 'code' | 'machine' | 'area' | 'assetId'>>) => request<Schedule>(`/api/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: string) => request<void>(`/api/schedules/${id}`, { method: 'DELETE' }),
  emailPicReminder: (id: string) => request<{ sent: boolean; to: string }>(`/api/schedules/${id}/email-pic`, { method: 'POST' }),
};
