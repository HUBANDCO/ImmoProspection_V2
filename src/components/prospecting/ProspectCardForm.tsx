import { useState } from 'react';
import type { Property, ProspectCard, ProspectStatus, LeadSituation } from '@/types';

const PROSPECT_STATUSES: Record<ProspectStatus, string> = {
  urgent: 'Urgent',
  a_faire: 'À faire',
  en_cours: 'En cours',
  cloture: 'Clôturé',
};

const LEAD_SITUATIONS: Record<LeadSituation, string> = {
  interesse: 'Intéressé pour vendre',
  pas_interesse: 'Pas intéressé',
  possiblement_interesse: 'Possiblement intéressé à terme',
};

interface ProspectCardFormProps {
  property: Property;
  prospectCard?: ProspectCard | null;
  onClose: (updatedCard?: ProspectCard) => void;
  onSave: (data: Partial<ProspectCard>) => void;
}

export function ProspectCardForm({
  property,
  prospectCard,
  onClose,
  onSave,
}: ProspectCardFormProps) {
  const [formData, setFormData] = useState({
    prospect_status: (prospectCard?.prospect_status ?? 'a_faire') as ProspectStatus,
    last_status_date: prospectCard?.last_status_date ?? new Date().toISOString().split('T')[0],
    owner_name: prospectCard?.owner_name ?? '',
    owner_phone: prospectCard?.owner_phone ?? '',
    owner_email: prospectCard?.owner_email ?? '',
    lead_situation: (prospectCard?.lead_situation ?? 'pas_interesse') as LeadSituation,
    estimated_delay_months: prospectCard?.estimated_delay_months ?? '',
    desired_price: prospectCard?.desired_price ?? '',
    is_negotiable: prospectCard?.is_negotiable ?? false,
    negotiation_margin_percent: prospectCard?.negotiation_margin_percent ?? '',
    agent_estimated_price: prospectCard?.agent_estimated_price ?? '',
    notes: prospectCard?.notes ?? '',
  });

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      estimated_delay_months: formData.estimated_delay_months
        ? Number(formData.estimated_delay_months)
        : undefined,
      desired_price: formData.desired_price ? Number(formData.desired_price) : undefined,
      negotiation_margin_percent: formData.negotiation_margin_percent
        ? Number(formData.negotiation_margin_percent)
        : undefined,
      agent_estimated_price: formData.agent_estimated_price
        ? Number(formData.agent_estimated_price)
        : undefined,
    });
    onClose();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Fiche prospect</h2>
        <p className="text-slate-600 mb-6">
          {property.nom_rue || property.voie} • {property.code_postal} {property.ville}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select
              value={formData.prospect_status}
              onChange={(e) => handleChange('prospect_status', e.target.value as ProspectStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {Object.entries(PROSPECT_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date du statut</label>
            <input
              type="date"
              value={formData.last_status_date}
              onChange={(e) => handleChange('last_status_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom propriétaire</label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => handleChange('owner_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.owner_phone}
                onChange={(e) => handleChange('owner_phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => handleChange('owner_email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Situation du lead</label>
            <select
              value={formData.lead_situation}
              onChange={(e) => handleChange('lead_situation', e.target.value as LeadSituation)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {Object.entries(LEAD_SITUATIONS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Délai estimé (mois)</label>
              <input
                type="number"
                value={formData.estimated_delay_months}
                onChange={(e) => handleChange('estimated_delay_months', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prix souhaité (€)</label>
              <input
                type="number"
                value={formData.desired_price}
                onChange={(e) => handleChange('desired_price', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="negotiable"
              checked={formData.is_negotiable}
              onChange={(e) => handleChange('is_negotiable', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="negotiable" className="text-sm font-medium text-slate-700">
              Négociable
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
