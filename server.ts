import express from 'express';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { getSalsaTrivia } from './services/geminiService';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate VAPID keys - require them in production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in environment variables');
}

webpush.setVapidDetails(
  'mailto:info@mundialdesalsa.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Initialize SQLite database for persistent storage
const db = new Database('subscriptions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_notification DATETIME
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0
  )
`);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(bodyParser.json({ limit: '1mb' }));

  // --- 1. RUTAS DE LA API (Prioridad Máxima) ---
  
  // Validate subscription input schema
  function validateSubscription(sub: any): boolean {
    if (!sub || typeof sub !== 'object') return false;
    if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('http')) return false;
    if (!sub.keys || typeof sub.keys !== 'object') return false;
    if (typeof sub.keys.p256dh !== 'string' || sub.keys.p256dh.length < 10) return false;
    if (typeof sub.keys.auth !== 'string' || sub.keys.auth.length < 10) return false;
    return true;
  }

  app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    
    // Input validation
    if (!validateSubscription(subscription)) {
      return res.status(400).json({ error: 'Invalid subscription format' });
    }
    
    try {
      // Insert or ignore duplicate subscriptions in database
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO subscriptions (endpoint, keys_p256dh, keys_auth)
        VALUES (?, ?, ?)
      `);
      stmt.run(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
      
      res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.get('/api/salsa-trivia', async (req, res) => {
    try {
      const trivia = await getSalsaTrivia();
      // Forzamos el envío como JSON para que el navegador no se confunda
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ trivia });
    } catch (error) {
      console.error('Error obteniendo trivia:', error);
      res.status(500).json({ error: 'No se pudo obtener la cultura salsera' });
    }
  });

  // --- 2. FUNCIÓN DE NOTIFICACIONES Y CRON JOB ---

  const broadcastNotification = async (title: string, body: string) => {
    const payload = JSON.stringify({ 
      title, 
      body, 
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      data: { url: 'https://radio.mundialdesalsa.com' }
    });

    // Get all subscriptions from database
    const stmt = db.prepare('SELECT * FROM subscriptions');
    const subscriptions = stmt.all() as any[];
    
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };
      
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
        // Update last_notification timestamp
        db.prepare('UPDATE subscriptions SET last_notification = CURRENT_TIMESTAMP WHERE id = ?').run(sub.id);
      } catch (err: any) {
        failureCount++;
        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM subscriptions WHERE id = ?').run(sub.id);
        }
      }
    }

    // Log notification results
    db.prepare(`
      INSERT INTO notifications_log (title, body, success_count, failure_count)
      VALUES (?, ?, ?, ?)
    `).run(title, body, successCount, failureCount);

    console.log(`[NOTIFICATION] "${title}": ${successCount} sent, ${failureCount} failed`);
  };

  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Iniciando generación de trivia horaria...');
    try {
      const triviaFresh = await getSalsaTrivia();
      await broadcastNotification("¡Sabías que de la Salsa!", triviaFresh);
      console.log('[CRON] Notificación horaria enviada con éxito.');
    } catch (error) {
      console.error('[CRON] Error enviando trivia horaria:', error);
    }
  });

  // Graceful shutdown for database
  process.on('SIGINT', () => {
    console.log('Closing database...');
    db.close();
    process.exit(0);
  });

  // --- 3. MIDDLEWARE DE VITE / PRODUCCIÓN (Al Final) ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Servir archivos estáticos de la carpeta dist
    app.use(express.static(path.join(__dirname, 'dist')));

    // Solo si la ruta NO empieza por /api/, enviamos el index.html
    app.get(/^(?!\/api).+/, (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
    
    // Backup para la ruta raíz
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radio Server running on http://localhost:${PORT}`);
  });
}

startServer();
