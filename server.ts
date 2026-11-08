import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.cwd(), 'inventario_data.json');

app.use(express.json({ limit: '50mb' }));

// Helper to read data
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { archivos: { Inventario_General: [] } };
  }
}

// Helper to write data
function writeDb(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// CORS for local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

app.post('/api/eliminar_area', (req, res) => {
  const { nombre } = req.body || {};
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
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
