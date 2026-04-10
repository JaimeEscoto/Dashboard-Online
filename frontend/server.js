import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5173;
const API_BASE_URL = process.env.API_BASE_URL || 'https://dashboard-online-be.onrender.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.__API_BASE_URL__ = ${JSON.stringify(API_BASE_URL)};`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend iniciado en http://localhost:${PORT}`);
});
