import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadPropertiesMeta,
  loadPropertiesPage,
  type LoadPropertiesParams,
} from '@/services/propertyService';
import { listLists, addPropertiesToList, createList } from '@/services/listService';
import type { Property } from '@/types';
import { formatPrice } from '@/utils';
import { SearchFilters } from '@/components/search/SearchFilters';
import { PropertyResults } from '@/components/search/PropertyResults';
import { AddToListModal } from '@/components/search/AddToListModal';
import { PropertyDetailModal } from '@/components/search/PropertyDetailModal';

const defaultFilters = {
  ville: '',
  code_postal: '',
  selected_sections: {} as Record<string, string[]>,
  prix_min: 0,
  prix_max: 10_000_000,
  annee_min: 2014,
  annee_max: new Date().getFullYear(),
  type_bien: '',
};

const PAGE_SIZE = 50;

export default function SearchPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'datemut' | 'valeurfonc'>('datemut');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10_000_000 });
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [codePostals, setCodePostals] = useState<string[]>([]);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    loadPropertiesMeta().then((meta) => {
      setUniqueCities(meta.cities);
      setCodePostals(meta.codePostals);
      setPriceRange(meta.priceRange);
    });
  }, []);

  const fetchPage = useCallback(
    (pageNum: number) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      const id = ++fetchIdRef.current;

      setIsLoading(true);
      const params: LoadPropertiesParams = {
        page: pageNum,
        limit: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (appliedFilters.code_postal) params.code_postal = appliedFilters.code_postal;
      if (appliedFilters.ville) params.ville = appliedFilters.ville;
      if (appliedFilters.type_bien) params.type_bien = appliedFilters.type_bien;
      if (Object.keys(appliedFilters.selected_sections || {}).length > 0) {
        params.selected_sections = appliedFilters.selected_sections;
      }
      if (appliedFilters.prix_min > 0) params.prix_min = appliedFilters.prix_min;
      if (appliedFilters.prix_max < priceRange.max) params.prix_max = appliedFilters.prix_max;
      if (appliedFilters.annee_min > 2014) params.annee_min = appliedFilters.annee_min;
      if (appliedFilters.annee_max < new Date().getFullYear()) params.annee_max = appliedFilters.annee_max;

      loadPropertiesPage(params, signal)
        .then((result) => {
          if (id !== fetchIdRef.current) return;
          setProperties(result.items);
          setTotal(result.total);
          setPage(result.page);
          setTotalPages(result.totalPages);
        })
        .catch((err) => {
          if (err.name === 'AbortError' || id !== fetchIdRef.current) return;
          setProperties([]);
          setTotal(0);
        })
        .finally(() => {
          if (id === fetchIdRef.current) setIsLoading(false);
        });
    },
    [appliedFilters, sortBy, sortOrder, priceRange.max]
  );

  useEffect(() => {
    fetchPage(page);
  }, [fetchPage, page]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleSelectProperty = (id: string, selected: boolean) => {
    setSelectedProperties((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedProperties(new Set(properties.map((p) => p.id)));
    } else {
      setSelectedProperties(new Set());
    }
  };

  const handleSortChange = (by: 'datemut' | 'valeurfonc', order: 'asc' | 'desc') => {
    setSortBy(by);
    setSortOrder(order);
    setPage(1);
  };

  const handleAddToList = async (listId: string | 'new', newListName?: string) => {
    const ids = Array.from(selectedProperties);
    if (ids.length === 0) return;

    if (listId === 'new' && newListName) {
      const list = createList(newListName);
      addPropertiesToList(list.id, ids);
    } else if (listId !== 'new') {
      addPropertiesToList(listId, ids);
    }
    setSelectedProperties(new Set());
    setIsAddToListModalOpen(false);
  };

  const lists = listLists();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recherche</h1>
        <p className="text-slate-600 mt-1">
          Transactions immobilières DVF • Paris
        </p>
      </div>

      <SearchFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        resultCount={total}
        isLoading={isLoading}
        uniqueCities={uniqueCities}
        codePostals={codePostals}
        priceRange={priceRange}
      />

      <PropertyResults
        properties={properties}
        selectedIds={selectedProperties}
        onSelect={handleSelectProperty}
        onSelectAll={handleSelectAll}
        onPropertyClick={(p) => setDetailPropertyId(p.id)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onAddToList={() => setIsAddToListModalOpen(true)}
        formatPrice={formatPrice}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage,
        }}
      />

      <AddToListModal
        isOpen={isAddToListModalOpen}
        onClose={() => setIsAddToListModalOpen(false)}
        lists={lists}
        selectedCount={selectedProperties.size}
        onAddToList={handleAddToList}
      />

      <PropertyDetailModal
        propertyId={detailPropertyId}
        onClose={() => setDetailPropertyId(null)}
        formatPrice={formatPrice}
      />
    </div>
  );
}
