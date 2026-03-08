import express from 'express';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { getSalsaTrivia } from './services/geminiService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPzkZUS_fjliAVsX9WeRhmoA1lpcDgPzgtxrW_y1PIkJbLg0yJOobmWKJNQMftxVypjdB53z6FKp2c-SxB3I1FY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'KVXvkbpGdpbr-AzyZcGFVOyLN-D5KV7eXdr64DMN32s';

webpush.setVapidDetails(
  'mailto:info@mundialdesalsa.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(bodyParser.json());

  let subscriptions: any[] = [];

  // --- 1. RUTAS DE LA API (Prioridad Máxima) ---
  
  app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
    }
    res.status(201).json({ message: 'Subscribed successfully' });
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

  const broadcastNotification = (title: string, body: string) => {
    const payload = JSON.stringify({ 
      title, 
      body, 
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      data: { url: 'https://radio.mundialdesalsa.com' }
    });

    subscriptions.forEach(subscription => {
      webpush.sendNotification(subscription, payload).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
        }
      });
    });
  };

  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Iniciando generación de trivia horaria...');
    try {
      const triviaFresh = await getSalsaTrivia();
      broadcastNotification("¡Sabías que de la Salsa!", triviaFresh);
      console.log('[CRON] Notificación horaria enviada con éxito.');
    } catch (error) {
      console.error('[CRON] Error enviando trivia horaria:', error);
    }
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
