/**
 * Service de gestion des listes de prospects
 * V2 : stockage localStorage (pas de backend Base44)
 */

import type { ProspectList } from '@/types';

const STORAGE_KEY = 'immoprospection_v2_lists';

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getLists(): ProspectList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLists(lists: ProspectList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function listLists(): ProspectList[] {
  return getLists();
}

export function getListById(id: string): ProspectList | undefined {
  return getLists().find((l) => l.id === id);
}

export function createList(name: string, description?: string): ProspectList {
  const lists = getLists();
  const newList: ProspectList = {
    id: generateId(),
    name,
    description: description ?? '',
    property_ids: [],
  };
  lists.push(newList);
  saveLists(lists);
  return newList;
}

export function updateList(id: string, updates: Partial<Pick<ProspectList, 'name' | 'description' | 'property_ids'>>): ProspectList | undefined {
  const lists = getLists();
  const index = lists.findIndex((l) => l.id === id);
  if (index === -1) return undefined;
  lists[index] = { ...lists[index], ...updates };
  saveLists(lists);
  return lists[index];
}

export function deleteList(id: string): boolean {
  const lists = getLists().filter((l) => l.id !== id);
  if (lists.length === getLists().length) return false;
  saveLists(lists);
  return true;
}

export function addPropertiesToList(listId: string, propertyIds: string[]): ProspectList | undefined {
  const list = getListById(listId);
  if (!list) return undefined;
  const merged = [...new Set([...list.property_ids, ...propertyIds])];
  return updateList(listId, { property_ids: merged });
}
