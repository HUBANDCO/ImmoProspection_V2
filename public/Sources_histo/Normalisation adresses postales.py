import pandas as pd
import requests

# Chemin de ton fichier d'entrée (ajuste si besoin)
input_file = r'E:\Desktop\DVF Charlie\mutations_d75_Maisons_DATA_PARIS_geocodees_V2.xlsx'

# Charger le fichier XLSX (spécifie la feuille si besoin)
df = pd.read_excel(input_file, sheet_name='mutations_d75_Maisons_DATA_PARI', engine='openpyxl')

# Fonction pour valider et extraire les champs via l'API
def valider_et_extraire(adresse_complete):
    if pd.isna(adresse_complete) or not adresse_complete:
        return {
            'valide': False,
            'score': 0.0,
            'numero': '',
            'complement': '',
            'type_voie': '',
            'nom_rue': '',
            'code_postal': '',
            'ville': ''
        }
    
    # Nettoyer légèrement l'adresse (enlever suffixes inutiles)
    adresse_complete = adresse_complete.replace(',Paris 20e Arrondissement', '').strip()
    
    url = f"https://api-adresse.data.gouv.fr/search/?q={adresse_complete}&limit=1"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data['features']:
                feature = data['features'][0]['properties']
                score = feature.get('score', 0.0)
                if score > 0.8:  # Seuil ajustable pour considérer comme valide
                    # Extraire les champs
                    numero = feature.get('housenumber', '')
                    # Complément : extraire si extension comme 'bis' ou lettre
                    complement = ''
                    if numero and ' ' in numero:
                        parts = numero.split()
                        numero = parts[0]
                        complement = ' '.join(parts[1:])
                    elif 'extension' in feature:
                        complement = feature['extension']
                    
                    type_voie = feature.get('type', '')  # Souvent inféré, sinon parsing
                    nom_rue = feature.get('name', '')
                    code_postal = feature.get('postcode', '')
                    ville = feature.get('city', '')
                    
                    return {
                        'valide': True,
                        'score': score,
                        'numero': numero,
                        'complement': complement,
                        'type_voie': type_voie,
                        'nom_rue': nom_rue,
                        'code_postal': code_postal,
                        'ville': ville
                    }
                else:
                    return {
                        'valide': False,
                        'score': score,
                        'numero': '',
                        'complement': '',
                        'type_voie': '',
                        'nom_rue': '',
                        'code_postal': '',
                        'ville': ''
                    }
            else:
                return {
                    'valide': False,
                    'score': 0.0,
                    'numero': '',
                    'complement': '',
                    'type_voie': '',
                    'nom_rue': '',
                    'code_postal': '',
                    'ville': ''
                }
        else:
            return {
                'valide': False,
                'score': 0.0,
                'numero': '',
                'complement': '',
                'type_voie': '',
                'nom_rue': '',
                'code_postal': '',
                'ville': ''
            }
    except Exception as e:
        print(f"Erreur API : {str(e)}")
        return {
            'valide': False,
            'score': 0.0,
            'numero': '',
            'complement': '',
            'type_voie': '',
            'nom_rue': '',
            'code_postal': '',
            'ville': ''
        }

# Appliquer la fonction avec progression
total_rows = len(df)
for index, row in df.iterrows():
    result = valider_et_extraire(row['adresse_complete'])
    for key, value in result.items():
        df.at[index, key] = value
    # Afficher la progression
    progress = (index + 1) / total_rows * 100
    print(f"Progression : {progress:.1f}% ({index + 1}/{total_rows})", end="\r")

# Chemin du fichier de sortie
output_file = r'E:\Desktop\DVF Charlie\mutations_d75_Maisons_geocodees_normalisees_V2.xlsx'

# Exporter en XLSX
df.to_excel(output_file, index=False, engine='openpyxl')

print(f"\nFichier normalisé et validé exporté : {output_file}")