type DbFallbackState = {
  unavailableUntil: number;
};

const globalForDbFallback = global as unknown as { dbFallbackState?: DbFallbackState };

const fallbackState =
  globalForDbFallback.dbFallbackState ||
  {
    unavailableUntil: 0,
  };

if (process.env.NODE_ENV !== 'production') {
  globalForDbFallback.dbFallbackState = fallbackState;
}

// 本地 JSON 仅用于开发。生产环境必须暴露数据库故障，避免把 /tmp 临时文件
// 误当成可靠持久化并向用户返回“保存成功”。
export const MEMORY_FALLBACK_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.ENABLE_MEMORY_DB_FALLBACK || 'true').toLowerCase() === 'true';

const devDatabaseMode = (process.env.DEV_DATABASE_MODE || 'local').toLowerCase();
const isDev = process.env.NODE_ENV !== 'production';
let hasLoggedDbMode = false;

const logDbModeOnce = () => {
  if (hasLoggedDbMode) return;
  hasLoggedDbMode = true;
  console.log(
    `[DBMode] nodeEnv=${process.env.NODE_ENV || 'development'} devDatabaseMode=${devDatabaseMode} memoryFallback=${MEMORY_FALLBACK_ENABLED}`,
  );
};

export const shouldPreferLocalDb = () =>
  isDev && devDatabaseMode !== 'remote';

export const isDbUnavailable = (error: any) =>
  error?.code === 'P1001' ||
  error?.message?.includes('does not exist') ||
  error?.code === 'P2010' ||
  /Can't reach database server/i.test(String(error?.message || '')) ||
  /Connection/i.test(String(error?.message || ''));

export const shouldUseLocalDb = () =>
  (() => {
    logDbModeOnce();
    return (
      MEMORY_FALLBACK_ENABLED &&
      (shouldPreferLocalDb() || fallbackState.unavailableUntil > Date.now())
    );
  })();

export const noteDbUnavailable = (error: any) => {
  if (!MEMORY_FALLBACK_ENABLED || !isDbUnavailable(error)) {
    return false;
  }

  const cooldownMs = Number(process.env.DB_FALLBACK_COOLDOWN_MS || 60_000);
  fallbackState.unavailableUntil = Date.now() + cooldownMs;
  return true;
};

export const clearDbUnavailable = () => {
  fallbackState.unavailableUntil = 0;
};
