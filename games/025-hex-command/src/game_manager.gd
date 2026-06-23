## GameManager — Central game state, turns, and coordination.
extends RefCounted

const Enums = preload("res://src/enums.gd")
const HexGrid = preload("res://src/hex_grid.gd")
const MapLoader = preload("res://src/map_loader.gd")
const UnitData = preload("res://src/unit_data.gd")
const CombatSystem = preload("res://src/combat.gd")
const AISystem = preload("res://src/ai.gd")

signal turn_phase_changed(phase: int)
signal unit_selected(unit: Dictionary)
signal hex_highlighted(hexes: Array)
signal combat_resolved(results: Dictionary)
signal mission_victory()
signal mission_defeat()
signal mission_started(mission_id: String, mission_name: String, briefing: String)

## References to subsystems.
var hex_grid = null
var map_loader = null
var ai = null

## Game state.
var current_mission_id: String = ""
var mission_data: Dictionary = {}
var turn_number: int = 1
var phase: int = Enums.TurnPhase.PLAYER_MOVE
var selected_unit = null
var reachable_hexes: Array[Vector2i] = []
var attack_hexes: Array[Vector2i] = []

## Unit lists.
var player_units: Array = []
var enemy_units: Array = []
var all_units: Array = []
var _next_unit_id: int = 1

## UI references (set externally).
var hud: Node = null


func _init():
	hex_grid = HexGrid.new(36.0, 15, 10)
	map_loader = MapLoader.new()
	ai = null


## Start a mission by ID.
func start_mission(mission_id: String) -> bool:
	if not map_loader.missions.has(mission_id):
		return false
	
	current_mission_id = mission_id
	mission_data = map_loader.get_mission(mission_id)
	turn_number = 1
	phase = Enums.TurnPhase.PLAYER_MOVE
	player_units.clear()
	enemy_units.clear()
	all_units.clear()
	
	# Setup grid
	hex_grid = HexGrid.new(36.0, mission_data["width"], mission_data["height"])
	
	# Generate terrain
	var terrain_data = map_loader.generate_terrain(mission_data["terrain"], mission_data["width"], mission_data["height"])
	for r in range(hex_grid.height):
		for q in range(hex_grid.width):
			hex_grid.set_terrain(q, r, terrain_data[r][q])
	
	# Place player units
	for u_data in mission_data["player_units"]:
		var unit = UnitData.create_unit(u_data["type"], 0, _next_unit_id)
		_next_unit_id += 1
		hex_grid.place_unit(u_data["q"], u_data["r"], unit)
		player_units.append(unit)
		all_units.append(unit)
	
	# Place enemy units
	for u_data in mission_data["enemy_units"]:
		var unit = UnitData.create_unit(u_data["type"], 1, _next_unit_id)
		_next_unit_id += 1
		hex_grid.place_unit(u_data["q"], u_data["r"], unit)
		enemy_units.append(unit)
		all_units.append(unit)
	
	# Setup AI
	ai = AISystem.new(self, mission_data.get("ai_difficulty", Enums.AIDifficulty.NORMAL))
	
	selected_unit = null
	reachable_hexes.clear()
	attack_hexes.clear()
	
	emit_signal("mission_started", mission_id, mission_data["name"], mission_data["briefing"])
	emit_signal("turn_phase_changed", phase)
	
	return true


## Select a unit for the current turn.
func select_unit(unit: Dictionary) -> bool:
	if phase != Enums.TurnPhase.PLAYER_MOVE and phase != Enums.TurnPhase.PLAYER_ACTION:
		return false
	if unit["owner"] != 0 or not unit["alive"]:
		return false
	
	selected_unit = unit
	emit_signal("unit_selected", unit)
	
	# Calculate reachable hexes
	if not unit["has_moved"]:
		reachable_hexes = hex_grid.get_reachable_hexes(unit["hex_q"], unit["hex_r"], unit["move"], unit["type"])
	else:
		reachable_hexes.clear()
	
	# Calculate attack hexes
	if not unit["has_acted"]:
		attack_hexes = hex_grid.get_attack_range_hexes(unit["hex_q"], unit["hex_r"], unit["range_min"], unit["range_max"])
	else:
		attack_hexes.clear()
	
	emit_signal("hex_highlighted", reachable_hexes + attack_hexes)
	return true


## Move selected unit to a hex.
func move_unit_to(target_q: int, target_r: int) -> bool:
	if selected_unit == null or selected_unit["has_moved"]:
		return false
	
	# Check if target is in reachable
	var is_reachable = false
	for h in reachable_hexes:
		if h.x == target_q and h.y == target_r:
			is_reachable = true
			break
	
	if not is_reachable:
		return false
	
	hex_grid.move_unit(selected_unit, target_q, target_r)
	selected_unit["has_moved"] = true
	
	# Refresh attack hexes after movement
	attack_hexes = hex_grid.get_attack_range_hexes(selected_unit["hex_q"], selected_unit["hex_r"],
		selected_unit["range_min"], selected_unit["range_max"])
	
	if selected_unit["has_acted"]:
		_deselect_unit()
	else:
		reachable_hexes.clear()
		emit_signal("hex_highlighted", attack_hexes)
	
	return true


