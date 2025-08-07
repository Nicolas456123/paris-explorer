#!/usr/bin/env python3
"""
Analyse des coordonnées dans les fichiers JSON des arrondissements de Paris.
Recherche les problèmes suivants :
1. Coordonnées dupliquées (plusieurs lieux avec les mêmes coordonnées)
2. Lieux sans coordonnées
3. Coordonnées hors de Paris
4. Coordonnées suspectes (0,0 ou valeurs aberrantes)
"""

import json
import os
import glob
from collections import defaultdict

# Limites approximatives de Paris
PARIS_BOUNDS = {
    'lat_min': 48.815,
    'lat_max': 48.902,
    'lon_min': 2.224,
    'lon_max': 2.469
}

def load_json_files(directory):
    """Charge tous les fichiers JSON du dossier."""
    files_data = {}
    pattern = os.path.join(directory, "*.json")
    
    for file_path in glob.glob(pattern):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                filename = os.path.basename(file_path)
                files_data[filename] = data
                print(f"✓ Chargé: {filename}")
        except Exception as e:
            print(f"✗ Erreur lors du chargement de {file_path}: {e}")
    
    return files_data

def extract_all_coordinates(files_data):
    """Extrait toutes les coordonnées de tous les lieux."""
    all_places = []
    
    for filename, data in files_data.items():
        arrondissement = data.get('arrondissement', {})
        arr_id = arrondissement.get('id', filename)
        arr_center = arrondissement.get('center', [])
        
        categories = arrondissement.get('categories', {})
        
        for category_name, category_data in categories.items():
            places = category_data.get('places', [])
            
            for place in places:
                place_info = {
                    'file': filename,
                    'arrondissement_id': arr_id,
                    'arrondissement_center': arr_center,
                    'category': category_name,
                    'id': place.get('id', 'N/A'),
                    'name': place.get('name', 'N/A'),
                    'address': place.get('address', 'N/A'),
                    'coordinates': place.get('coordinates', [])
                }
                all_places.append(place_info)
    
    return all_places

def analyze_coordinates(places):
    """Analyse les coordonnées pour détecter les problèmes."""
    
    # 1. Grouper par coordonnées pour trouver les doublons
    coords_to_places = defaultdict(list)
    places_without_coords = []
    places_outside_paris = []
    suspicious_coords = []
    
    for place in places:
        coords = place['coordinates']
        
        # Vérifier si pas de coordonnées
        if not coords or len(coords) != 2:
            places_without_coords.append(place)
            continue
        
        lat, lon = coords
        
        # Coordonnées suspectes (0,0 ou valeurs aberrantes)
        if (lat == 0 and lon == 0) or abs(lat) > 90 or abs(lon) > 180:
            suspicious_coords.append(place)
        
        # Coordonnées hors de Paris
        if not (PARIS_BOUNDS['lat_min'] <= lat <= PARIS_BOUNDS['lat_max'] and 
                PARIS_BOUNDS['lon_min'] <= lon <= PARIS_BOUNDS['lon_max']):
            places_outside_paris.append(place)
        
        # Grouper par coordonnées
        coord_key = f"{lat:.6f},{lon:.6f}"
        coords_to_places[coord_key].append(place)
    
    # Identifier les coordonnées dupliquées
    duplicate_coords = {coord: places_list for coord, places_list in coords_to_places.items() 
                       if len(places_list) > 1}
    
    return {
        'duplicate_coords': duplicate_coords,
        'places_without_coords': places_without_coords,
        'places_outside_paris': places_outside_paris,
        'suspicious_coords': suspicious_coords,
        'total_places': len(places)
    }

def check_center_coordinates(places, duplicate_coords):
    """Vérifie si des lieux utilisent les coordonnées du centre de leur arrondissement."""
    center_duplicates = []
    
    for coord_str, places_list in duplicate_coords.items():
        if len(places_list) > 1:
            # Vérifier si ces coordonnées correspondent au centre d'un arrondissement
            for place in places_list:
                arr_center = place['arrondissement_center']
                if arr_center and len(arr_center) == 2:
                    center_lat, center_lon = arr_center
                    coord_key = f"{center_lat:.6f},{center_lon:.6f}"
                    if coord_key == coord_str:
                        center_duplicates.append({
                            'coordinates': coord_str,
                            'arrondissement_center': arr_center,
                            'places': places_list
                        })
                        break
    
    return center_duplicates

