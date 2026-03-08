"""
Extraction des données INSEE carreaux 200m pour Paris uniquement.
Source : https://www.insee.fr/fr/statistiques/4176290
Données FiLoSoFi 2015 - Démographie, ménages, logements par carreau de 200m.

Usage:
    python extract_insee_carreaux.py              # Télécharge et extrait (si pas de CSV local)
    python extract_insee_carreaux.py --no-dl    # Utilise le CSV déjà téléchargé

Fichiers:
    Téléchargement : Filosofi2015_carreaux_200m_csv.zip (69 Mo)
    Sortie : ../data/insee_carreaux_paris.json
"""

import json
import sys
import zipfile
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Erreur : pandas requis. Installez avec: pip install pandas")
    sys.exit(1)

try:
    import py7zr
except ImportError:
    py7zr = None

import subprocess

# Chemins
SCRIPT_DIR = Path(__file__).parent
ZIP_PATH = SCRIPT_DIR / "Filosofi2015_carreaux_200m_csv.zip"
EXTRACT_DIR = SCRIPT_DIR / "_insee_extract"
OUTPUT_JSON = SCRIPT_DIR.parent / "data" / "insee_carreaux_paris.json"
ZONE_BBOX_JSON = SCRIPT_DIR.parent / "data" / "zone_bbox_paris.json"

# Paris : Depcom 75101 (1er) à 75120 (20e arrondissement)
PARIS_DEPCOM = {f"751{i:02d}" for i in range(1, 21)}

INSEE_CSV_URL = "https://www.insee.fr/fr/statistiques/fichier/4176290/Filosofi2015_carreaux_200m_csv.zip"


def download_if_needed():
    """Télécharge le zip INSEE si absent."""
    if ZIP_PATH.exists():
        print(f"Fichier zip déjà présent : {ZIP_PATH}")
        return True
    print(f"Téléchargement de {INSEE_CSV_URL} (~69 Mo)...")
    try:
        import urllib.request

        urllib.request.urlretrieve(INSEE_CSV_URL, ZIP_PATH)
        print("Téléchargement terminé.")
        return True
    except Exception as e:
        print(f"Erreur téléchargement : {e}")
        return False


def depcom_to_code_postal(depcom: str) -> str:
    """Convertit Depcom (75101) en code postal (75001)."""
    if not depcom or len(depcom) < 5:
        return ""
    # 75101 -> 75001, 75120 -> 75020
    return "75" + depcom[-2:].zfill(3)


def _parse_id_inspire_to_bbox(id_inspire: str, cell_size_m: int = 200):
    """
    Parse IdINSPIRE (ex: CRS3035RES200mN2684400E649800) pour extraire bbox en WGS84.
    Retourne (min_lat, max_lat, min_lon, max_lon) ou None si échec.
    """
    import re
    m = re.search(r"N(\d+)E(\d+)$", str(id_inspire or ""), re.I)
    if not m:
        return None
    northing = int(m.group(1))
    easting = int(m.group(2))
    try:
        from pyproj import Transformer
        # CRS3035 = ETRS89-LCC Europe, ou Lambert 93 pour France
        trans = Transformer.from_crs("EPSG:3035", "EPSG:4326", always_xy=True)
        x1, y1 = easting, northing
        x2, y2 = easting + cell_size_m, northing + cell_size_m
        lon1, lat1 = trans.transform(x1, y1)
        lon2, lat2 = trans.transform(x2, y2)
        return (min(lat1, lat2), max(lat1, lat2), min(lon1, lon2), max(lon1, lon2))
    except Exception:
        return None


def _build_zone_bbox(carreaux: list) -> dict:
    """Construit { id_carr1km: { minLat, maxLat, minLon, maxLon } } pour filtrage DVF."""
    zones = {}
    for c in carreaux:
        zid = c.get("id_carr1km", "").strip()
        if not zid:
            continue
        bbox = _parse_id_inspire_to_bbox(c.get("id", ""))
        if not bbox:
            continue
        min_lat, max_lat, min_lon, max_lon = bbox
        if zid not in zones:
            zones[zid] = {"minLat": min_lat, "maxLat": max_lat, "minLon": min_lon, "maxLon": max_lon}
        else:
            z = zones[zid]
            z["minLat"] = min(z["minLat"], min_lat)
            z["maxLat"] = max(z["maxLat"], max_lat)
            z["minLon"] = min(z["minLon"], min_lon)
            z["maxLon"] = max(z["maxLon"], max_lon)
    return zones


def _get(row, *keys, default=0):
    """Récupère une valeur avec fallback sur plusieurs noms de colonnes."""
    for k in keys:
        if k in row.index:
            v = row[k]
            return v if pd.notna(v) else default
    return default


