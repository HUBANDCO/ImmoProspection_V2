"""
Extraction des données DVF pour Paris uniquement.
Génère properties.json exploitable par ImmoProspection V2.

Usage:
    python extract_paris_dvf.py              # Échantillon 20k pour le web
    python extract_paris_dvf.py --full       # Toutes les données (~390k)

Fichiers:
    Entrée : 13-06-2025_dvf.csv (même dossier)
    Sortie : ../../data/properties.json
"""

import pandas as pd
import json
import sys
from pathlib import Path

# Chemins
SCRIPT_DIR = Path(__file__).parent
INPUT_CSV = SCRIPT_DIR / "13-06-2025_dvf.csv"
OUTPUT_JSON = SCRIPT_DIR.parent / "data" / "properties.json"

# Limite pour le web (évite de charger 150+ Mo dans le navigateur)
WEB_SAMPLE_LIMIT = 20_000

# Paris : code commune INSEE 75101 (1er) à 75120 (20e arrondissement)
PARIS_COMMUNE_MIN = 75101
PARIS_COMMUNE_MAX = 75120


def _float_or_none(val):
    if pd.isna(val) or val == "" or str(val).lower() == "nan":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _int_or_none(val):
    if pd.isna(val) or val == "" or str(val).lower() == "nan":
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def build_address(row: pd.Series) -> str:
    """Reconstruit l'adresse à partir des colonnes DVF."""
    parts = []
    if pd.notna(row.get("adresse_numero")) and str(row["adresse_numero"]).strip():
        num = str(row["adresse_numero"]).strip()
        if num.replace(".", "").isdigit():
            num = str(int(float(num))) if "." in num else num
        parts.append(num)
    if pd.notna(row.get("adresse_suffixe")) and str(row["adresse_suffixe"]).strip():
        parts.append(str(row["adresse_suffixe"]).strip())
    if pd.notna(row.get("adresse_nom_voie")) and str(row["adresse_nom_voie"]).strip():
        voie = str(row["adresse_nom_voie"]).strip()
        if pd.notna(row.get("adresse_code_voie")) and str(row["adresse_code_voie"]).strip():
            voie = f"{voie} ({row['adresse_code_voie']})"
        parts.append(voie)
    if not parts:
        return str(row.get("adresse_nom_voie", "") or "Adresse non renseignée")
    return " ".join(parts)


def parse_id_parcelle(parcelle_id: str) -> tuple[list[str], str]:
    """
    Extrait section et parcelle depuis id_parcelle (ex: 75101000AB0216).
    Format: 6 chiffres (dep+commune) + 000 + 2 chars section + 4 chiffres parcelle.
    """
    if not parcelle_id or len(parcelle_id) < 13:
        return [], ""
    section = parcelle_id[9:11].strip()  # 2 caractères section
    nbpar = parcelle_id[11:].strip()     # parcelle
    return [section] if section else [], nbpar


