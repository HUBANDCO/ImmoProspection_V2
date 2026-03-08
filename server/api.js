/**
 * API backend pour les données DVF avec pagination et filtres
 * Utilisé en dev (middleware Vite) et en preview (serveur Express)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import proj4 from 'proj4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../public/data/properties.json');
const INSEE_PATH = path.join(__dirname, '../public/data/insee_carreaux_paris.json');
const ZONE_BBOX_PATH = path.join(__dirname, '../public/data/zone_bbox_paris.json');

let cachedData = null;
let cachedInsee = null;
let cachedZoneBbox = null;

/** EPSG:3035 (ETRS89-extended / LAEA Europe) vers WGS84 */
proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs');

function parseIdInspireToBbox(idInspire, cellSizeM = 200) {
  const m = String(idInspire || '').match(/N(\d+)E(\d+)$/i);
  if (!m) return null;
  const northing = Number(m[1]);
  const easting = Number(m[2]);
  try {
    const [lon1, lat1] = proj4('EPSG:3035', 'WGS84', [easting, northing]);
    const [lon2, lat2] = proj4('EPSG:3035', 'WGS84', [easting + cellSizeM, northing + cellSizeM]);
    return { minLat: Math.min(lat1, lat2), maxLat: Math.max(lat1, lat2), minLon: Math.min(lon1, lon2), maxLon: Math.max(lon1, lon2) };
  } catch {
    return null;
  }
}

function buildZoneBboxFromCarreaux(carreaux) {
  const zones = {};
  for (const c of carreaux) {
    const zid = String(c.id_carr1km || '').trim();
    if (!zid) continue;
    const bbox = parseIdInspireToBbox(c.id);
    if (!bbox) continue;
    if (!zones[zid]) {
      zones[zid] = { ...bbox };
    } else {
      const z = zones[zid];
      z.minLat = Math.min(z.minLat, bbox.minLat);
      z.maxLat = Math.max(z.maxLat, bbox.maxLat);
      z.minLon = Math.min(z.minLon, bbox.minLon);
      z.maxLon = Math.max(z.maxLon, bbox.maxLon);
    }
  }
  return zones;
}

function loadZoneBbox() {
  if (cachedZoneBbox) return cachedZoneBbox;
  try {
    const raw = fs.readFileSync(ZONE_BBOX_PATH, 'utf-8');
    cachedZoneBbox = JSON.parse(raw);
    return cachedZoneBbox;
  } catch {
    const carreaux = loadInseeCarreaux();
    if (Array.isArray(carreaux) && carreaux.length > 0) {
      cachedZoneBbox = buildZoneBboxFromCarreaux(carreaux);
      return cachedZoneBbox;
    }
    cachedZoneBbox = {};
    return cachedZoneBbox;
  }
}

function loadProperties() {
  if (cachedData) return cachedData;
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    cachedData = JSON.parse(raw);
    return cachedData;
  } catch (err) {
    console.error('Erreur chargement properties.json:', err.message);
    return [];
  }
}

