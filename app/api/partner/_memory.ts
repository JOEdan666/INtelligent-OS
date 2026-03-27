// Partner memory store for dev fallback when DB is unavailable

const globalForPartnerMemory = global as unknown as { partnerMemory?: PartnerMemoryDB; partnerMemoryFallback?: boolean };

const MEMORY_FALLBACK_ENABLED =
  (process.env.ENABLE_MEMORY_DB_FALLBACK || 'true').toLowerCase() === 'true';
const devDatabaseMode = (process.env.DEV_DATABASE_MODE || 'local').toLowerCase();
const isDev = process.env.NODE_ENV !== 'production';
let hasLoggedPartnerDbMode = false;

interface MemoryPartnerSession {
  id: string;
  mode: string;
  topic?: string | null;
  goal?: string | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  pageDomain?: string | null;
  contextSnippet?: string | null;
  recentSignalsJson?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryPartnerMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  contentJson?: string | null;
  citationsJson?: string | null;
  createdAt: Date;
}

interface MemoryPartnerAsset {
  id: string;
  sessionId: string;
  type: string;
  title: string;
  contentJson: string;
  actionItemsJson?: string | null;
  citationsJson?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

class PartnerMemoryDB {
  sessions: MemoryPartnerSession[] = [];
  messages: MemoryPartnerMessage[] = [];
  assets: MemoryPartnerAsset[] = [];

  createSession(data: any) {
    const now = new Date();
    const id = `mem_ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: MemoryPartnerSession = {
      id,
      mode: data.mode || 'Study',
      topic: data.topic || null,
      goal: data.goal || null,
      pageUrl: data.pageUrl || null,
      pageTitle: data.pageTitle || null,
      pageDomain: data.pageDomain || null,
      contextSnippet: data.contextSnippet || null,
      recentSignalsJson: data.recentSignalsJson || null,
      status: data.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.unshift(session);
    return session;
  }

  updateSession(id: string, data: any) {
    const index = this.sessions.findIndex(session => session.id === id);
    if (index === -1) return null;
    const existing = this.sessions[index];
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.sessions[index] = updated;
    return updated;
  }

  getSession(id: string) {
    return this.sessions.find(session => session.id === id) || null;
  }

  listSessions(filters: { query?: string; mode?: string; domain?: string }) {
    const query = filters.query?.toLowerCase();
    return this.sessions.filter(session => {
      if (filters.mode && session.mode !== filters.mode) return false;
      if (filters.domain && session.pageDomain !== filters.domain) return false;
      if (!query) return true;
      const messageHit = this.messages.some(msg => msg.sessionId === session.id && msg.content?.toLowerCase().includes(query));
      return (
        (session.topic || '').toLowerCase().includes(query) ||
        (session.goal || '').toLowerCase().includes(query) ||
        (session.pageTitle || '').toLowerCase().includes(query) ||
        (session.pageUrl || '').toLowerCase().includes(query) ||
        messageHit
      );
    });
  }

  addMessage(data: any) {
    const now = new Date();
    const id = `mem_pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message: MemoryPartnerMessage = {
      id,
      sessionId: data.sessionId,
      role: data.role,
      content: data.content || '',
      contentJson: data.contentJson || null,
      citationsJson: data.citationsJson || null,
      createdAt: now,
    };
    this.messages.push(message);
    return message;
  }

  addAsset(data: any) {
    const now = new Date();
    const id = `mem_pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const asset: MemoryPartnerAsset = {
      id,
      sessionId: data.sessionId,
      type: data.type,
      title: data.title,
      contentJson: data.contentJson || '{}',
      actionItemsJson: data.actionItemsJson || null,
      citationsJson: data.citationsJson || null,
      status: data.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.assets.push(asset);
    return asset;
  }

  updateSessionStatus(id: string, status: string) {
    return this.updateSession(id, { status });
  }

  updateAssetsStatus(sessionId: string, status: string) {
    this.assets = this.assets.map(asset =>
      asset.sessionId === sessionId && asset.status !== status
        ? { ...asset, status, updatedAt: new Date() }
        : asset
    );
  }

  deleteSession(id: string) {
    const index = this.sessions.findIndex(session => session.id === id);
    if (index === -1) return false;
    this.sessions.splice(index, 1);
    this.messages = this.messages.filter(message => message.sessionId !== id);
    this.assets = this.assets.filter(asset => asset.sessionId !== id);
    return true;
  }

  deleteAsset(id: string) {
    const index = this.assets.findIndex(asset => asset.id === id);
    if (index === -1) return false;
    this.assets.splice(index, 1);
    return true;
  }

  getSessionMessages(sessionId: string) {
    return this.messages.filter(message => message.sessionId === sessionId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getSessionAssets(sessionId: string) {
    return this.assets.filter(asset => asset.sessionId === sessionId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export function isDbUnavailable(error: any) {
  if (!error) return false;
  return (
    error.code === 'P1001' ||
    error.code === 'P2010' ||
    /Can't reach database server/i.test(String(error.message || '')) ||
    /Connection/i.test(String(error.message || ''))
  );
}

export function shouldUseMemory() {
  if (!MEMORY_FALLBACK_ENABLED) return false;

  if (!hasLoggedPartnerDbMode) {
    hasLoggedPartnerDbMode = true;
    console.log(
      `[PartnerDBMode] nodeEnv=${process.env.NODE_ENV || 'development'} devDatabaseMode=${devDatabaseMode} memoryFallback=${MEMORY_FALLBACK_ENABLED}`,
    );
  }

  const localFirst = isDev && devDatabaseMode !== 'remote';
  return localFirst || Boolean(globalForPartnerMemory.partnerMemoryFallback);
}

export function markMemoryFallback() {
  if (MEMORY_FALLBACK_ENABLED) {
    globalForPartnerMemory.partnerMemoryFallback = true;
  }
}

export const partnerMemory = globalForPartnerMemory.partnerMemory || new PartnerMemoryDB();

if (process.env.NODE_ENV !== 'production') {
  globalForPartnerMemory.partnerMemory = partnerMemory;
}