def row_to_property(row: pd.Series, index: int) -> dict:
    """Convertit une ligne DVF en objet Property pour ImmoProspection V2."""
    mutation_id = str(row.get("id_mutation", ""))
    parcelle_id = str(row.get("id_parcelle", "")).strip()
    unique_id = f"{mutation_id}_{parcelle_id}" if parcelle_id else f"{mutation_id}_{index}"

    l_section, nbpar = parse_id_parcelle(parcelle_id)

    code_postal = row.get("code_postal")
    if pd.notna(code_postal):
        cp_str = str(int(code_postal)) if isinstance(code_postal, (int, float)) else str(code_postal)
        code_postal = cp_str.zfill(5) if len(cp_str) <= 5 else cp_str
    else:
        code_postal = ""

    libtyp = row.get("type_local")
    libtypbien = "" if pd.isna(libtyp) or str(libtyp).lower() == "nan" else str(libtyp).strip()

    nom_rue = build_address(row)
    # Clé adresse pour regrouper les transactions (sans le code voie entre parenthèses)
    adresse_base = nom_rue.split(" (")[0].strip() if " (" in nom_rue else nom_rue

    lots_carrez = []
    for i in range(1, 6):
        surf = _float_or_none(row.get(f"lot{i}_surface_carrez"))
        if surf is not None:
            lots_carrez.append({"lot": i, "surface_carrez": surf})

    return {
        "id": unique_id,
        "id_mutation": mutation_id,
        "id_parcelle": parcelle_id,
        "ville": str(row.get("nom_commune", "") or ""),
        "code_postal": code_postal,
        "nom_rue": nom_rue,
        "adresse_base": adresse_base,
        "valeurfonc": float(row["valeur_fonciere"]) if pd.notna(row.get("valeur_fonciere")) else None,
        "datemut": str(row.get("date_mutation", ""))[:10] if pd.notna(row.get("date_mutation")) else None,
        "libtypbien": libtypbien,
        "libnatmut": str(row.get("nature_mutation", "") or "").strip(),
        "l_section": l_section,
        "nbpar": nbpar or parcelle_id,
        "longitude": float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
        "latitude": float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
        "surface_reelle_bati": _float_or_none(row.get("surface_reelle_bati")),
        "surface_terrain": _float_or_none(row.get("surface_terrain")),
        "nombre_pieces_principales": _int_or_none(row.get("nombre_pieces_principales")),
        "lots_carrez": lots_carrez if lots_carrez else None,
        "nombre_lots": _int_or_none(row.get("nombre_lots")),
        "code_type_local": str(row.get("code_type_local", "") or "").strip() or None,
    }


def main():
    if not INPUT_CSV.exists():
        print(f"Erreur : fichier introuvable {INPUT_CSV}")
        return 1

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    print("Chargement du CSV DVF (Paris uniquement)...")
    print("  Lecture par chunks pour limiter la memoire...")

    # Lecture par chunks pour gérer le fichier de 3.5 Go
    chunk_size = 100_000
    all_properties = []
    total_rows = 0
    paris_rows = 0

    for chunk in pd.read_csv(INPUT_CSV, sep=",", low_memory=False, chunksize=chunk_size):
        total_rows += len(chunk)

        # Filtrer Paris : code_commune entre 75101 et 75120 (arrondissements)
        code_commune = pd.to_numeric(chunk["code_commune"], errors="coerce")
        mask = (code_commune >= PARIS_COMMUNE_MIN) & (code_commune <= PARIS_COMMUNE_MAX)
        paris_chunk = chunk[mask]
        paris_rows += len(paris_chunk)

        for i, (_, row) in enumerate(paris_chunk.iterrows()):
            prop = row_to_property(row, len(all_properties) + i)
            all_properties.append(prop)

        print(f"  Traite {total_rows:,} lignes -> {paris_rows:,} Paris", end="\r")

    print(f"\n  Total : {total_rows:,} lignes, {paris_rows:,} Paris retenues")

    # Limiter pour le web si pas --full
    export_data = all_properties
    if "--full" not in sys.argv and len(all_properties) > WEB_SAMPLE_LIMIT:
        export_data = all_properties[:WEB_SAMPLE_LIMIT]
        print(f"Export web : {len(export_data):,} biens (echantillon sur {len(all_properties):,})")
        print("  Utilisez --full pour tout exporter.")
    else:
        print(f"Export complet : {len(export_data):,} biens")

    print(f"Ecriture de {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    print(f"Termine. {len(export_data):,} biens exportes.")

    # Aperçu des types de biens
    types_count = {}
    for p in all_properties:
        t = p.get("libtypbien") or "Non renseigné"
        types_count[t] = types_count.get(t, 0) + 1
    print("\nRepartition par type de bien :")
    for t, c in sorted(types_count.items(), key=lambda x: -x[1])[:10]:
        print(f"  {t}: {c:,}")

    return 0


if __name__ == "__main__":
    exit(main())
