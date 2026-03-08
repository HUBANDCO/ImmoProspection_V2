/**
 * Utilitaires ImmoProspection V2
 */

/** Crée l'URL d'une page (compatibilité avec la structure de routing) */
export function createPageUrl(pageName: string, params?: Record<string, string>): string {
  const basePath = pageName === 'Search' ? '/' : `/${pageName}`;
  if (!params || Object.keys(params).length === 0) return basePath;
  const searchParams = new URLSearchParams(params);
  return `${basePath}?${searchParams.toString()}`;
}

/** Formate un prix en EUR */
export function formatPrice(price: number | undefined): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
