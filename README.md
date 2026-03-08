# ImmoProspection V2

Application de prospection immobilière basée sur les **données DVF** (Demandes de Valeurs Foncières) en open data.

## Stack

- **React 19** + **TypeScript**
- **Vite 7**
- **Tailwind CSS**
- **React Router**
- **date-fns**, **lucide-react**

## Données

- **Biens immobiliers** : chargés depuis `public/data/properties.json`
- **Listes & fiches prospect** : stockage local (localStorage)

### Extraction Paris DVF (script fourni)

```bash
cd public/Sources_histo
python extract_paris_dvf.py
```

- **Entrée** : `13-06-2025_dvf.csv` (même dossier)
- **Sortie** : `public/data/properties.json`
- **Filtre** : Paris uniquement (code commune 75101-75120)

### Extraction données INSEE carreaux 200m (optionnel)

Données socio-démographiques FiLoSoFi 2015 par carreau de 200m (population, ménages, logements sociaux, etc.).

**Prérequis** : `pip install pandas py7zr` (ou 7-Zip installé)

```bash
cd public/Sources_histo
python extract_insee_carreaux.py
```

- **Téléchargement** : [INSEE Filosofi 2015 carreaux 200m CSV](https://www.insee.fr/fr/statistiques/4176290) (~69 Mo)
- **Sortie** : `public/data/insee_carreaux_paris.json`
- **Filtre** : Paris uniquement (Depcom 75101-75120)

### Format manuel

1. Placez votre fichier JSON dans `public/data/properties.json`
2. Format attendu : tableau d'objets avec les champs DVF :
   - `id`, `ville`, `code_postal`, `nom_rue` (ou `voie` + `type_voie` + `numero_voie`)
   - `valeurfonc`, `datemut`, `libtypbien`, `libnatmut`
   - `l_section`, `nbpar`, `l_idlocmut` (optionnel)

Exemple de conversion CSV DVF → JSON (séparateur `;`) :
- Colonnes typiques : `id`, `ville`, `code_postal`, `valeurfonc`, `datemut`, `libtypbien`, etc.
- Voir l'historique ChatGPT pour le traitement Python des fichiers DVF

## Installation

```bash
git clone https://github.com/HUBANDCO/ImmoProspection_V2.git
cd ImmoProspection_V2
npm install
npm run dev
```

**Données** : Les fichiers `properties.json` et `insee_carreaux_paris.json` ne sont pas versionnés (trop volumineux). Générez-les avec les scripts dans `public/Sources_histo/` (voir section Données ci-dessus).

L'API backend est intégrée au serveur Vite en dev (plugin). Elle charge `public/data/properties.json` et expose :
- `GET /api/properties` — pagination + filtres (page, limit, code_postal, ville, type_bien, prix_min, prix_max, annee_min, annee_max, sort_by, sort_order)
- `GET /api/properties?ids=id1,id2` — biens par IDs
- `GET /api/properties/meta` — villes, codes postaux, types, fourchette de prix
- `GET /api/properties/stats` — statistiques agrégées
- `GET /api/insee/carreaux` — carreaux INSEE 200m (pagination, filtre code_postal)
- `GET /api/insee/carreaux/stats` — stats agrégées INSEE (individus, ménages, logements sociaux, etc.)

## Structure

```
src/
├── components/     # Layout, SearchFilters, PropertyResults, AddToListModal, ProspectCardForm
├── pages/          # Search, Lists, ListDetails, Analytics
├── services/       # propertyService, listService, prospectCardService
├── types/          # Property, ProspectList, ProspectCard
└── utils/          # createPageUrl, formatPrice
```

## Fonctionnalités

- **Recherche** : filtres (ville, code postal, type, sections cadastrales, prix, années), tri, sélection
- **Listes** : CRUD, ajout de biens
- **Détail liste** : affichage des biens, fiches prospect, export CSV
- **Fiches prospect** : statut, propriétaire, situation lead, prix, notes
- **Analyses** : statistiques (total, valeur, prix moyen, par type, par code postal)
