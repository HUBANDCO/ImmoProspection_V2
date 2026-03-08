/**
 * Plugin Vite : API backend pour /api/properties
 * Évite de lancer un serveur séparé en dev
 */

import {
  handlePropertiesApi,
  handlePropertiesMetaApi,
  handlePropertiesByIdsApi,
  handlePropertiesStatsApi,
  handleInseeCarreauxApi,
  handleInseeCarreauxStatsApi,
  handleInseeZonesApi,
  handlePropertyDetailApi,
} from './server/api.js';

export function apiPlugin() {
  return {
    name: 'api-plugin',
    enforce: 'pre', // S'exécute avant les middlewares Vite pour éviter les conflits
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        if (req.method === 'GET') {
          const url = new URL('/api' + req.url, `http://${req.headers.host}`);
          const query = Object.fromEntries(url.searchParams);

          if (req.url?.startsWith('/insee')) {
            if (url.pathname === '/api/insee/zones') {
              handleInseeZonesApi(req, res, query);
            } else if (url.pathname === '/api/insee/carreaux/stats') {
              handleInseeCarreauxStatsApi(req, res, query);
            } else if (req.url?.startsWith('/insee/carreaux')) {
              handleInseeCarreauxApi(req, res, query);
            } else {
              next();
            }
            return;
          }
          if (req.url?.startsWith('/properties')) {
            if (url.pathname === '/api/properties/detail') {
              handlePropertyDetailApi(req, res, query);
              return;
            }
            if (url.pathname === '/api/properties/meta') {
              handlePropertiesMetaApi(req, res);
            } else if (url.pathname === '/api/properties/stats') {
              handlePropertiesStatsApi(req, res, query);
            } else if (query.ids) {
              const ids = query.ids.split(',').map((s) => s.trim()).filter(Boolean);
              handlePropertiesByIdsApi(req, res, ids);
            } else {
              handlePropertiesApi(req, res, query);
            }
            return;
          }
        }
        next();
      });
    },
  };
}
