import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.cwd(), 'inventario_data.json');

app.use(express.json({ limit: '50mb' }));

// Helper to read data safely
function readDb() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      archivos: {
        Inventario_General: [],
        Hogar: [],
        Fiesta: [],
        Ferreteria: [],
      },
      ultimo_guardado: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    } catch {
      return initial;
    }
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && parsed.archivos) {
      return parsed;
    }
    throw new Error('Formato de base de datos inválido');
  } catch (err) {
    console.error('Error reading primary DB:', err);
    // Check if backup exists
    const bakFile = DATA_FILE + '.bak';
    if (fs.existsSync(bakFile)) {
      try {
        const bakContent = fs.readFileSync(bakFile, 'utf-8');
        const bakParsed = JSON.parse(bakContent);
        if (bakParsed && bakParsed.archivos) {
          console.warn('[AI Studio] Restored database from backup file.');
          return bakParsed;
        }
      } catch {}
    }
    return { archivos: { Inventario_General: [] } };
  }
}

// Helper to write data atomically to prevent corruption on crash
function writeDb(data: any) {
  try {
    // 1. Create a backup of current database first
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak');
      } catch {}
    }

    // 2. Write to a temporary file first
    const tempFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');

    // 3. Rename atomically (atomic on POSIX/Linux)
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Error writing DB atomically:', err);
    return false;
  }
}

// CORS for local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Termux compatible API endpoints
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', server: 'Smart Scanner Industrial PRO Backend', termuxCompatible: true });
});

app.get('/api/cargar_todo', (req, res) => {
  const db = readDb();
  res.json(db);
});

app.post('/api/guardar_sesion', (req, res) => {
  const { nombre, items } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre de área requerido' });
  }

  const cleanName = String(nombre).trim().replace(/\s+/g, '_');
  const db = readDb();
  if (!db.archivos) db.archivos = {};
  db.archivos[cleanName] = Array.isArray(items) ? items : [];
  db.ultimo_guardado = new Date().toISOString();

  writeDb(db);
  res.json({ success: true, area: cleanName, count: db.archivos[cleanName].length });
});

const handleEliminarArea = (req: express.Request, res: express.Response) => {
  const nombre = req.body?.nombre || req.query?.nombre;
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre de área requerido' });
  }

  const cleanName = String(nombre).trim().replace(/\s+/g, '_');
  const db = readDb();
  if (db.archivos && db.archivos[cleanName]) {
    delete db.archivos[cleanName];
    db.ultimo_guardado = new Date().toISOString();
    writeDb(db);
  }

  res.json({ success: true, area: cleanName });
};

app.post('/api/eliminar_area', handleEliminarArea);
app.delete('/api/eliminar_area', handleEliminarArea);

// Endpoint to download entire raw database JSON as backup
app.get('/api/descargar_bd', (req, res) => {
  const db = readDb();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="inventario_respaldo.json"');
  res.send(JSON.stringify(db, null, 2));
});

// Endpoint to restore backup database JSON
app.post('/api/restaurar_bd', (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object' || !payload.archivos) {
    return res.status(400).json({ error: 'Estructura de respaldo inválida. Debe contener "archivos".' });
  }

  payload.ultimo_guardado = new Date().toISOString();
  const ok = writeDb(payload);
  if (ok) {
    res.json({ success: true, message: 'Base de datos restaurada correctamente', areas: Object.keys(payload.archivos) });
  } else {
    res.status(500).json({ error: 'Error al guardar la base de datos restaurada' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Scanner Pro] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
