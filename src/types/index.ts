/**
 * Types pour ImmoProspection V2
 * Compatibles avec les données DVF (Demandes de Valeurs Foncières)
 * et l'historique ChatGPT sur le traitement des open data
 */

/** Bien immobilier - structure DVF */
export interface Property {
  id: string;
  id_mutation?: string;
  id_parcelle?: string;
  /** Code département (ex: 75 pour Paris) */
  coddep?: string;
  /** Code commune INSEE */
  l_codinsee?: string;
  /** Nom de la commune */
  ville?: string;
  /** Code postal */
  code_postal?: string;
  /** Numéro de voie */
  numero_voie?: string;
  /** Type de voie (Rue, Avenue, etc.) */
  type_voie?: string;
  /** Nom de la voie */
  voie?: string;
  /** Adresse complète (nom_rue pour compatibilité V1) */
  nom_rue?: string;
  /** Adresse de base pour regroupement (sans code voie) */
  adresse_base?: string;
  /** Valeur foncière (prix de vente) */
  valeurfonc?: number;
  /** Date de mutation */
  datemut?: string;
  /** Type de bien (UNE MAISON, UN APPARTEMENT, etc.) */
  libtypbien?: string;
  /** Nature de la mutation */
  libnatmut?: string;
  /** Sections cadastrales */
  l_section?: string[];
  /** Identifiant parcelle (l_idlocmut) */
  l_idlocmut?: string[];
  /** Numéro de parcelle */
  nbpar?: string;
  /** Longitude (DVF géolocalisé) */
  longitude?: number;
  /** Latitude (DVF géolocalisé) */
  latitude?: number;
  /** Surface réelle du bâti (m²) */
  surface_reelle_bati?: number;
  /** Surface du terrain (m²) */
  surface_terrain?: number;
  /** Nombre de pièces principales */
  nombre_pieces_principales?: number;
  /** Surfaces Carrez par lot */
  lots_carrez?: { lot: number; surface_carrez: number }[];
  /** Nombre de lots */
  nombre_lots?: number;
  /** Code type local */
  code_type_local?: string;
}

/** Liste de prospects */
export interface ProspectList {
  id: string;
  name: string;
  description?: string;
  property_ids: string[];
  created_at?: string;
}

/** Statuts de prospection */
export type ProspectStatus = 'urgent' | 'a_faire' | 'en_cours' | 'cloture';

/** Situation du lead */
export type LeadSituation = 'interesse' | 'pas_interesse' | 'possiblement_interesse';

/** Fiche prospect */
export interface ProspectCard {
  id: string;
  property_id: string;
  prospect_status: ProspectStatus;
  last_status_date?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  lead_situation?: LeadSituation;
  estimated_delay_months?: number;
  desired_price?: number;
  is_negotiable?: boolean;
  negotiation_margin_percent?: number;
  negotiation_margin_amount?: number;
  agent_estimated_price?: number;
  notes?: string;
  photos?: string[];
}
