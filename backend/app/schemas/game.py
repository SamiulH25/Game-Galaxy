from pydantic import BaseModel


class PlanetCharacteristics(BaseModel):
    type: str
    # rings
    ringColor: str | None = None
    ringWidth: float | None = None
    ringOpacity: float | None = None
    ringCount: int | None = None
    # moons
    moonCount: int | None = None
    moonSize: float | None = None
    moonOrbitRadius: float | None = None
    moonColor: str | None = None
    # atmosphere
    atmoColor: str | None = None
    atmoIntensity: float | None = None
    # asteroid belt
    beltColor: str | None = None
    beltOpacity: float | None = None
    beltCount: int | None = None
    beltWidth: float | None = None


class GameManifestResponse(BaseModel):
    id: str
    title: str
    description: str
    planetName: str
    solarSystemId: str
    solarSystemName: str
    planetColor: str
    planetSize: float
    orbitRadius: float
    orbitSpeed: float
    thumbnail: str | None = None
    tags: list[str] = []
    characteristics: PlanetCharacteristics | None = None
    # Rich metadata for planet popup
    detailedDescription: str | None = None
    screenshots: list[str] | None = None
    difficulty: str | None = None
    controls: str | None = None
    genre: str | None = None
    type: str = "html"


class StarProperties(BaseModel):
    starColor: str = "#ffcc44"
    starEmissive: str = "#ff8800"
    starSize: float = 2.0
    glowColor: str = "#ffaa22"
    glowIntensity: float = 0.8
    ambientColor: str = "#1a1a30"


class SolarSystemInfo(BaseModel):
    id: str
    name: str
    game_count: int
    star: StarProperties = StarProperties()
