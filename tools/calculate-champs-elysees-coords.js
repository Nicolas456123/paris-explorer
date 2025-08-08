// Calculer les coordonnées approximatives sur les Champs-Élysées
// basées sur les numéros d'adresse

// Coordonnées de référence connues sur les Champs-Élysées
const champsElyseesCoords = {
    // Place de la Concorde (début, côté est) - numéro ~1-10
    start: { lat: 48.8656, lng: 2.3212, number: 1 },
    
    // Arc de Triomphe (fin, côté ouest) - numéro ~130-150  
    end: { lat: 48.8738, lng: 2.2950, number: 150 },
    
    // Points intermédiaires connus
    george_v: { lat: 48.8689, lng: 2.3011, number: 80 }, // Station George V environ n°80
    franklin_roosevelt: { lat: 48.8676, lng: 2.3134, number: 30 } // Station Franklin D Roosevelt environ n°30
};

function interpolateCoordinates(targetNumber) {
    const { start, end } = champsElyseesCoords;
    
    // Calcul de la progression linéaire le long de l'avenue
    const totalNumbers = end.number - start.number;
    const targetPosition = (targetNumber - start.number) / totalNumbers;
    
    // Interpolation linéaire pour latitude et longitude
    const lat = start.lat + (end.lat - start.lat) * targetPosition;
    const lng = start.lng + (end.lng - start.lng) * targetPosition;
    
    return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
}

// Calcul des coordonnées pour les boutiques problématiques
const boutiques = [
    { name: "Galeries Lafayette Champs-Élysées", number: 60 },
    { name: "Pierre Hermé Champs-Élysées", number: 72 },
    { name: "Ladurée Champs-Élysées", number: 75 }
];

console.log("🗺️ CALCUL DES COORDONNÉES CHAMPS-ÉLYSÉES");
console.log("==========================================");

boutiques.forEach(boutique => {
    const coords = interpolateCoordinates(boutique.number);
    console.log(`${boutique.name}:`);
    console.log(`  Adresse: ${boutique.number} Avenue des Champs-Élysées`);
    console.log(`  Coordonnées calculées: [${coords.lat}, ${coords.lng}]`);
    console.log();
});

// Coordonnées spécifiques pour les lieux du 1er arrondissement
console.log("🏛️ COORDONNÉES DU 1ER ARRONDISSEMENT");
console.log("====================================");

const premierArrondissement = [
    { name: "Palais-Royal", coords: [48.8631, 2.3370], address: "Place du Palais-Royal, 75001 Paris" },
    { name: "Le Grand Véfour", coords: [48.8661, 2.3380], address: "17 Rue de Beaujolais, 75001 Paris" },
    { name: "Restaurant du Palais Royal", coords: [48.8628, 2.3350], address: "43 Rue de Valois, 75001 Paris" },
    { name: "Louvre des Antiquaires", coords: [48.8630, 2.3372], address: "2 Place du Palais-Royal, 75001 Paris" }
];

premierArrondissement.forEach(lieu => {
    console.log(`${lieu.name}:`);
    console.log(`  Adresse: ${lieu.address}`);
    console.log(`  Coordonnées: [${lieu.coords[0]}, ${lieu.coords[1]}]`);
    console.log();
});

// Export des corrections en format JSON
const corrections = {
    "8eme-arrondissement": {
        "madeleine": [48.8687, 2.3212],
        "square-marcel-pagnol": [48.8759, 2.3203],
        "galeries-lafayette-champs-elysees": [48.8707, 2.3028],
        "pierre-herme-champs-elysees": [48.8713, 2.3008],
        "laduree-champs-elysees": [48.8715, 2.3002]
    },
    "1er-arrondissement": {
        "palais-royal": [48.8631, 2.3370],
        "le-grand-vefour": [48.8661, 2.3380],
        "restaurant-du-palais-royal": [48.8628, 2.3350],
        "louvre-des-antiquaires": [48.8630, 2.3372]
    }
};

console.log("📁 EXPORT JSON POUR CORRECTIONS");
console.log("================================");
console.log(JSON.stringify(corrections, null, 2));

module.exports = corrections;