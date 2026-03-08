import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { loadPropertyDetail, type PropertyDetailResponse } from '@/services/propertyService';
import type { Property } from '@/types';

interface PropertyDetailModalProps {
  propertyId: string | null;
  onClose: () => void;
  formatPrice: (price: number | undefined) => string;
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function TransactionCard({
  p,
  formatPrice: fmtPrice,
}: {
  p: Property;
  formatPrice: (price: number | undefined) => string;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
      <div className="font-medium text-slate-900">
        {format(p.datemut || '', 'dd/MM/yyyy', { locale: fr })} — {fmtPrice(p.valeurfonc)}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <DataRow label="Type" value={p.libtypbien?.replace(/^UNE? /, '')} />
        <DataRow label="Nature" value={p.libnatmut} />
        <DataRow label="Surface bâti (m²)" value={p.surface_reelle_bati} />
        <DataRow label="Surface terrain (m²)" value={p.surface_terrain} />
        <DataRow label="Pièces" value={p.nombre_pieces_principales} />
        <DataRow label="Lots" value={p.nombre_lots} />
        <DataRow label="Section" value={p.l_section?.join(', ')} />
        <DataRow label="Parcelle" value={p.nbpar} />
        <DataRow label="ID mutation" value={p.id_mutation} />
        <DataRow label="ID parcelle" value={p.id_parcelle} />
        {p.lots_carrez?.map((lot) => (
          <DataRow
            key={lot.lot}
            label={`Lot ${lot.lot} Carrez (m²)`}
            value={lot.surface_carrez}
          />
        ))}
      </div>
    </div>
  );
}

export function PropertyDetailModal({
  propertyId,
  onClose,
  formatPrice: fmtPrice,
}: PropertyDetailModalProps) {
  const [data, setData] = useState<PropertyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setData(null);
      return;
    }
    setIsLoading(true);
    loadPropertyDetail(propertyId).then((res) => {
      setData(res ?? null);
      setIsLoading(false);
    });
  }, [propertyId]);

  if (!propertyId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Détail du bien</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!isLoading && data && (
            <>
              {/* Adresse */}
              <section>
                <h3 className="font-bold text-slate-900 mb-2">Adresse</h3>
                <p className="text-slate-700">
                  {data.property.nom_rue}
                  <br />
                  {data.property.code_postal} {data.property.ville}
                </p>
                {data.property.longitude != null && data.property.latitude != null && (
                  <p className="text-xs text-slate-500 mt-1">
                    Coordonnées : {data.property.latitude.toFixed(5)}, {data.property.longitude.toFixed(5)}
                  </p>
                )}
              </section>

              {/* Transactions (toutes à cette adresse) */}
              <section>
                <h3 className="font-bold text-slate-900 mb-2">
                  Transactions ({data.transactions.length})
                </h3>
                <div className="space-y-3">
                  {data.transactions.map((p) => (
                    <TransactionCard key={p.id} p={p} formatPrice={fmtPrice} />
                  ))}
                </div>
              </section>

              {/* Données INSEE / IRIS (carreaux 200m) */}
              {data.inseeStats && (
                <section>
                  <h3 className="font-bold text-slate-900 mb-2">
                    Données INSEE – Carreaux 200m (FiLoSoFi 2015)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Carreaux</p>
                      <p className="font-bold">{data.inseeStats.totalCarreaux}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Individus</p>
                      <p className="font-bold">{data.inseeStats.totalInd.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Ménages</p>
                      <p className="font-bold">{data.inseeStats.totalMen.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Niveau de vie moy.</p>
                      <p className="font-bold">
                        {Math.round(data.inseeStats.avgNiveauVie).toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Ménages pauvres</p>
                      <p className="font-bold">{data.inseeStats.totalMenPauv.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Logements sociaux</p>
                      <p className="font-bold">{data.inseeStats.totalLogSoc.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Surface logements</p>
                      <p className="font-bold">
                        {Math.round(data.inseeStats.totalMenSurf).toLocaleString('fr-FR')} m²
                      </p>
                    </div>
                  </div>

                  {data.inseeCarreaux.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Détail des carreaux ({data.inseeCarreaux.length})
                      </h4>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">IdINSPIRE</th>
                              <th className="px-3 py-2 text-right">Ind</th>
                              <th className="px-3 py-2 text-right">Men</th>
                              <th className="px-3 py-2 text-right">Men_pauv</th>
                              <th className="px-3 py-2 text-right">Men_prop</th>
                              <th className="px-3 py-2 text-right">Log_soc</th>
                              <th className="px-3 py-2 text-right">Men_surf</th>
                              <th className="px-3 py-2 text-right">Ind_snv</th>
                              <th className="px-3 py-2 text-right">Log_av45</th>
                              <th className="px-3 py-2 text-right">Log_45_70</th>
                              <th className="px-3 py-2 text-right">Log_70_90</th>
                              <th className="px-3 py-2 text-right">Log_ap90</th>
                              <th className="px-3 py-2 text-right">I_est_cr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.inseeCarreaux.map((c) => (
                              <tr key={c.id} className="border-t border-slate-100">
                                <td className="px-3 py-1 font-mono text-xs">{c.id}</td>
                                <td className="px-3 py-1 text-right">{c.ind}</td>
                                <td className="px-3 py-1 text-right">{c.men}</td>
                                <td className="px-3 py-1 text-right">{c.men_pauv}</td>
                                <td className="px-3 py-1 text-right">{c.men_prop}</td>
                                <td className="px-3 py-1 text-right">{c.log_soc}</td>
                                <td className="px-3 py-1 text-right">{c.men_surf}</td>
                                <td className="px-3 py-1 text-right">{c.ind_snv}</td>
                                <td className="px-3 py-1 text-right">{c.log_av45}</td>
                                <td className="px-3 py-1 text-right">{c.log_45_70}</td>
                                <td className="px-3 py-1 text-right">{c.log_70_90}</td>
                                <td className="px-3 py-1 text-right">{c.log_ap90}</td>
                                <td className="px-3 py-1 text-right">{c.i_est_cr}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!data.inseeStats && data.inseeCarreaux.length === 0 && (
                <section>
                  <h3 className="font-bold text-slate-900 mb-2">Données INSEE</h3>
                  <p className="text-slate-500 text-sm">
                    Aucune donnée INSEE disponible pour ce code postal. Exécutez le script
                    extract_insee_carreaux.py pour les charger.
                  </p>
                </section>
              )}
            </>
          )}

          {!isLoading && !data && (
            <p className="text-slate-500">Impossible de charger les détails.</p>
          )}
        </div>
      </div>
    </div>
  );
}
