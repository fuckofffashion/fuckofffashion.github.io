// Link zur Routenplanung auf openstreetmap.org. Reine Funktion, kein DOM.
const ENGINES = { rad: "fossgis_osrm_bike", fuss: "fossgis_osrm_foot", auto: "fossgis_osrm_car" };

// Ohne Start bleibt das erste Koordinatenpaar leer: OSM fragt dann selbst nach dem Start.
export function routenLink(ziel, start = null, modus = "rad") {
  const engine = ENGINES[modus] ?? ENGINES.rad;
  const paar = (p) => (p ? `${p.lat}%2C${p.lon}` : "");
  return `https://www.openstreetmap.org/directions?engine=${engine}&route=${paar(start)}%3B${paar(ziel)}`;
}