function filterProperties(data, query) {
  let result = [...data];

  if (query.code_postal) {
    const cp = String(query.code_postal).trim();
    result = result.filter((p) => String(p.code_postal || '').trim() === cp);
  }

  if (query.ville) {
    const ville = String(query.ville).toLowerCase().trim();
    result = result.filter((p) => {
      const pVille = String(p.ville || '').toLowerCase();
      if (ville === 'paris') return pVille.startsWith('paris');
      return pVille.includes(ville);
    });
  }

  if (query.type_bien) {
    const type = String(query.type_bien).toLowerCase().trim();
    result = result.filter((p) =>
      String(p.libtypbien || '').toLowerCase().includes(type)
    );
  }

  if (query.prix_min) {
    const min = Number(query.prix_min);
    result = result.filter((p) => (p.valeurfonc ?? 0) >= min);
  }

  if (query.prix_max) {
    const max = Number(query.prix_max);
    result = result.filter((p) => (p.valeurfonc ?? 0) <= max);
  }

  if (query.annee_min) {
    const min = Number(query.annee_min);
    result = result.filter((p) => {
      const year = p.datemut ? new Date(p.datemut).getFullYear() : 0;
      return year >= min;
    });
  }

  if (query.annee_max) {
    const max = Number(query.annee_max);
    result = result.filter((p) => {
      const year = p.datemut ? new Date(p.datemut).getFullYear() : 0;
      return year <= max;
    });
  }

  // Filtre par zone/IRIS (id_carr1km) : propriétés dont lat/lon dans la bbox de la zone
  if (query.id_carr1km) {
    const zoneId = String(query.id_carr1km).trim();
    if (zoneId) {
      const zoneBbox = loadZoneBbox();
      const bbox = zoneBbox[zoneId];
      if (bbox) {
        const { minLat, maxLat, minLon, maxLon } = bbox;
        result = result.filter((p) => {
          const lat = Number(p.latitude);
          const lon = Number(p.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
          return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
        });
      }
    }
  }

  // Filtre sections cadastrales (selected_sections envoyé en JSON)
  if (query.selected_sections) {
    try {
      const sections = JSON.parse(query.selected_sections);
      const entries = Object.entries(sections).filter(
        ([sec]) => sec && String(sec).trim()
      );
      if (entries.length > 0) {
        result = result.filter((p) => {
          const pSections = p.l_section || [];
          return entries.some(([section, parcelles]) => {
            if (!pSections.includes(section)) return false;
            const parcellesList = Array.isArray(parcelles) ? parcelles : [];
            if (parcellesList.length === 0) return true;
            const nbpar = String(p.nbpar || '').trim();
            return parcellesList.some((np) => String(np).trim() === nbpar);
          });
        });
      }
    } catch (_) {}
  }

  return result;
}

/**
 * Déduplique par id_mutation : une vente peut avoir plusieurs parcelles.
 * Retourne une ligne par mutation avec valeurfonc = somme des parcelles.
 */
function deduplicateByMutation(data) {
  const byMutation = new Map();
  for (const p of data) {
    const mid = p.id_mutation || p.id?.split('_')[0] || p.id;
    if (!byMutation.has(mid)) {
      byMutation.set(mid, { items: [], totalValue: 0 });
    }
    const group = byMutation.get(mid);
    group.items.push(p);
    group.totalValue += Number(p.valeurfonc) || 0;
  }
  return Array.from(byMutation.values()).map((g) => {
    const first = g.items[0];
    return { ...first, valeurfonc: g.totalValue };
  });
}

function sortProperties(data, sortBy, sortOrder) {
  const arr = [...data];
  const order = sortOrder === 'asc' ? 1 : -1;

  arr.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === 'valeurfonc') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }
    if (sortBy === 'datemut') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    if (aVal > bVal) return order;
    if (aVal < bVal) return -order;
    return 0;
  });

  return arr;
}

export function handlePropertiesApi(req, res, query) {
  const data = loadProperties();

  const filtered = filterProperties(data, query);
  const deduplicated = deduplicateByMutation(filtered);
  const sortBy = query.sort_by || 'datemut';
  const sortOrder = String(query.sort_order || 'desc').toLowerCase();
  const sorted = sortProperties(deduplicated, sortBy, sortOrder);

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const items = sorted.slice(offset, offset + limit);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(
    JSON.stringify({
      items,
      total,
      page,
      limit,
      totalPages,
    })
  );
}

export function handlePropertiesByIdsApi(req, res, ids) {
  if (!ids || ids.length === 0) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([]));
    return;
  }
  const data = loadProperties();
  const idSet = new Set(ids);
  const items = data.filter((p) => idSet.has(p.id));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(items));
}

