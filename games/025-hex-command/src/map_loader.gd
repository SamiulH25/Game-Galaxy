## MapLoader — Loads campaign map data from JSON-like Dictionary.
extends RefCounted

const Enums = preload("res://src/enums.gd")

## Mission data structures.
var missions: Dictionary = {}


func _init():
	_load_missions()


func _load_missions():
	missions = {
		"mission_01": {
			"name": "First Contact",
			"briefing": "Intelligence reports enemy forces massing near our border. Advance and eliminate them.",
			"width": 12,
			"height": 8,
			"player_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 4},
				{"type": Enums.UnitType.TANK, "q": 3, "r": 3},
			],
			"enemy_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 9, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 9, "r": 4},
			],
			"terrain": "plains_01",
			"victory_type": "rout",  # rout = kill all enemies
			"ai_difficulty": Enums.AIDifficulty.EASY,
			"bonus_objective": "Lose no units",
		},
		"mission_02": {
			"name": "The River Crossing",
			"briefing": "The enemy has fortified the river crossing. Secure the bridgehead.",
			"width": 14,
			"height": 10,
			"player_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 5},
				{"type": Enums.UnitType.INFANTRY, "q": 3, "r": 4},
				{"type": Enums.UnitType.TANK, "q": 2, "r": 4},
				{"type": Enums.UnitType.SCOUT, "q": 3, "r": 5},
			],
			"enemy_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 8, "r": 2},
				{"type": Enums.UnitType.INFANTRY, "q": 9, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 10, "r": 4},
				{"type": Enums.UnitType.TANK, "q": 9, "r": 7},
				{"type": Enums.UnitType.TANK, "q": 10, "r": 6},
			],
			"terrain": "river_crossing",
			"victory_type": "rout",
			"ai_difficulty": Enums.AIDifficulty.NORMAL,
			"bonus_objective": "Capture the bridge in 8 turns",
		},
		"mission_03": {
			"name": "Forest Ambush",
			"briefing": "The enemy is using the forest for cover. Flush them out and take the high ground.",
			"width": 16,
			"height": 12,
			"player_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 5},
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 6},
				{"type": Enums.UnitType.TANK, "q": 3, "r": 5},
				{"type": Enums.UnitType.ARTILLERY, "q": 1, "r": 6},
				{"type": Enums.UnitType.SCOUT, "q": 3, "r": 6},
			],
			"enemy_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 10, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 11, "r": 4},
				{"type": Enums.UnitType.INFANTRY, "q": 12, "r": 5},
				{"type": Enums.UnitType.MECH, "q": 11, "r": 6},
				{"type": Enums.UnitType.MECH, "q": 10, "r": 7},
				{"type": Enums.UnitType.TANK, "q": 12, "r": 8},
			],
			"terrain": "forest_ambush",
			"victory_type": "rout",
			"ai_difficulty": Enums.AIDifficulty.NORMAL,
			"bonus_objective": "Destroy the enemy Mech units",
		},
		"mission_04": {
			"name": "Mountain Pass",
			"briefing": "The enemy holds the mountain pass. Break through to the valley beyond.",
			"width": 18,
			"height": 12,
			"player_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 5},
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 6},
				{"type": Enums.UnitType.TANK, "q": 3, "r": 5},
				{"type": Enums.UnitType.ARTILLERY, "q": 1, "r": 6},
				{"type": Enums.UnitType.MECH, "q": 3, "r": 6},
				{"type": Enums.UnitType.SCOUT, "q": 1, "r": 5},
			],
			"enemy_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 12, "r": 2},
				{"type": Enums.UnitType.TANK, "q": 13, "r": 3},
				{"type": Enums.UnitType.TANK, "q": 14, "r": 4},
				{"type": Enums.UnitType.MECH, "q": 13, "r": 5},
				{"type": Enums.UnitType.ARTILLERY, "q": 15, "r": 5},
				{"type": Enums.UnitType.INFANTRY, "q": 14, "r": 7},
				{"type": Enums.UnitType.INFANTRY, "q": 13, "r": 8},
				{"type": Enums.UnitType.TANK, "q": 15, "r": 9},
			],
			"terrain": "mountain_pass",
			"victory_type": "rout",
			"ai_difficulty": Enums.AIDifficulty.HARD,
			"bonus_objective": "Complete in 12 turns",
		},
		"mission_05": {
			"name": "The Final Stand",
			"briefing": "This is it. The enemy's last stronghold. Capture their headquarters and end this war.",
			"width": 20,
			"height": 14,
			"player_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 6},
				{"type": Enums.UnitType.INFANTRY, "q": 2, "r": 7},
				{"type": Enums.UnitType.TANK, "q": 3, "r": 6},
				{"type": Enums.UnitType.TANK, "q": 3, "r": 7},
				{"type": Enums.UnitType.ARTILLERY, "q": 1, "r": 6},
				{"type": Enums.UnitType.ARTILLERY, "q": 1, "r": 7},
				{"type": Enums.UnitType.MECH, "q": 4, "r": 6},
				{"type": Enums.UnitType.SCOUT, "q": 4, "r": 7},
			],
			"enemy_units": [
				{"type": Enums.UnitType.INFANTRY, "q": 14, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 15, "r": 3},
				{"type": Enums.UnitType.INFANTRY, "q": 16, "r": 4},
				{"type": Enums.UnitType.TANK, "q": 14, "r": 5},
				{"type": Enums.UnitType.TANK, "q": 17, "r": 5},
				{"type": Enums.UnitType.TANK, "q": 15, "r": 7},
				{"type": Enums.UnitType.MECH, "q": 16, "r": 7},
				{"type": Enums.UnitType.ARTILLERY, "q": 17, "r": 8},
				{"type": Enums.UnitType.ARTILLERY, "q": 18, "r": 8},
				{"type": Enums.UnitType.SCOUT, "q": 15, "r": 9},
				{"type": Enums.UnitType.INFANTRY, "q": 17, "r": 10},
				{"type": Enums.UnitType.TANK, "q": 18, "r": 11},
			],
			"terrain": "final_stand",
			"victory_type": "rout",
			"ai_difficulty": Enums.AIDifficulty.HARD,
			"bonus_objective": "Complete with 6+ units alive",
		},
	}


