#!/usr/bin/env python3
"""
Script rapide pour identifier les problèmes de coordonnées dans les données Paris Explorer
"""
import json
import os
import sys
from collections import Counter, defaultdict

class QuickCoordinateChecker:
    def __init__(self):
        self.arrondissements_dir = './data/arrondissements'
        self.all_places = []
        self.stats = {
            'total': 0,
            'with_coords': 0,
            'without_coords': 0,
            'duplicate_coords': 0,
            'out_of_paris': 0,
            'invalid_coords': 0
        }
        self.paris_bounds = {
            'lat_min': 48.815,
            'lat_max': 48.902,
            'lng_min': 2.224,
            'lng_max': 2.469
        }

    def is_valid_coords(self, coords):
        """Vérifier si les coordonnées sont valides"""
        if not coords or not isinstance(coords, list) or len(coords) < 2:
            return False
        
        try:
            lat, lng = float(coords[0]), float(coords[1])
            return True
        except (ValueError, TypeError):
            return False

    def is_in_paris(self, coords):
        """Vérifier si les coordonnées sont dans Paris"""
        if not self.is_valid_coords(coords):
            return False
        
        lat, lng = float(coords[0]), float(coords[1])
        return (self.paris_bounds['lat_min'] <= lat <= self.paris_bounds['lat_max'] and
                self.paris_bounds['lng_min'] <= lng <= self.paris_bounds['lng_max'])

    def process_file(self, filename):
        """Traiter un fichier d'arrondissement"""
        filepath = os.path.join(self.arrondissements_dir, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            arr_data = data.get('arrondissement', {})
            arr_id = arr_data.get('id', filename.replace('.json', ''))
            categories = arr_data.get('categories', {})
            
            for cat_key, cat_data in categories.items():
                places = cat_data.get('places', [])
                
                for place in places:
                    place_info = {
                        'arrondissement': arr_id,
                        'category': cat_key,
                        'name': place.get('name', 'Sans nom'),
                        'address': place.get('address', ''),
                        'coordinates': place.get('coordinates'),
                        'filename': filename
                    }
                    
                    self.all_places.append(place_info)
                    self.stats['total'] += 1
                    
                    # Analyser les coordonnées
                    coords = place.get('coordinates')
                    if coords:
                        self.stats['with_coords'] += 1
                        if not self.is_valid_coords(coords):
                            self.stats['invalid_coords'] += 1
                        elif not self.is_in_paris(coords):
                            self.stats['out_of_paris'] += 1
                    else:
                        self.stats['without_coords'] += 1
                        
        except Exception as e:
            print(f"❌ Erreur lecture {filename}: {e}")

    def check_all_files(self):
        """Vérifier tous les fichiers"""
        if not os.path.exists(self.arrondissements_dir):
            print(f"❌ Dossier {self.arrondissements_dir} introuvable")
            return
        
        files = [f for f in os.listdir(self.arrondissements_dir) if f.endswith('.json')]
        files.sort()
        
        print(f"🔍 Analyse de {len(files)} fichiers d'arrondissements...\n")
        
        for filename in files:
            self.process_file(filename)
        
        self.analyze_results()

    def analyze_results(self):
        """Analyser les résultats"""
        print("📊 RÉSULTATS DE L'ANALYSE")
        print("=" * 50)
        print(f"Total des lieux: {self.stats['total']}")
        print(f"Avec coordonnées: {self.stats['with_coords']} ({self.stats['with_coords']/self.stats['total']*100:.1f}%)")
        print(f"Sans coordonnées: {self.stats['without_coords']} ({self.stats['without_coords']/self.stats['total']*100:.1f}%)")
        print(f"Coordonnées invalides: {self.stats['invalid_coords']}")
        print(f"Hors de Paris: {self.stats['out_of_paris']}")
        
        # Analyser les coordonnées dupliquées
        coords_counter = Counter()
        coords_to_places = defaultdict(list)
        
        for place in self.all_places:
            if place['coordinates']:
                coords_str = str(place['coordinates'])
                coords_counter[coords_str] += 1
                coords_to_places[coords_str].append(place)
        
        duplicates = {k: v for k, v in coords_counter.items() if v > 1}
        self.stats['duplicate_coords'] = len(duplicates)
        
        print(f"Coordonnées dupliquées: {len(duplicates)} ensembles")
        
        # Afficher les problèmes les plus fréquents
        if duplicates:
            print(f"\n🔁 COORDONNÉES DUPLIQUÉES (Top 10):")
            print("-" * 40)
            for coords_str, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"{coords_str}: {count} lieux")
                # Afficher quelques exemples
                examples = coords_to_places[coords_str][:3]
                for place in examples:
                    print(f"  - {place['name']} ({place['arrondissement']})")
                if len(coords_to_places[coords_str]) > 3:
                    print(f"  ... et {len(coords_to_places[coords_str])-3} autres")
                print()
        
        # Lieux sans coordonnées par arrondissement
        no_coords_by_arr = defaultdict(list)
        for place in self.all_places:
            if not place['coordinates']:
                no_coords_by_arr[place['arrondissement']].append(place)
        
        if no_coords_by_arr:
            print("\n❓ LIEUX SANS COORDONNÉES par arrondissement:")
            print("-" * 45)
            for arr, places in sorted(no_coords_by_arr.items()):
                print(f"{arr}: {len(places)} lieux")
                for place in places[:5]:  # Afficher les 5 premiers
                    print(f"  - {place['name']}")
                if len(places) > 5:
                    print(f"  ... et {len(places)-5} autres")
                print()
        
        # Coordonnées hors de Paris
        out_of_paris_places = [p for p in self.all_places 
                              if p['coordinates'] and self.is_valid_coords(p['coordinates']) 
                              and not self.is_in_paris(p['coordinates'])]
        
        if out_of_paris_places:
            print("\n🌍 COORDONNÉES HORS DE PARIS:")
            print("-" * 30)
            for place in out_of_paris_places:
                print(f"{place['name']} ({place['arrondissement']}): {place['coordinates']}")
        
        # Coordonnées invalides
        invalid_places = [p for p in self.all_places 
                         if p['coordinates'] and not self.is_valid_coords(p['coordinates'])]
        
        if invalid_places:
            print("\n❌ COORDONNÉES INVALIDES:")
            print("-" * 25)
            for place in invalid_places:
                print(f"{place['name']} ({place['arrondissement']}): {place['coordinates']}")
        
        # Recommandations
        print("\n💡 RECOMMANDATIONS:")
        print("-" * 20)
        if self.stats['without_coords'] > 0:
            print(f"• Ajouter des coordonnées pour {self.stats['without_coords']} lieux")
        if len(duplicates) > 0:
            print(f"• Corriger {len(duplicates)} ensembles de coordonnées dupliquées")
        if self.stats['out_of_paris'] > 0:
            print(f"• Vérifier {self.stats['out_of_paris']} lieux avec des coordonnées hors de Paris")
        if self.stats['invalid_coords'] > 0:
            print(f"• Corriger {self.stats['invalid_coords']} coordonnées invalides")

def main():
    checker = QuickCoordinateChecker()
    checker.check_all_files()

if __name__ == "__main__":
    main()