export function handlePropertiesStatsApi(req, res, query) {
  const filtered = filterProperties(loadProperties(), query);
  const data = deduplicateByMutation(filtered);
  const total = data.length;
  const withPrice = data.filter((p) => p.valeurfonc != null && p.valeurfonc > 0);
  const totalValue = withPrice.reduce((s, p) => s + p.valeurfonc, 0);
  const avgPrice = withPrice.length ? totalValue / withPrice.length : 0;

  const byType = {};
  data.forEach((p) => {
    const t = p.libtypbien || 'Non renseigné';
    byType[t] = (byType[t] || 0) + 1;
  });

  const byPostal = {};
  data.forEach((p) => {
    const cp = p.code_postal || 'Non renseigné';
    byPostal[cp] = (byPostal[cp] || 0) + 1;
  });

  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      total,
      totalValue,
      avgPrice,
      byType,
      byPostal,
    })
  );
}

export function handlePropertiesMetaApi(req, res) {
  const data = loadProperties();

  // Pour Paris : ne proposer que "Paris" (les données ont "Paris 1er Arrondissement", etc.)
  const rawCities = [...new Set(data.map((p) => p.ville).filter(Boolean))];
  const cities = rawCities.every((v) => /^Paris\s/.test(v))
    ? ['Paris']
    : [...new Set(rawCities)].sort();
  const codePostals = [...new Set(data.map((p) => p.code_postal).filter(Boolean))].sort();
  const types = [...new Set(data.map((p) => p.libtypbien).filter(Boolean))].sort();

  const prices = data.map((p) => p.valeurfonc).filter((v) => v != null && v > 0);
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < minPrice) minPrice = prices[i];
    if (prices[i] > maxPrice) maxPrice = prices[i];
  }
  const priceRange = {
    min: prices.length ? minPrice : 0,
    max: prices.length ? maxPrice : 0,
  };

  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      total: data.length,
      cities,
      codePostals,
      types,
      priceRange,
    })
  );
}

function loadInseeCarreaux() {
  if (cachedInsee) return cachedInsee;
  try {
    const raw = fs.readFileSync(INSEE_PATH, 'utf-8');
    cachedInsee = JSON.parse(raw);
    return cachedInsee;
  } catch (err) {
    console.error('Erreur chargement insee_carreaux_paris.json:', err.message);
    return [];
  }
}

export function handleInseeCarreauxApi(req, res, query) {
  const data = loadInseeCarreaux();
  let result = [...data];

  if (query.code_postal) {
    const cp = String(query.code_postal).trim();
    result = result.filter((c) => String(c.code_postal || '').trim() === cp);
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 100));
  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const items = result.slice(offset, offset + limit);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(
    JSON.stringify({
      items,
      total,
      page,
      limit,
      totalPages,
    })
  );
}

export function handleInseeZonesApi(req, res, query) {
  const data = loadInseeCarreaux();
  let result = [...data];
  if (query.code_postal) {
    const cp = String(query.code_postal).trim();
    result = result.filter((c) => String(c.code_postal || '').trim() === cp);
  }
  const zones = [...new Set(result.map((c) => c.id_carr1km).filter(Boolean))].sort();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify({ zones }));
}