## Get mission data by ID.
func get_mission(mission_id: String) -> Dictionary:
	if missions.has(mission_id):
		return missions[mission_id].duplicate(true)
	return {}


## Get list of all mission IDs.
func get_mission_list() -> Array[String]:
	return missions.keys()


## Generate terrain grid for a named terrain type.
func generate_terrain(terrain_type: String, width: int, height: int) -> Array:
	var grid: Array = []
	
	for r in range(height):
		var row: Array = []
		for q in range(width):
			var t = Enums.TerrainType.PLAINS
			row.append(t)
		grid.append(row)
	
	match terrain_type:
		"plains_01":
			# Open plains with scattered forest
			_place_random_terrain(grid, Enums.TerrainType.FOREST, 8, width, height)
			_place_random_terrain(grid, Enums.TerrainType.CITY, 3, width, height)
		
		"river_crossing":
			# River through the middle
			var river_r = int(height / 2) - 1
			for q in range(width):
				if q < 3 or q > width - 4:
					grid[river_r][q] = Enums.TerrainType.WATER
					grid[river_r + 1][q] = Enums.TerrainType.WATER
				else:
					grid[river_r][q] = Enums.TerrainType.WATER
			_place_random_terrain(grid, Enums.TerrainType.FOREST, 6, width, height)
			_place_random_terrain(grid, Enums.TerrainType.CITY, 3, width, height)
		
		"forest_ambush":
			# Heavy forest coverage
			_place_random_terrain(grid, Enums.TerrainType.FOREST, 25, width, height)
			_place_random_terrain(grid, Enums.TerrainType.MOUNTAIN, 5, width, height)
			_place_random_terrain(grid, Enums.TerrainType.CITY, 2, width, height)
		
		"mountain_pass":
			# Mountain range across the middle with a pass
			var mid_r = int(height / 2)
			for q in range(width):
				if q >= int(width / 2) - 2 and q <= int(width / 2) + 1:
					continue  # The pass
				if q > 2 and q < width - 3:
					grid[mid_r][q] = Enums.TerrainType.MOUNTAIN
			_place_random_terrain(grid, Enums.TerrainType.FOREST, 10, width, height)
		
		"final_stand":
			# Urban/city map with mixed terrain
			for r in range(height):
				for q in range(width):
					var in_city = (q > width / 2 - 4 and q < width / 2 + 4 and
								  r > height / 2 - 3 and r < height / 2 + 3)
					if in_city:
						grid[r][q] = Enums.TerrainType.CITY
			_place_random_terrain(grid, Enums.TerrainType.FOREST, 8, width, height)
			# Roads
			var mid_r = int(height / 2)
			for q in range(width):
				if grid[mid_r][q] != Enums.TerrainType.CITY:
					grid[mid_r][q] = Enums.TerrainType.ROAD
			for r in range(height):
				var mid_q = int(width / 2)
				if grid[r][mid_q] != Enums.TerrainType.CITY:
					grid[r][mid_q] = Enums.TerrainType.ROAD
	
	return grid


func _place_random_terrain(grid: Array, terrain: int, count: int, width: int, height: int):
	var placed = 0
	var max_attempts = count * 10
	var attempts = 0
	while placed < count and attempts < max_attempts:
		var r = randi() % height
		var q = randi() % width
		if grid[r][q] == Enums.TerrainType.PLAINS:
			grid[r][q] = terrain
			placed += 1
		attempts += 1
