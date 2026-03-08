/**
 * Serveur Express pour l'API en mode production/preview
 * Usage: node server/index.js
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  handlePropertiesApi,
  handlePropertiesMetaApi,
  handlePropertiesByIdsApi,
  handlePropertiesStatsApi,
  handleInseeCarreauxApi,
  handleInseeCarreauxStatsApi,
  handleInseeZonesApi,
  handlePropertyDetailApi,
} from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();

  if (isProd) {
    app.use(express.static(path.join(__dirname, '../dist')));
  }

  app.get('/api/properties', (req, res) => {
    const { ids, ...query } = req.query;
    if (ids) {
      const idList = (typeof ids === 'string' ? ids : '').split(',').map((s) => s.trim()).filter(Boolean);
      handlePropertiesByIdsApi(req, res, idList);
    } else {
      handlePropertiesApi(req, res, query);
    }
  });

  app.get('/api/properties/meta', (req, res) => {
    handlePropertiesMetaApi(req, res);
  });

  app.get('/api/properties/stats', (req, res) => {
    handlePropertiesStatsApi(req, res, req.query);
  });

  app.get('/api/properties/detail', (req, res) => {
    handlePropertyDetailApi(req, res, req.query);
  });

  app.get('/api/insee/zones', (req, res) => {
    handleInseeZonesApi(req, res, req.query);
  });

  app.get('/api/insee/carreaux', (req, res) => {
    handleInseeCarreauxApi(req, res, req.query);
  });

  app.get('/api/insee/carreaux/stats', (req, res) => {
    handleInseeCarreauxStatsApi(req, res, req.query);
  });

  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite);
  }

  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    console.log(`Serveur http://localhost:${port}`);
    if (!isProd) {
      console.log('API: /api/properties');
    }
  });
}

createServer().catch(console.error);
