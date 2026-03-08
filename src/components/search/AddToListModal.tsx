import { useState } from 'react';
import type { ProspectList } from '@/types';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: ProspectList[];
  selectedCount: number;
  onAddToList: (listId: string | 'new', newListName?: string) => void;
}

export function AddToListModal({
  isOpen,
  onClose,
  lists,
  selectedCount,
  onAddToList,
}: AddToListModalProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (newListName.trim()) {
      onAddToList('new', newListName.trim());
    } else if (selectedListId) {
      onAddToList(selectedListId);
    }
    setSelectedListId(null);
    setNewListName('');
    onClose();
  };

  const canConfirm = newListName.trim() || selectedListId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Ajouter {selectedCount} bien(s) à une liste
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Sélectionnez une liste existante ou créez-en une nouvelle.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Listes existantes
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {lists.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune liste. Créez-en une ci-dessous.</p>
              ) : (
                lists.map((list) => (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="list"
                      checked={selectedListId === list.id && !newListName}
                      onChange={() => {
                        setSelectedListId(list.id);
                        setNewListName('');
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>{list.name}</span>
                    <span className="text-xs text-slate-500">({list.property_ids.length} biens)</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Ou créer une nouvelle liste
            </label>
            <input
              type="text"
              value={newListName}
              onChange={(e) => {
                setNewListName(e.target.value);
                if (e.target.value) setSelectedListId(null);
              }}
              placeholder="Ex: Prospects Paris 18ème"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
