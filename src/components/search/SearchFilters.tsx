
const SECTIONS_CADASTRALES = [
  'AR', 'BL', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL',
  'AM', 'AN', 'AO', 'AP', 'AQ', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ',
  'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BM',
];

export interface SearchFiltersState {
  ville: string;
  code_postal: string;
  selected_sections: Record<string, string[]>;
  prix_min: number;
  prix_max: number;
  annee_min: number;
  annee_max: number;
  type_bien: string;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (f: SearchFiltersState) => void;
  onRefresh?: () => void;
  resultCount: number;
  isLoading: boolean;
  uniqueCities: string[];
  codePostals?: string[];
  priceRange: { min: number; max: number };
}

function formatPriceLabel(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M€`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}K€`;
  return `${price}€`;
}

function formatArrondissement(cp: string): string {
  const n = parseInt(cp?.slice(-2) || '0', 10);
  return n === 1 ? '1er' : `${n}e`;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  onRefresh,
  resultCount,
  isLoading,
  uniqueCities,
  codePostals = [],
  priceRange,
}: SearchFiltersProps) {

  const handleChange = (key: keyof SearchFiltersState, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addSection = (section: string) => {
    if (!filters.selected_sections[section]) {
      handleChange('selected_sections', { ...filters.selected_sections, [section]: [] });
    }
  };

  const removeSection = (section: string) => {
    const next = { ...filters.selected_sections };
    delete next[section];
    handleChange('selected_sections', next);
  };

  const handleSectionParcelles = (section: string, parcellesStr: string) => {
    const parcelles = parcellesStr.split(',').map((p) => p.trim()).filter(Boolean);
    handleChange('selected_sections', { ...filters.selected_sections, [section]: parcelles });
  };

  const clearFilters = () => {
    onFiltersChange({
      ville: '',
      code_postal: '',
      selected_sections: {},
      prix_min: 0,
      prix_max: priceRange.max,
      annee_min: 2014,
      annee_max: new Date().getFullYear(),
      type_bien: '',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
        <h3 className="font-bold text-lg">Filtres</h3>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Mise à jour
            </button>
          )}
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            {isLoading ? '...' : `${resultCount} résultats`}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Réinitialiser
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
            <select
              value={filters.ville}
              onChange={(e) => handleChange('ville', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="">Tous</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Arrondissement</label>
            <select
              value={filters.code_postal}
              onChange={(e) => handleChange('code_postal', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="">Tous</option>
              {(codePostals.length > 0 ? codePostals : ['75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008', '75009', '75010', '75011', '75012', '75013', '75014', '75015', '75016', '75017', '75018', '75019', '75020']).map((cp) => (
                <option key={cp} value={cp}>
                  {cp.startsWith('75') ? formatArrondissement(cp) : cp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type de bien</label>
          <select
            value={filters.type_bien}
            onChange={(e) => handleChange('type_bien', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Tous les types</option>
            <option value="Appartement">Appartement</option>
            <option value="Maison">Maison</option>
            <option value="Dépendance">Dépendance</option>
            <option value="Local industriel">Local industriel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sections cadastrales</label>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) addSection(v);
              e.target.value = '';
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Ajouter une section</option>
            {SECTIONS_CADASTRALES.filter((s) => !filters.selected_sections[s]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="mt-2 space-y-2">
            {Object.entries(filters.selected_sections).map(([section, parcelles]) => (
              <div key={section} className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700 w-16">Section {section}</span>
                <input
                  type="text"
                  value={parcelles.join(', ')}
                  onChange={(e) => handleSectionParcelles(section, e.target.value)}
                  placeholder="N° parcelles (ex: 1, 2, 5)"
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeSection(section)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Prix : {formatPriceLabel(filters.prix_min)} - {filters.prix_max >= priceRange.max ? 'Max' : formatPriceLabel(filters.prix_max)}
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="number"
                min={0}
                max={priceRange.max}
                step={50000}
                value={filters.prix_min}
                onChange={(e) => handleChange('prix_min', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                min={0}
                max={priceRange.max}
                step={50000}
                value={filters.prix_max}
                onChange={(e) => handleChange('prix_max', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Années : {filters.annee_min} - {filters.annee_max}
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="number"
                min={2014}
                max={new Date().getFullYear()}
                value={filters.annee_min}
                onChange={(e) => handleChange('annee_min', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                min={2014}
                max={new Date().getFullYear()}
                value={filters.annee_max}
                onChange={(e) => handleChange('annee_max', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
