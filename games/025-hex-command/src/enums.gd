extends Node
## Hex Command — Type definitions and constants.

enum UnitType {
	INFANTRY = 0,
	TANK = 1,
	ARTILLERY = 2,
	SCOUT = 3,
	MECH = 4,
}

enum TerrainType {
	PLAINS = 0,
	FOREST = 1,
	MOUNTAIN = 2,
	WATER = 3,
	CITY = 4,
	ROAD = 5,
}

enum AIDifficulty {
	EASY = 0,
	NORMAL = 1,
	HARD = 2,
}

enum TurnPhase {
	PLAYER_MOVE = 0,
	PLAYER_ACTION = 1,
	ENEMY_MOVE = 2,
	ENEMY_ACTION = 3,
	GAME_OVER = 4,
	VICTORY = 5,
}

const HEX_DIRS: Array[Vector2i] = [
	Vector2i(1, 0), Vector2i(1, -1), Vector2i(0, -1),
	Vector2i(-1, 0), Vector2i(-1, 1), Vector2i(0, 1)
]

const TERRAIN_NAMES: Dictionary = {
	TerrainType.PLAINS: "Plains",
	TerrainType.FOREST: "Forest",
	TerrainType.MOUNTAIN: "Mountain",
	TerrainType.WATER: "Water",
	TerrainType.CITY: "City",
	TerrainType.ROAD: "Road",
}

const TERRAIN_COLORS: Dictionary = {
	TerrainType.PLAINS: Color(0.4, 0.55, 0.3),
	TerrainType.FOREST: Color(0.15, 0.4, 0.15),
	TerrainType.MOUNTAIN: Color(0.5, 0.45, 0.35),
	TerrainType.WATER: Color(0.1, 0.3, 0.5),
	TerrainType.CITY: Color(0.45, 0.45, 0.5),
	TerrainType.ROAD: Color(0.5, 0.45, 0.4),
}

const TERRAIN_MOVEMENT_COST: Dictionary = {
	TerrainType.PLAINS: [1, 1, 1, 1, 1],
	TerrainType.FOREST: [2, 3, 3, 1, 2],
	TerrainType.MOUNTAIN: [3, 99, 99, 2, 3],
	TerrainType.WATER: [99, 99, 99, 99, 99],
	TerrainType.CITY: [1, 1, 1, 1, 1],
	TerrainType.ROAD: [1, 1, 1, 1, 1],
}

const TERRAIN_DEFENSE: Dictionary = {
	TerrainType.PLAINS: 0,
	TerrainType.FOREST: 2,
	TerrainType.MOUNTAIN: 3,
	TerrainType.WATER: 0,
	TerrainType.CITY: 1,
	TerrainType.ROAD: 0,
}
