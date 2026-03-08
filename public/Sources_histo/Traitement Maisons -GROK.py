import pandas as pd
import numpy as np
import requests
import ast  # Pour parser les strings de listes
import json  # Pour charger les GeoJSON locaux
import time  # Pour sleep anti-rate limit

# Chemin du dossier avec les GeoJSON (ajustez)
GEOJSON_FOLDER = r'E:\Desktop\DVF Charlie\GeoJSON'

# Étape 1 : Charger le CSV
df = pd.read_csv(r'E:\Desktop\DVF Charlie\mutations_d75_Maisons_EXTRAIT.csv', sep=';', low_memory=False)

# Parser les colonnes de listes
def parse_list_column(value):
    try:
        return ast.literal_eval(value)
    except:
        return []

df['l_codinsee'] = df['l_codinsee'].apply(parse_list_column)
df['l_idpar'] = df['l_idpar'].apply(parse_list_column)
df['l_idparmut'] = df['l_idparmut'].apply(parse_list_column)

# Fonction pour extraire adresse d'une liste d'ID parcelles (première parcelle)
def get_address_from_parcelles(parcelles, code_insee):
    if not parcelles or not code_insee:
        return "Non trouvé"
    
    parcelle_id = parcelles[0]  # Première parcelle
    
    # Charger le GeoJSON local pour l'arrondissement
    geojson_path = f"{GEOJSON_FOLDER}\\cadastre-{code_insee}-parcelles.json"
    try:
        with open(geojson_path, 'r', encoding='utf-8') as f:
            geo_data = json.load(f)
    except FileNotFoundError:
        return f"GeoJSON non trouvé pour {code_insee}"
    except Exception as e:
        return f"Erreur chargement GeoJSON: {str(e)}"
    
    # Trouver la feature avec id correspondant
    matching_feature = next((feature for feature in geo_data['features'] if feature['properties']['id'] == parcelle_id), None)
    
    if not matching_feature:
        return "Parcelle non trouvée dans GeoJSON"
    
    # Étape 5 : Calculer centroïde du polygon (premier ring)
    geometry = matching_feature['geometry']
    if 'coordinates' not in geometry or not geometry['coordinates']:
        return "Geometry non trouvée"
    
    coords = np.array(geometry['coordinates'][0])  # [lon, lat] pairs
    centroid_lon = np.mean(coords[:, 0])
    centroid_lat = np.mean(coords[:, 1])
    
    # Étape 6 : Reverse geocoding
    reverse_url = f"https://api-adresse.data.gouv.fr/reverse/?lon={centroid_lon}&lat={centroid_lat}"
    try:
        response = requests.get(reverse_url)
        if response.status_code != 200:
            return f"Erreur API Adresse: {response.status_code}"
        address_json = response.json()
        
        if address_json['features']:
            address = address_json['features'][0]['properties']['label']
            return address
        else:
            return "Adresse non trouvée"
    
    except Exception as e:
        return f"Exception: {str(e)}"
    
    finally:
        time.sleep(0.5)  # Anti-rate limit

# Appliquer la fonction (utiliser l_idparmut si applicable, et l_codinsee[0] sans brackets)
df['adresse_complete'] = df.apply(
    lambda row: get_address_from_parcelles(
        row['l_idparmut'] if len(row['l_idparmut']) > 0 else row['l_idpar'],
        row['l_codinsee'][0].strip("[']") if row['l_codinsee'] else None
    ),
    axis=1
)

# Exporter
df.to_csv(r'E:\Desktop\DVF Charlie\mutations_d75_Maisons_geocodees.csv', sep=';', index=False)
print("Traitement terminé. Fichier exporté : mutations_d75_Maisons_EXTRAIT_geocodees.csv")