import { useState, useEffect, useCallback } from 'react';
import { loadPropertiesStats } from '@/services/propertyService';
import {
  loadInseeCarreauxStats,
  loadInseeZones,
  type InseeCarreauxStats,
} from '@/services/inseeService';
import { loadPropertiesMeta } from '@/services/propertyService';
import { formatPrice } from '@/utils';

function formatArrondissement(cp: string): string {
  const n = parseInt(cp?.slice(-2) || '0', 10);
  return n === 1 ? '1er' : `${n}e`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<{
    total: number;
    totalValue: number;
    avgPrice: number;
    byType: Record<string, number>;
    byPostal: Record<string, number>;
  } | null>(null);
  const [inseeStats, setInseeStats] = useState<InseeCarreauxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [codePostals, setCodePostals] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  const [priceRange, setPriceRange] = useState({ min: 0, max: 10_000_000 });

  const [filters, setFilters] = useState({
    code_postal: '',
    type_bien: '',
    id_carr1km: '',
    prix_min: 0,
    prix_max: 10_000_000,
    annee_min: 2014,
    annee_max: new Date().getFullYear(),
  });
  const [appliedFilters, setAppliedFilters] = useState({
    code_postal: '',
    type_bien: '',
    id_carr1km: '',
    prix_min: 0,
    prix_max: 10_000_000,
    annee_min: 2014,
    annee_max: new Date().getFullYear(),
  });

  const fetchData = useCallback(() => {
    setIsLoading(true);
    const params: { code_postal?: string; type_bien?: string; prix_min?: number; prix_max?: number; annee_min?: number; annee_max?: number; id_carr1km?: string } = {};
    if (appliedFilters.code_postal) params.code_postal = appliedFilters.code_postal;
    if (appliedFilters.type_bien) params.type_bien = appliedFilters.type_bien;
    if (appliedFilters.id_carr1km) params.id_carr1km = appliedFilters.id_carr1km;
    if (appliedFilters.prix_min > 0) params.prix_min = appliedFilters.prix_min;
    if (appliedFilters.prix_max < priceRange.max) params.prix_max = appliedFilters.prix_max;
    if (appliedFilters.annee_min > 2014) params.annee_min = appliedFilters.annee_min;
    if (appliedFilters.annee_max < new Date().getFullYear()) params.annee_max = appliedFilters.annee_max;

    const inseeParams: { code_postal?: string; id_carr1km?: string } = {};
    if (appliedFilters.code_postal) inseeParams.code_postal = appliedFilters.code_postal;
    if (appliedFilters.id_carr1km) inseeParams.id_carr1km = appliedFilters.id_carr1km;

    Promise.all([
      loadPropertiesStats(params),
      loadInseeCarreauxStats(inseeParams),
    ])
      .then(([dvf, insee]) => {
        setStats(dvf);
        setInseeStats(insee);
      })
      .finally(() => setIsLoading(false));
  }, [appliedFilters, priceRange.max]);

  useEffect(() => {
    loadPropertiesMeta().then((meta) => {
      setCodePostals(meta.codePostals || []);
      setTypes(meta.types || []);
      setPriceRange(meta.priceRange || { min: 0, max: 10_000_000 });
    });
  }, []);

  useEffect(() => {
    loadInseeZones({ code_postal: filters.code_postal || undefined }).then((r) =>
      setZones(r.zones || [])
    );
  }, [filters.code_postal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    const empty = {
      code_postal: '',
      type_bien: '',
      id_carr1km: '',
      prix_min: 0,
      prix_max: priceRange.max,
      annee_min: 2014,
      annee_max: new Date().getFullYear(),
    };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  if (isLoading && !stats) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-slate-600">Chargement...</span>
      </div>
    );
  }

  const { total, totalValue, avgPrice, byType, byPostal } = stats ?? {
    total: 0,
    totalValue: 0,
    avgPrice: 0,
    byType: {} as Record<string, number>,
    byPostal: {} as Record<string, number>,
  };

  const topPostals = Object.entries(byPostal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const arrondissements =
    codePostals.length > 0
      ? codePostals
      : Array.from({ length: 20 }, (_, i) =>
          String(75001 + i).padStart(5, '0')
        );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analyses</h1>
        <p className="text-slate-600 mt-1">Statistiques du marché immobilier</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <h3 className="font-bold text-lg">Affiner les analyses</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Arrondissement
            </label>
            <select
              value={filters.code_postal}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  code_postal: e.target.value,
                  id_carr1km: '',
                }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Tous les arrondissements</option>
              {arrondissements.map((cp) => (
                <option key={cp} value={cp}>
                  {cp.startsWith('75') ? formatArrondissement(cp) : cp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de bien
            </label>
            <select
              value={filters.type_bien}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type_bien: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Tous les types de biens</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Zone / IRIS (carreau 1km)
            </label>
            <select
              value={filters.id_carr1km}
              onChange={(e) =>
                setFilters((f) => ({ ...f, id_carr1km: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Toutes les zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prix min (€)
            </label>
            <input
              type="number"
              min={0}
              value={filters.prix_min || ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, prix_min: Number(e.target.value) || 0 }))
              }
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prix max (€)
            </label>
            <input
              type="number"
              min={0}
              value={filters.prix_max || ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  prix_max: Number(e.target.value) || priceRange.max,
                }))
              }
              placeholder={String(priceRange.max)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Année min
            </label>
            <input
              type="number"
              min={2014}
              max={new Date().getFullYear()}
              value={filters.annee_min || ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, annee_min: Number(e.target.value) || 2014 }))
              }
              placeholder="2014"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Année max
            </label>
            <input
              type="number"
              min={2014}
              max={new Date().getFullYear()}
              value={filters.annee_max || ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  annee_max: Number(e.target.value) || new Date().getFullYear(),
                }))
              }
              placeholder={String(new Date().getFullYear())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              {isLoading ? 'Chargement...' : 'Appliquer'}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow border p-6">
          <p className="text-sm font-medium text-slate-600">Total biens</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <p className="text-sm font-medium text-slate-600">Valeur totale</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatPrice(totalValue)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <p className="text-sm font-medium text-slate-600">Prix moyen</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatPrice(avgPrice)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow border p-6">
          <h3 className="font-bold text-slate-900 mb-4">Par type de bien</h3>
          <ul className="space-y-2">
            {Object.entries(byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <li key={type} className="flex justify-between">
                  <span>{type || 'Non renseigné'}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            {Object.keys(byType).length === 0 && (
              <li className="text-slate-500">Aucune donnée</li>
            )}
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <h3 className="font-bold text-slate-900 mb-4">Top 10 codes postaux</h3>
          <ul className="space-y-2">
            {topPostals.map(([cp, count]) => (
              <li key={cp} className="flex justify-between">
                <span>{cp}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
            {topPostals.length === 0 && (
              <li className="text-slate-500">Aucune donnée</li>
            )}
          </ul>
        </div>
      </div>

      {inseeStats && inseeStats.totalCarreaux > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Données INSEE – Carreaux 200m (FiLoSoFi 2015)
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Source :{' '}
            <a
              href="https://www.insee.fr/fr/statistiques/4176290"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Données carroyées Insee
            </a>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">Carreaux</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inseeStats.totalCarreaux.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">Individus</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inseeStats.totalInd.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">Ménages</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inseeStats.totalMen.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">
                Niveau de vie moyen
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {Math.round(inseeStats.avgNiveauVie).toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">
                Ménages pauvres
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inseeStats.totalMenPauv.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow border p-6">
              <p className="text-sm font-medium text-slate-600">
                Logements sociaux
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {inseeStats.totalLogSoc.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
