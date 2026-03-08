import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { loadPropertiesByIds } from '@/services/propertyService';
import { getListById } from '@/services/listService';
import { listCards, createOrUpdateCard } from '@/services/prospectCardService';
import type { Property, ProspectCard } from '@/types';
import { createPageUrl, formatPrice } from '@/utils';
import { ProspectCardForm } from '@/components/prospecting/ProspectCardForm';

export default function ListDetailsPage() {
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('id');

  const [list, setList] = useState<ReturnType<typeof getListById> | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [prospectCards, setProspectCards] = useState<Record<string, ProspectCard>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (!listId) return;
    const l = getListById(listId);
    setList(l ?? null);
  }, [listId]);

  useEffect(() => {
    if (!list?.property_ids?.length) {
      setProperties([]);
      setProspectCards({});
      setIsLoading(false);
      return;
    }
    loadPropertiesByIds(list!.property_ids).then((filtered) => {
      setProperties(filtered);
      const cards = listCards();
      const map: Record<string, ProspectCard> = {};
      cards.forEach((c) => {
        if (list!.property_ids.includes(c.property_id)) map[c.property_id] = c;
      });
      setProspectCards(map);
      setIsLoading(false);
    });
  }, [list]);

  const formatDate = (d: string | undefined) =>
    d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '—';

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      a_faire: 'bg-yellow-100 text-yellow-800',
      en_cours: 'bg-blue-100 text-blue-800',
      cloture: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      urgent: 'Urgent',
      a_faire: 'À faire',
      en_cours: 'En cours',
      cloture: 'Clôturé',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-sm font-medium ${config[status] || config.a_faire}`}>
        {labels[status] || status}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Date mutation', 'Prix', 'Ville', 'Code postal', 'Adresse', 'Type',
      'Statut', 'Date statut', 'Propriétaire', 'Téléphone', 'Email',
    ];
    const rows = properties.map((p) => {
      const card = prospectCards[p.id];
      return [
        formatDate(p.datemut),
        p.valeurfonc ?? '',
        p.ville ?? '',
        p.code_postal ?? '',
        p.nom_rue ?? '',
        p.libtypbien ?? '',
        card?.prospect_status ?? '',
        formatDate(card?.last_status_date),
        card?.owner_name ?? '',
        card?.owner_phone ?? '',
        card?.owner_email ?? '',
      ].join(';');
    });
    const csv = '\ufeff' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list?.name ?? 'liste'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseForm = (updatedCard?: ProspectCard) => {
    setEditingProperty(null);
    if (updatedCard) {
      setProspectCards((prev) => ({ ...prev, [updatedCard.property_id]: updatedCard }));
    }
  };

  const handleSaveCard = (data: Partial<ProspectCard>) => {
    if (!editingProperty) return;
    const existing = prospectCards[editingProperty.id];
    const card = createOrUpdateCard({
      ...existing,
      ...data,
      property_id: editingProperty.id,
    } as Parameters<typeof createOrUpdateCard>[0]);
    handleCloseForm(card);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-slate-600">Chargement...</span>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow border p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Liste non trouvée</h3>
          <Link to={createPageUrl('Lists')}>
            <button type="button" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
              Retour aux listes
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (editingProperty) {
    return (
      <ProspectCardForm
        property={editingProperty}
        prospectCard={prospectCards[editingProperty.id]}
        onClose={handleCloseForm}
        onSave={handleSaveCard}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Lists')}>
            <button type="button" className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">
              ←
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{list.name}</h1>
            <p className="text-slate-600">{list.description || 'Aucune description'}</p>
          </div>
        </div>
        {properties.length > 0 && (
          <button
            type="button"
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Exporter CSV
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center">
          <p className="text-slate-600 mb-4">Aucun prospect dans cette liste.</p>
          <Link to={createPageUrl('Search')}>
            <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Ajouter des prospects
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((p) => {
            const card = prospectCards[p.id];
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow border p-6 flex flex-wrap gap-6"
              >
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold text-slate-900">{p.nom_rue || p.voie}</h3>
                  <p className="text-slate-600">{p.code_postal} {p.ville}</p>
                  <p className="text-lg font-bold text-green-600 mt-1">{formatPrice(p.valeurfonc)}</p>
                  <p className="text-sm text-slate-500">{formatDate(p.datemut)}</p>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  {card ? (
                    <div className="space-y-2">
                      <div>Statut: {getStatusBadge(card.prospect_status)}</div>
                      {card.owner_name && <p>Propriétaire: {card.owner_name}</p>}
                      {card.owner_phone && <p>Tél: {card.owner_phone}</p>}
                      {card.owner_email && <p>Email: {card.owner_email}</p>}
                      <button
                        type="button"
                        onClick={() => setEditingProperty(p)}
                        className="mt-2 px-3 py-1 border border-slate-300 rounded text-sm hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingProperty(p)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Créer fiche
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
