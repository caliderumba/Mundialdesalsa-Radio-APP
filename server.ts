import express from 'express';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
// Importamos el servicio de Gemini que ya tienes creado
import { getSongLyrics } from './geminiService';

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

  // In-memory subscription storage
  let subscriptions: any[] = [];

  // --- RUTAS DE NOTIFICACIONES PUSH ---
  app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
    }
    res.status(201).json({ message: 'Subscribed successfully' });
  });

  app.post('/api/notify-all', (req, res) => {
    const { title, body, icon, url } = req.body;
    const payload = JSON.stringify({ title, body, icon, url });

    const notifications = subscriptions.map(subscription => {
      return webpush.sendNotification(subscription, payload).catch(err => {
        console.error('Error sending notification:', err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
        }
      });
    });

    Promise.all(notifications).then(() => {
      res.status(200).json({ message: 'Notifications sent' });
    });
  });

  app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // --- NUEVA RUTA: API PARA LETRAS (Cerebro de la App) ---
  app.post('/api/lyrics', async (req, res) => {
    const { title, artist } = req.body;
    
    if (!title || !artist) {
      return res.status(400).json({ error: 'Título y Artista son requeridos' });
    }

    try {
      // Llamamos a la función de tu geminiService.ts
      const lyrics = await getSongLyrics(title, artist);
      res.json({ lyrics });
    } catch (error) {
      console.error('Error procesando letras en el servidor:', error);
      res.status(500).json({ error: 'No se pudo obtener la letra de la IA' });
    }
  });

  // --- MIDDLEWARE DE VITE / PRODUCCIÓN ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radio Server running on http://localhost:${PORT}`);
  });
}

startServer();
