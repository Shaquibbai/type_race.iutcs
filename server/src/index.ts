import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { competitionRouter } from './routes/competition.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = '127.0.0.1'; // Strictly bind to localhost for security and offline event use

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'type-race-competition-server',
    timestamp: new Date().toISOString()
  });
});

// Competition routes
app.use('/api/competition', competitionRouter);

// Serve static build files if available (in production mode)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[TYPE//RACE Server] Running at http://${HOST}:${PORT}`);
  console.log(`[TYPE//RACE Server] Health check available at http://${HOST}:${PORT}/api/health`);
});

export default server;
