const dns = require('dns');
const net = require('net');
const fs = require('fs');
const path = require('path');

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function maskUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

function parseConnection(raw) {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    protocol: parsed.protocol,
    database: parsed.pathname.replace(/^\//, ''),
  };
}

function dnsLookup(host) {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (error, address, family) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ address, family });
    });
  });
}

function tcpProbe(host, port, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('error', (error) => done(reject, error));
    socket.once('timeout', () => done(reject, new Error('TCP timeout')));
    socket.connect(port, host, () => done(resolve, true));
  });
}

async function main() {
  // Align with local next dev loading order.
  loadEnvFile('.env');
  loadEnvFile('.env.local');

  const mode = (process.env.DEV_DATABASE_MODE || 'local').toLowerCase();
  const fallbackEnabled = (process.env.ENABLE_MEMORY_DB_FALLBACK || 'true').toLowerCase();
  const dbUrl = process.env.DATABASE_URL;

  console.log(`[db:check] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[db:check] DEV_DATABASE_MODE=${mode}`);
  console.log(`[db:check] ENABLE_MEMORY_DB_FALLBACK=${fallbackEnabled}`);

  if (!dbUrl) {
    console.log('[db:check] DATABASE_URL is not set.');
    process.exit(0);
  }

  let conn;
  try {
    conn = parseConnection(dbUrl);
  } catch (error) {
    console.error(`[db:check] Invalid DATABASE_URL: ${error.message}`);
    process.exit(1);
  }

  console.log(`[db:check] DATABASE_URL=${maskUrl(dbUrl)}`);
  console.log(`[db:check] target=${conn.protocol}//${conn.host}:${conn.port}/${conn.database}`);

  try {
    const dnsResult = await dnsLookup(conn.host);
    console.log(`[db:check] DNS OK: ${conn.host} -> ${dnsResult.address} (IPv${dnsResult.family})`);
  } catch (error) {
    console.error(`[db:check] DNS FAILED: ${error.message}`);
    process.exit(2);
  }

  try {
    await tcpProbe(conn.host, conn.port);
    console.log(`[db:check] TCP OK: ${conn.host}:${conn.port}`);
    process.exit(0);
  } catch (error) {
    console.error(`[db:check] TCP FAILED: ${error.message}`);
    process.exit(3);
  }
}

main().catch((error) => {
  console.error(`[db:check] Unexpected error: ${error.message}`);
  process.exit(9);
});
