// Entfernungsberechnung zwischen zwei Punkten auf der Erdoberfläche (Haversine).
// Läuft komplett im Browser, der Standort wird nie gesendet.

// Mittlerer Erdradius in km
const ERDRADIUS_KM = 6371.0088;

const rad = (grad) => (grad * Math.PI) / 180;

// Luftlinie in km zwischen zwei Punkten {lat, lon}, ungerundet
export function km(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
