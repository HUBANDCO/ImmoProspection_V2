/**
 * Service pour les données INSEE carreaux 200m (FiLoSoFi 2015)
 * Source : https://www.insee.fr/fr/statistiques/4176290
 */

const API_BASE = '/api';

export interface InseeCarreau {
  id: string;
  depcom: string;
  code_postal: string;
  id_carr1km: string;
  ind: number;
  men: number;
  men_pauv: number;
  men_prop: number;
  men_1ind: number;
  men_5ind: number;
  men_fmp: number;
  men_coll: number;
  men_mais: number;
  men_surf: number;
  ind_snv: number;
  log_av45: number;
  log_45_70: number;
  log_70_90: number;
  log_ap90: number;
  log_inc: number;
  log_soc: number;
  i_est_cr: number;
  i_est_1km: number;
}

export interface InseeCarreauxStats {
  totalCarreaux: number;
  totalInd: number;
  totalMen: number;
  totalMenPauv: number;
  totalMenProp: number;
  totalLogSoc: number;
  totalMenSurf: number;
  avgNiveauVie: number;
  byPostal: Record<
    string,
    { carreaux: number; ind: number; men: number; men_pauv: number; log_soc: number }
  >;
}

export async function loadInseeZones(params?: {
  code_postal?: string;
}): Promise<{ zones: string[] }> {
  const search = new URLSearchParams();
  if (params?.code_postal) search.set('code_postal', params.code_postal);
  try {
    const res = await fetch(`${API_BASE}/insee/zones?${search}`);
    if (!res.ok) return { zones: [] };
    return res.json();
  } catch {
    return { zones: [] };
  }
}

export async function loadInseeCarreauxStats(
  params?: { code_postal?: string; id_carr1km?: string }
): Promise<InseeCarreauxStats> {
  const search = new URLSearchParams();
  if (params?.code_postal) search.set('code_postal', params.code_postal);
  if (params?.id_carr1km) search.set('id_carr1km', params.id_carr1km);
  try {
    const res = await fetch(`${API_BASE}/insee/carreaux/stats?${search}`);
    if (!res.ok) throw new Error('Stats INSEE non disponibles');
    return res.json();
  } catch {
    return {
      totalCarreaux: 0,
      totalInd: 0,
      totalMen: 0,
      totalMenPauv: 0,
      totalMenProp: 0,
      totalLogSoc: 0,
      totalMenSurf: 0,
      avgNiveauVie: 0,
      byPostal: {},
    };
  }
}