## Attack a target unit with the selected unit.
func attack_target(target_q: int, target_r: int) -> bool:
	if selected_unit == null or selected_unit["has_acted"]:
		return false
	
	# Check if target is in attack range
	var is_in_range = false
	for h in attack_hexes:
		if h.x == target_q and h.y == target_r:
			is_in_range = true
			break
	
	if not is_in_range:
		return false
	
	var target = hex_grid.get_unit(target_q, target_r)
	if target == null or target["owner"] == selected_unit["owner"]:
		return false
	
	var terrain_def = Enums.TERRAIN_DEFENSE[hex_grid.get_terrain(target_q, target_r)]
	
	# Resolve combat
	var results = CombatSystem.resolve_combat(selected_unit, target, terrain_def)
	selected_unit["has_acted"] = true
	
	# Handle kills
	if not target["alive"]:
		hex_grid.remove_unit(target)
	
	# Check promotion
	if CombatSystem.check_promotion(selected_unit):
		results["promoted"] = true
	
	emit_signal("combat_resolved", results)
	
	# Check victory/defeat conditions
	_check_victory_conditions()
	
	if not selected_unit["alive"]:
		hex_grid.remove_unit(selected_unit)
		_deselect_unit()
	elif selected_unit["has_moved"]:
		_deselect_unit()
	else:
		reachable_hexes = hex_grid.get_reachable_hexes(selected_unit["hex_q"], selected_unit["hex_r"],
			selected_unit["move"], selected_unit["type"])
		attack_hexes.clear()
		emit_signal("hex_highlighted", reachable_hexes)
	
	return true


## End the current unit's action (wait).
func wait_action() -> bool:
	if selected_unit == null:
		return false
	selected_unit["has_moved"] = true
	selected_unit["has_acted"] = true
	_deselect_unit()
	return true


## End the player's turn.
func end_player_turn() -> bool:
	if phase != Enums.TurnPhase.PLAYER_MOVE and phase != Enums.TurnPhase.PLAYER_ACTION:
		return false
	
	_deselect_unit()
	
	# Reset all player units for next turn
	for u in player_units:
		if u["alive"]:
			u["has_moved"] = false
			u["has_acted"] = false
	
	for u in enemy_units:
		if u["alive"]:
			u["has_moved"] = false
			u["has_acted"] = false
	
	# Switch to enemy turn
	phase = Enums.TurnPhase.ENEMY_MOVE
	emit_signal("turn_phase_changed", phase)
	
	# Execute AI
	ai.execute_turn()
	
	# Check if player lost during enemy turn
	_check_victory_conditions()
	
	if phase == Enums.TurnPhase.GAME_OVER:
		return true
	
	# Back to player
	turn_number += 1
	phase = Enums.TurnPhase.PLAYER_MOVE
	emit_signal("turn_phase_changed", phase)
	
	return true


## Deselect current unit.
func _deselect_unit():
	selected_unit = null
	reachable_hexes.clear()
	attack_hexes.clear()
	emit_signal("hex_highlighted", [])
	emit_signal("unit_selected", {})


## Check victory/defeat.
func _check_victory_conditions():
	var alive_enemies = 0
	for u in enemy_units:
		if u["alive"]:
			alive_enemies += 1
	
	var alive_players = 0
	for u in player_units:
		if u["alive"]:
			alive_players += 1
	
	if alive_enemies == 0:
		phase = Enums.TurnPhase.VICTORY
		emit_signal("turn_phase_changed", phase)
		emit_signal("mission_victory")
		_save_progress()
	elif alive_players == 0:
		phase = Enums.TurnPhase.GAME_OVER
		emit_signal("turn_phase_changed", phase)
		emit_signal("mission_defeat")


## Save progress via GalaxyAPI.
func _save_progress():
	var data = {
		"last_mission": current_mission_id,
		"completed_missions": [current_mission_id],
		"turn_number": turn_number,
		"units_alive": _count_alive_player_units(),
	}
	
	if Engine.has_singleton("GalaxyAPI"):
		var api = Engine.get_singleton("GalaxyAPI")
		if api and api.has_method("save"):
			api.save(data)


## Try to load save data.
func load_progress():
	if Engine.has_singleton("GalaxyAPI"):
		var api = Engine.get_singleton("GalaxyAPI")
		if api and api.has_method("load"):
			api.load(func(data):
				if data and not data.is_empty():
					if data.has("last_mission") and data["last_mission"]:
						start_mission(data["last_mission"])
				)


## Helper: count alive player units.
func _count_alive_player_units() -> int:
	var count = 0
	for u in player_units:
		if u["alive"]:
			count += 1
	return count


## Get all player units.
func get_player_units() -> Array:
	return player_units


## Get all enemy units.
func get_enemy_units() -> Array:
	return enemy_units


## Resolve an attack (used by AI).
func resolve_attack(attacker: Dictionary, defender: Dictionary, terrain_def: int) -> Dictionary:
	if not attacker["alive"] or not defender["alive"]:
		return {}
	var results = CombatSystem.resolve_combat(attacker, defender, terrain_def)
	attacker["has_acted"] = true
	
	if not defender["alive"]:
		hex_grid.remove_unit(defender)
	if not attacker["alive"]:
		hex_grid.remove_unit(attacker)
	
	emit_signal("combat_resolved", results)
	_check_victory_conditions()
	return results