def row_to_carreau(row) -> dict:
    """Convertit une ligne CSV en objet carreau pour l'API."""
    depcom = str(_get(row, "Depcom", "DEPCOM", default="")).strip().zfill(5)
    code_postal = depcom_to_code_postal(depcom)

    return {
        "id": str(_get(row, "IdINSPIRE", "IdINSPIRE", default="")).strip(),
        "depcom": depcom,
        "code_postal": code_postal,
        "id_carr1km": str(_get(row, "Id_carr1km", default="")).strip(),
        "ind": int(_get(row, "Ind", default=0) or 0),
        "men": int(_get(row, "Men", default=0) or 0),
        "men_pauv": int(_get(row, "Men_pauv", default=0) or 0),
        "men_prop": int(_get(row, "Men_prop", default=0) or 0),
        "men_1ind": int(_get(row, "Men_1ind", default=0) or 0),
        "men_5ind": int(_get(row, "Men_5ind", default=0) or 0),
        "men_fmp": int(_get(row, "Men_fmp", default=0) or 0),
        "men_coll": int(_get(row, "Men_coll", default=0) or 0),
        "men_mais": int(_get(row, "Men_mais", default=0) or 0),
        "men_surf": float(_get(row, "Men_surf", default=0) or 0),
        "ind_snv": float(_get(row, "Ind_snv", default=0) or 0),
        "log_av45": int(_get(row, "Log_av45", default=0) or 0),
        "log_45_70": int(_get(row, "Log_45_70", default=0) or 0),
        "log_70_90": int(_get(row, "Log_70_90", default=0) or 0),
        "log_ap90": int(_get(row, "Log_ap90", default=0) or 0),
        "log_inc": int(_get(row, "Log_inc", default=0) or 0),
        "log_soc": int(_get(row, "Log_soc", default=0) or 0),
        "i_est_cr": int(_get(row, "I_est_cr", default=0) or 0),
        "i_est_1km": int(_get(row, "I_est_1km", default=0) or 0),
    }


def main():
    if "--no-dl" not in sys.argv and not download_if_needed():
        return 1

    if not ZIP_PATH.exists():
        print(f"Erreur : fichier introuvable {ZIP_PATH}")
        print("  Téléchargez-le depuis https://www.insee.fr/fr/statistiques/4176290")
        return 1

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    print("Extraction du zip...")
    EXTRACT_DIR.mkdir(exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        names = zf.namelist()
        # Le zip peut contenir un .7z
        archive_7z = next((n for n in names if n.endswith(".7z")), None)
        if archive_7z:
            zf.extract(archive_7z, EXTRACT_DIR)
            path_7z = EXTRACT_DIR / archive_7z
            if py7zr:
                with py7zr.SevenZipFile(path_7z, "r") as z7:
                    z7.extractall(EXTRACT_DIR)
            else:
                # Essayer 7z en ligne de commande
                exe_candidates = [
                    "7z",
                    "7za",
                    r"C:\Program Files\7-Zip\7z.exe",
                    r"C:\Program Files (x86)\7-Zip\7z.exe",
                ]
                for exe in exe_candidates:
                    try:
                        subprocess.run(
                            [exe, "x", str(path_7z), f"-o{EXTRACT_DIR}", "-y"],
                            check=True,
                            capture_output=True,
                        )
                        break
                    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
                        continue
                else:
                    print(
                        "Erreur : pour extraire le .7z, installez py7zr (pip install py7zr) ou 7-Zip"
                    )
                    return 1
            csv_files = list(EXTRACT_DIR.rglob("*.csv"))
        else:
            zf.extractall(EXTRACT_DIR)
            csv_files = list(EXTRACT_DIR.rglob("*.csv"))

        csv_name = next((f for f in csv_files if "metropole" in f.name.lower() and "200m" in f.name.lower()), None)
        if not csv_name:
            csv_name = next((f for f in csv_files if "200m" in f.name.lower()), csv_files[0] if csv_files else None)
        if not csv_name:
            print("Aucun fichier CSV trouvé.")
            return 1

        csv_path = Path(csv_name) if not isinstance(csv_name, Path) else csv_name
        try:
            df = pd.read_csv(csv_path, sep=",", low_memory=False, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(csv_path, sep=",", low_memory=False, encoding="latin-1")
        # Normaliser les noms de colonnes
        df.columns = df.columns.str.strip()
        depcom_col = next((c for c in df.columns if c.upper() == "DEPCOM"), None)
        if depcom_col:
            df["Depcom"] = df[depcom_col].astype(str).str.zfill(5)
        else:
            df["Depcom"] = ""

    print(f"  {len(df):,} lignes chargées")

    # Filtrer Paris (Depcom 75101-75120)
    mask = df["Depcom"].isin(PARIS_DEPCOM)
    df_paris = df[mask]
    print(f"  {len(df_paris):,} carreaux Paris retenus")

    carreaux = [row_to_carreau(row) for _, row in df_paris.iterrows()]

    print(f"Ecriture de {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(carreaux, f, ensure_ascii=False, indent=2)

    print(f"Terminé. {len(carreaux):,} carreaux exportés.")

    # Générer zone_bbox pour filtrage DVF par zone (id_carr1km)
    try:
        zone_bbox = _build_zone_bbox(carreaux)
        with open(ZONE_BBOX_JSON, "w", encoding="utf-8") as f:
            json.dump(zone_bbox, f, ensure_ascii=False)
        print(f"  {ZONE_BBOX_JSON}: {len(zone_bbox):,} zones (bbox WGS84)")
    except Exception as e:
        print(f"  Attention: zone_bbox non généré ({e}). Installez pyproj: pip install pyproj")

    # Stats par arrondissement
    by_cp = {}
    for c in carreaux:
        cp = c.get("code_postal", "")
        by_cp[cp] = by_cp.get(cp, 0) + 1
    print("\nRépartition par arrondissement :")
    for cp in sorted(by_cp.keys()):
        print(f"  {cp}: {by_cp[cp]:,} carreaux")

    return 0


if __name__ == "__main__":
    exit(main())
