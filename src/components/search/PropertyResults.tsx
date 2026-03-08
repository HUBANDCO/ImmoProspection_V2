import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Property } from '@/types';

interface PropertyResultsProps {
  properties: Property[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onPropertyClick?: (property: Property) => void;
  sortBy: 'datemut' | 'valeurfonc';
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: 'datemut' | 'valeurfonc', order: 'asc' | 'desc') => void;
  onAddToList: () => void;
  formatPrice: (price: number | undefined) => string;
  isLoading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function PropertyResults({
  properties,
  selectedIds,
  onSelect,
  onSelectAll,
  onPropertyClick,
  sortBy,
  sortOrder,
  onSortChange,
  onAddToList,
  formatPrice,
  isLoading = false,
  pagination,
}: PropertyResultsProps) {
  const allSelected = properties.length > 0 && selectedIds.size === properties.length;

  const toggleSort = (col: 'datemut' | 'valeurfonc') => {
    if (sortBy === col) {
      onSortChange(col, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(col, 'desc');
    }
  };

  const formatDate = (d: string | undefined) =>
    d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '—';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} sélectionné(s) {pagination ? `• ${pagination.total} résultat(s)` : `sur ${properties.length}`}
          </span>
        </div>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={onAddToList}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Ajouter à une liste
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="w-12 px-4 py-3 text-left">
                <span className="sr-only">Sélection</span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Adresse</th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                onClick={() => toggleSort('datemut')}
              >
                Date {sortBy === 'datemut' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600"
                onClick={() => toggleSort('valeurfonc')}
              >
                Prix {sortBy === 'valeurfonc' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-slate-100 hover:bg-slate-50 ${onPropertyClick ? 'cursor-pointer' : ''}`}
                onClick={
                  onPropertyClick
                    ? (e) => {
                        if (
                          !(e.target as HTMLElement).closest('input[type="checkbox"]')
                        ) {
                          onPropertyClick(p);
                        }
                      }
                    : undefined
                }
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={(e) => onSelect(p.id, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{p.nom_rue || p.voie || '—'}</span>
                  <p className="text-sm text-slate-500">
                    {p.code_postal} {p.ville}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(p.datemut)}</td>
                <td className="px-4 py-3 font-medium text-green-700">
                  {formatPrice(p.valeurfonc)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.libtypbien?.replace('UNE ', '').replace('UN ', '') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-slate-600">Chargement...</span>
        </div>
      )}

      {!isLoading && properties.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          Aucun résultat. Ajustez les filtres.
        </div>
      )}

      {!isLoading && pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