def print_report(analysis_results, places):
    """Affiche le rapport détaillé."""
    print("\n" + "="*80)
    print("RAPPORT D'ANALYSE DES COORDONNÉES - PARIS EXPLORER")
    print("="*80)
    
    total = analysis_results['total_places']
    print(f"\n📊 STATISTIQUES GÉNÉRALES")
    print(f"Total des lieux analysés: {total}")
    
    # 1. Coordonnées dupliquées
    duplicates = analysis_results['duplicate_coords']
    print(f"\n🔍 COORDONNÉES DUPLIQUÉES: {len(duplicates)} groupes trouvés")
    
    if duplicates:
        print("\nGroupes avec coordonnées identiques:")
        for coord, places_list in sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True):
            lat, lon = map(float, coord.split(','))
            print(f"\n  📍 Coordonnées [{lat:.6f}, {lon:.6f}] - {len(places_list)} lieux:")
            for place in places_list:
                print(f"    • {place['name']} ({place['arrondissement_id']}) - {place['category']}")
                print(f"      Fichier: {place['file']}")
    
    # 2. Vérification des centres d'arrondissement
    center_duplicates = check_center_coordinates(places, duplicates)
    if center_duplicates:
        print(f"\n⚠️  LIEUX UTILISANT LES COORDONNÉES DU CENTRE DE LEUR ARRONDISSEMENT:")
        for item in center_duplicates:
            coord_str = item['coordinates']
            center = item['arrondissement_center']
            places_list = item['places']
            print(f"\n  🎯 Centre d'arrondissement [{center[0]}, {center[1]}]:")
            for place in places_list:
                print(f"    • {place['name']} - {place['address']}")
                print(f"      Arrondissement: {place['arrondissement_id']} | Fichier: {place['file']}")
    
    # 3. Lieux sans coordonnées
    no_coords = analysis_results['places_without_coords']
    print(f"\n❌ LIEUX SANS COORDONNÉES: {len(no_coords)}")
    if no_coords:
        for place in no_coords:
            print(f"  • {place['name']} ({place['arrondissement_id']})")
            print(f"    Adresse: {place['address']}")
            print(f"    Fichier: {place['file']}")
    
    # 4. Coordonnées hors de Paris
    outside_paris = analysis_results['places_outside_paris']
    print(f"\n🌍 LIEUX HORS DE PARIS: {len(outside_paris)}")
    if outside_paris:
        print(f"Limites Paris: Lat {PARIS_BOUNDS['lat_min']}-{PARIS_BOUNDS['lat_max']}, Lon {PARIS_BOUNDS['lon_min']}-{PARIS_BOUNDS['lon_max']}")
        for place in outside_paris:
            coords = place['coordinates']
            print(f"  • {place['name']} - [{coords[0]}, {coords[1]}]")
            print(f"    Arrondissement: {place['arrondissement_id']} | Fichier: {place['file']}")
    
    # 5. Coordonnées suspectes
    suspicious = analysis_results['suspicious_coords']
    print(f"\n🚨 COORDONNÉES SUSPECTES: {len(suspicious)}")
    if suspicious:
        for place in suspicious:
            coords = place['coordinates']
            print(f"  • {place['name']} - [{coords[0]}, {coords[1]}]")
            print(f"    Arrondissement: {place['arrondissement_id']} | Fichier: {place['file']}")
    
    # Recherche spécifique des lieux mentionnés
    print(f"\n🔍 RECHERCHE SPÉCIFIQUE:")
    target_names = ["Square Marcel-Pagnol", "Madeleine", "Église de la Madeleine"]
    
    for place in places:
        for target in target_names:
            if target.lower() in place['name'].lower():
                coords = place['coordinates']
                center = place['arrondissement_center']
                is_same_as_center = (coords == center) if coords and center else False
                
                print(f"\n  🎯 Trouvé: {place['name']}")
                print(f"    Coordonnées: {coords}")
                print(f"    Centre arrondissement: {center}")
                print(f"    Mêmes coordonnées que le centre: {'OUI ⚠️' if is_same_as_center else 'NON ✓'}")
                print(f"    Fichier: {place['file']}")

def main():
    """Fonction principale."""
    data_dir = "data/arrondissements"
    
    if not os.path.exists(data_dir):
        print(f"❌ Dossier {data_dir} introuvable!")
        return
    
    print("🔍 Chargement des fichiers JSON...")
    files_data = load_json_files(data_dir)
    
    if not files_data:
        print("❌ Aucun fichier JSON trouvé!")
        return
    
    print(f"\n📊 {len(files_data)} fichiers chargés avec succès")
    
    print("\n🔍 Extraction des coordonnées...")
    all_places = extract_all_coordinates(files_data)
    
    print("\n🔍 Analyse des coordonnées...")
    results = analyze_coordinates(all_places)
    
    print_report(results, all_places)

if __name__ == "__main__":
    main()