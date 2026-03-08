/**
 * Service de gestion des fiches prospect
 * V2 : stockage localStorage (pas de backend Base44)
 */

import type { ProspectCard } from '@/types';

const STORAGE_KEY = 'immoprospection_v2_prospect_cards';

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getCards(): ProspectCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCards(cards: ProspectCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function listCards(): ProspectCard[] {
  return getCards();
}

export function getCardByPropertyId(propertyId: string): ProspectCard | undefined {
  return getCards().find((c) => c.property_id === propertyId);
}

export function createOrUpdateCard(card: Omit<ProspectCard, 'id'>): ProspectCard {
  const cards = getCards();
  const existing = cards.find((c) => c.property_id === card.property_id);

  if (existing) {
    const updated = { ...existing, ...card };
    const index = cards.findIndex((c) => c.id === existing.id);
    cards[index] = updated;
    saveCards(cards);
    return updated;
  }

  const newCard: ProspectCard = {
    ...card,
    id: generateId(),
  };
  cards.push(newCard);
  saveCards(cards);
  return newCard;
}
