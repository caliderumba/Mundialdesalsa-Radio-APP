import express from 'express';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const PORT = 3000;

  app.use(bodyParser.json());

  // In-memory subscription storage (for demo purposes)
  let subscriptions: any[] = [];

  // API Routes
  app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    // Check if subscription already exists
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
          // Remove expired/invalid subscription
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
