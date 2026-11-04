"""Datenmodell für Konzerttermine."""
from dataclasses import asdict, dataclass, field


@dataclass
class Termin:
    id: str
    quelle: str
    datum: str  # YYYY-MM-DD
    zeit: str | None
    bands: str
    zusatz: str
    laden: str
    plz: str | None
    stadt: str
    land: str | None  # "DE" / "NL" / "BE", "X" = fremdes Land, None = unbekannt
    lat: float | None = None
    lon: float | None = None
    genau: bool = False
    genres: list[str] = field(default_factory=list)
    frei: bool = False
    kommerz: bool = False
    links: list[dict] = field(default_factory=list)
    text: str = ""  # Sonstiges + Preis, nur intern (roh, die Seite escaped)

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("text")
        return d
