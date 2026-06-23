## UnitData — Static unit type definitions and stats.
extends RefCounted

const Enums = preload("res://src/enums.gd")

## Stat block for each unit type: [name, hp, atk, def, move_range, attack_range_min, attack_range_max, cost, icon_char]
static var UNIT_STATS: Dictionary = {
	Enums.UnitType.INFANTRY: {
		"name": "Infantry",
		"hp": 10, "max_hp": 10,
		"atk": 3, "def": 1,
		"move": 3, "range_min": 1, "range_max": 1,
		"cost": 100,
		"icon": "I",
		"description": "Basic foot soldier. Low cost, good mobility.",
		"color": Color(0.3, 0.7, 0.3),
	},
	Enums.UnitType.TANK: {
		"name": "Tank",
		"hp": 15, "max_hp": 15,
		"atk": 5, "def": 3,
		"move": 2, "range_min": 1, "range_max": 1,
		"cost": 200,
		"icon": "T",
		"description": "Armored vehicle. High HP and defense, slow.",
		"color": Color(0.7, 0.6, 0.2),
	},
	Enums.UnitType.ARTILLERY: {
		"name": "Artillery",
		"hp": 8, "max_hp": 8,
		"atk": 7, "def": 0,
		"move": 2, "range_min": 2, "range_max": 3,
		"cost": 300,
		"icon": "A",
		"description": "Long-range siege. Devastating at range, fragile up close.",
		"color": Color(0.8, 0.3, 0.2),
	},
	Enums.UnitType.SCOUT: {
		"name": "Scout",
		"hp": 6, "max_hp": 6,
		"atk": 2, "def": 0,
		"move": 5, "range_min": 1, "range_max": 1,
		"cost": 150,
		"icon": "S",
		"description": "Fast recon unit. High vision range, weak in combat.",
		"color": Color(0.2, 0.5, 0.7),
	},
	Enums.UnitType.MECH: {
		"name": "Mech",
		"hp": 12, "max_hp": 12,
		"atk": 4, "def": 2,
		"move": 3, "range_min": 1, "range_max": 2,
		"cost": 250,
		"icon": "M",
		"description": "Walking mech. Versatile all-rounder with medium range.",
		"color": Color(0.6, 0.3, 0.7),
	},
}


## Get stat value for a unit type.
static func get_stat(type: int, stat: String):
	if UNIT_STATS.has(type) and UNIT_STATS[type].has(stat):
		return UNIT_STATS[type][stat]
	return 0


## Get unit name.
static func get_name(type: int) -> String:
	return get_stat(type, "name")


## Get unit icon character.
static func get_icon(type: int) -> String:
	return get_stat(type, "icon")


## Get unit color.
static func get_color(type: int) -> Color:
	return get_stat(type, "color")


## Create a new unit instance dictionary.
static func create_unit(type: int, owner_id: int, unit_id: int) -> Dictionary:
	var stats = UNIT_STATS[type]
	return {
		"id": unit_id,
		"type": type,
		"owner": owner_id,  # 0 = player, 1+ = enemy
		"hp": stats["hp"],
		"max_hp": stats["max_hp"],
		"atk": stats["atk"],
		"def": stats["def"],
		"move": stats["move"],
		"range_min": stats["range_min"],
		"range_max": stats["range_max"],
		"has_moved": false,
		"has_acted": false,
		"hex_q": -1,
		"hex_r": -1,
		"alive": true,
		"promoted": false,
		"kills": 0,
	}