export function handleInseeCarreauxStatsApi(req, res, query) {
  const data = loadInseeCarreaux();
  let result = [...data];

  if (query.code_postal) {
    const cp = String(query.code_postal).trim();
    result = result.filter((c) => String(c.code_postal || '').trim() === cp);
  }

  if (query.id_carr1km) {
    const zone = String(query.id_carr1km).trim();
    result = result.filter((c) => String(c.id_carr1km || '').trim() === zone);
  }

  const totalCarreaux = result.length;
  const totalInd = result.reduce((s, c) => s + (c.ind || 0), 0);
  const totalMen = result.reduce((s, c) => s + (c.men || 0), 0);
  const totalMenPauv = result.reduce((s, c) => s + (c.men_pauv || 0), 0);
  const totalMenProp = result.reduce((s, c) => s + (c.men_prop || 0), 0);
  const totalLogSoc = result.reduce((s, c) => s + (c.log_soc || 0), 0);
  const totalMenSurf = result.reduce((s, c) => s + (c.men_surf || 0), 0);
  const totalIndSnv = result.reduce((s, c) => s + (c.ind_snv || 0), 0);
  const avgNiveauVie = totalInd > 0 ? totalIndSnv / totalInd : 0;

  const byPostal = {};
  result.forEach((c) => {
    const cp = c.code_postal || 'Non renseigné';
    if (!byPostal[cp]) byPostal[cp] = { carreaux: 0, ind: 0, men: 0, men_pauv: 0, log_soc: 0 };
    byPostal[cp].carreaux += 1;
    byPostal[cp].ind += c.ind || 0;
    byPostal[cp].men += c.men || 0;
    byPostal[cp].men_pauv += c.men_pauv || 0;
    byPostal[cp].log_soc += c.log_soc || 0;
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(
    JSON.stringify({
      totalCarreaux,
      totalInd,
      totalMen,
      totalMenPauv,
      totalMenProp,
      totalLogSoc,
      totalMenSurf,
      avgNiveauVie,
      byPostal,
    })
  );
}

function getAdresseBase(p) {
  const nr = String(p.nom_rue || '').trim();
  return p.adresse_base || (nr.includes(' (') ? nr.split(' (')[0].trim() : nr);
}

export function handlePropertyDetailApi(req, res, query) {
  const id = String(query.id || '').trim();
  if (!id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'id requis' }));
    return;
  }

  const data = loadProperties();
  const property = data.find((p) => p.id === id);
  if (!property) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Bien non trouvé' }));
    return;
  }

  const adresseBase = getAdresseBase(property);
  const codePostal = String(property.code_postal || '').trim();
  const ville = String(property.ville || '').trim();

  const transactions = data.filter((p) => {
    const ab = getAdresseBase(p);
    const cp = String(p.code_postal || '').trim();
    const v = String(p.ville || '').trim();
    return ab === adresseBase && cp === codePostal && v === ville;
  });

  transactions.sort((a, b) => {
    const da = a.datemut ? new Date(a.datemut) : 0;
    const db = b.datemut ? new Date(b.datemut) : 0;
    return db - da;
  });

  const inseeData = loadInseeCarreaux();
  const inseeCarreaux = inseeData.filter(
    (c) => String(c.code_postal || '').trim() === codePostal
  );

  const inseeStats = inseeCarreaux.length
    ? {
        totalCarreaux: inseeCarreaux.length,
        totalInd: inseeCarreaux.reduce((s, c) => s + (c.ind || 0), 0),
        totalMen: inseeCarreaux.reduce((s, c) => s + (c.men || 0), 0),
        totalMenPauv: inseeCarreaux.reduce((s, c) => s + (c.men_pauv || 0), 0),
        totalMenProp: inseeCarreaux.reduce((s, c) => s + (c.men_prop || 0), 0),
        totalLogSoc: inseeCarreaux.reduce((s, c) => s + (c.log_soc || 0), 0),
        totalMenSurf: inseeCarreaux.reduce((s, c) => s + (c.men_surf || 0), 0),
        totalIndSnv: inseeCarreaux.reduce((s, c) => s + (c.ind_snv || 0), 0),
        avgNiveauVie:
          inseeCarreaux.reduce((s, c) => s + (c.ind || 0), 0) > 0
            ? inseeCarreaux.reduce((s, c) => s + (c.ind_snv || 0), 0) /
              inseeCarreaux.reduce((s, c) => s + (c.ind || 0), 0)
            : 0,
      }
    : null;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(
    JSON.stringify({
      property,
      transactions,
      inseeCarreaux,
      inseeStats,
    })
  );
}
