with open('src/app/api/especialidad-deficit/route.ts', 'r', encoding='utf-8') as f:
    c = f.read()

target = '''function runSqlite(sql: string, dbPath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/sqlite3', ['-json', dbPath, sql], { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('SQLite exec error:', err, stderr);
        return reject(err);
      }
      try {
        const text = stdout.trim();
        if (!text) return resolve([]);
        const data = JSON.parse(text);
        resolve(data);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}'''

replacement = '''let cachedDb: any = null;

function getDatabase(dbPath: string) {
  if (!cachedDb) {
    try {
      // Dynamic require of native node:sqlite (available in Node 22+ / Vercel without external packages or C++ build tools)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite');
      cachedDb = new DatabaseSync(dbPath, { open: true, readOnly: true });
    } catch (e) {
      console.warn('node:sqlite DatabaseSync initialization error:', e);
    }
  }
  return cachedDb;
}

async function runSqlite(sql: string, dbPath: string): Promise<any[]> {
  try {
    const db = getDatabase(dbPath);
    if (db) {
      const stmt = db.prepare(sql);
      return stmt.all();
    }
  } catch (dbErr) {
    console.warn('DatabaseSync query failed, attempting CLI fallback:', dbErr);
  }

  // CLI fallback para entornos locales que dispongan del comando sqlite3 en PATH
  const bin = process.platform === 'win32' ? 'sqlite3' : 'sqlite3';
  return new Promise((resolve, reject) => {
    execFile(bin, ['-json', dbPath, sql], { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('SQLite exec fallback error:', err, stderr);
        return reject(err);
      }
      try {
        const text = stdout.trim();
        if (!text) return resolve([]);
        const data = JSON.parse(text);
        resolve(data);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}'''

assert target in c, "target no encontrado en especialidad-deficit/route.ts"
c = c.replace(target, replacement, 1)

with open('src/app/api/especialidad-deficit/route.ts', 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: especialidad-deficit/route.ts patched successfully")
