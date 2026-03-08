import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { listLists, createList, deleteList, updateList } from '@/services/listService';
import type { ProspectList } from '@/types';

export default function ListsPage() {
  const [lists, setLists] = useState<ProspectList[]>(listLists());
  const [editingList, setEditingList] = useState<ProspectList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const refreshLists = () => setLists(listLists());

  const handleCreate = () => {
    if (!newListName.trim()) return;
    createList(newListName.trim(), newListDesc.trim() || undefined);
    setNewListName('');
    setNewListDesc('');
    setShowCreateForm(false);
    refreshLists();
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette liste ?')) {
      deleteList(id);
      refreshLists();
      if (editingList?.id === id) setEditingList(null);
    }
  };

  const startEdit = (list: ProspectList) => {
    setEditingList(list);
    setEditName(list.name);
    setEditDesc(list.description ?? '');
  };

  const saveEdit = () => {
    if (!editingList) return;
    updateList(editingList.id, { name: editName, description: editDesc });
    setEditingList(null);
    refreshLists();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Listes</h1>
          <p className="text-slate-600 mt-1">Gérez vos listes de prospects</p>
        </div>
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Nouvelle liste
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nom de la liste"
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {lists.map((list) => (
          <div
            key={list.id}
            className="bg-white rounded-xl shadow border border-slate-200 p-6 flex justify-between items-start"
          >
            <div className="flex-1">
              {editingList?.id === list.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingList(null)}
                      className="px-3 py-1 border border-slate-300 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-slate-900">{list.name}</h3>
                  {list.description && (
                    <p className="text-sm text-slate-600 mt-1">{list.description}</p>
                  )}
                  <p className="text-sm text-slate-500 mt-2">
                    {list.property_ids.length} bien(s)
                  </p>
                </>
              )}
            </div>
            {editingList?.id !== list.id && (
              <div className="flex gap-2">
                <Link
                  to={createPageUrl('ListDetails', { id: list.id })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Voir détails
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(list)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(list.id)}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {lists.length === 0 && !showCreateForm && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center">
          <p className="text-slate-600 mb-4">Aucune liste. Créez-en une pour commencer.</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Nouvelle liste
          </button>
        </div>
      )}
    </div>
  );
}
