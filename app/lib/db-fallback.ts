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

export const MEMORY_FALLBACK_ENABLED =
  (process.env.ENABLE_MEMORY_DB_FALLBACK || 'true').toLowerCase() === 'true';

const devDatabaseMode = (process.env.DEV_DATABASE_MODE || 'local').toLowerCase();

export const shouldPreferLocalDb = () =>
  process.env.NODE_ENV !== 'production' && devDatabaseMode !== 'remote';

export const isDbUnavailable = (error: any) =>
  error?.code === 'P1001' ||
  error?.message?.includes('does not exist') ||
  error?.code === 'P2010' ||
  /Can't reach database server/i.test(String(error?.message || '')) ||
  /Connection/i.test(String(error?.message || ''));

export const shouldUseLocalDb = () =>
  MEMORY_FALLBACK_ENABLED &&
  (shouldPreferLocalDb() || fallbackState.unavailableUntil > Date.now());

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
