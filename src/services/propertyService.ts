/**
 * Service de chargement des biens immobiliers (données DVF)
 * V2 : API backend avec pagination et filtres
 */

import type { Property } from '@/types';

const API_BASE = '/api';

export interface PropertiesMeta {
  total: number;
  cities: string[];
  codePostals: string[];
  types: string[];
  priceRange: { min: number; max: number };
}

export interface PropertiesPage {
  items: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoadPropertiesParams {
  page?: number;
  limit?: number;
  code_postal?: string;
  ville?: string;
  type_bien?: string;
  prix_min?: number;
  prix_max?: number;
  annee_min?: number;
  annee_max?: number;
  id_carr1km?: string;
  selected_sections?: Record<string, string[]>;
  sort_by?: 'datemut' | 'valeurfonc';
  sort_order?: 'asc' | 'desc';
}

export async function loadPropertiesMeta(): Promise<PropertiesMeta> {
  try {
    const res = await fetch(`${API_BASE}/properties/meta`);
    if (!res.ok) throw new Error('Meta non disponible');
    return res.json();
  } catch {
    return {
      total: 0,
      cities: [],
      codePostals: [],
      types: [],
      priceRange: { min: 0, max: 10_000_000 },
    };
  }
}

export interface PropertyDetailResponse {
  property: Property;
  transactions: Property[];
  inseeCarreaux: Array<Record<string, unknown>>;
  inseeStats: {
    totalCarreaux: number;
    totalInd: number;
    totalMen: number;
    totalMenPauv: number;
    totalMenProp: number;
    totalLogSoc: number;
    totalMenSurf: number;
    totalIndSnv: number;
    avgNiveauVie: number;
  } | null;
}

export async function loadPropertyDetail(id: string): Promise<PropertyDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/properties/detail?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function loadPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (ids.length === 0) return [];
  const search = new URLSearchParams({ ids: ids.join(',') });
  try {
    const res = await fetch(`${API_BASE}/properties?${search}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function loadPropertiesStats(params: LoadPropertiesParams = {}): Promise<{
  total: number;
  totalValue: number;
  avgPrice: number;
  byType: Record<string, number>;
  byPostal: Record<string, number>;
}> {
  const search = new URLSearchParams();
  if (params.code_postal) search.set('code_postal', params.code_postal);
  if (params.ville) search.set('ville', params.ville);
  if (params.type_bien) search.set('type_bien', params.type_bien);
  if (params.prix_min != null) search.set('prix_min', String(params.prix_min));
  if (params.prix_max != null) search.set('prix_max', String(params.prix_max));
  if (params.annee_min != null) search.set('annee_min', String(params.annee_min));
  if (params.annee_max != null) search.set('annee_max', String(params.annee_max));
  if (params.id_carr1km) search.set('id_carr1km', params.id_carr1km);
  try {
    const res = await fetch(`${API_BASE}/properties/stats?${search}`);
    if (!res.ok) throw new Error('Stats non disponibles');
    return res.json();
  } catch {
    return {
      total: 0,
      totalValue: 0,
      avgPrice: 0,
      byType: {},
      byPostal: {},
    };
  }
}

export async function loadPropertiesPage(
  params: LoadPropertiesParams = {},
  signal?: AbortSignal
): Promise<PropertiesPage> {
  const search = new URLSearchParams();

  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.code_postal) search.set('code_postal', params.code_postal);
  if (params.ville) search.set('ville', params.ville);
  if (params.type_bien) search.set('type_bien', params.type_bien);
  if (params.prix_min != null) search.set('prix_min', String(params.prix_min));
  if (params.prix_max != null) search.set('prix_max', String(params.prix_max));
  if (params.annee_min != null) search.set('annee_min', String(params.annee_min));
  if (params.annee_max != null) search.set('annee_max', String(params.annee_max));
  if (params.selected_sections && Object.keys(params.selected_sections).length > 0) {
    search.set('selected_sections', JSON.stringify(params.selected_sections));
  }
  if (params.sort_by) search.set('sort_by', params.sort_by);
  if (params.sort_order) search.set('sort_order', params.sort_order);

  try {
    const res = await fetch(`${API_BASE}/properties?${search}`, {
      signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!res.ok) throw new Error('Erreur API');
    return res.json();
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    };
  }
}
