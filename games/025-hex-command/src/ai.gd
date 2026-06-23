## AI — Enemy turn logic with multiple strategy profiles.
extends RefCounted

const Enums = preload("res://src/enums.gd")
const CombatSystem = preload("res://src/combat.gd")

## Reference to game state (needed for evaluation).
var _game_manager = null

## Difficulty level affects scoring weights and decision quality.
var difficulty: int = Enums.AIDifficulty.NORMAL


func _init(game_manager, diff: int = Enums.AIDifficulty.NORMAL):
	_game_manager = game_manager
	difficulty = diff


## Execute the enemy turn. Returns list of action logs for replay.
func execute_turn() -> Array[Dictionary]:
	var actions: Array[Dictionary] = []
	var enemies = _get_my_units()
	if enemies.is_empty():
		return actions
	
	# Shuffle to add unpredictability on lower difficulties
	if difficulty == Enums.AIDifficulty.EASY:
		enemies.shuffle()
	elif difficulty == Enums.AIDifficulty.NORMAL:
		# Sort by threat: most threatening units act first
		enemies.sort_custom(func(a, b): return _threat_score(a) > _threat_score(b))
	else:
		# Hard: process in strategic order (artillery first for support, then tanks)
		enemies.sort_custom(func(a, b): return _tactical_priority(a) < _tactical_priority(b))
	
	for unit in enemies:
		if not unit["alive"]:
			continue
		
		var action = _decide_unit_action(unit)
		if action["type"] != "wait":
			actions.append(action)
		
		# Mark unit as done
		unit["has_moved"] = true
		unit["has_acted"] = true
	
	return actions


## Decide what a single enemy unit does this turn.
func _decide_unit_action(unit: Dictionary) -> Dictionary:
	var hex_grid = _game_manager.hex_grid
	var player_units = _get_player_units()
	
	# 1. Check if we can attack from current position
	var attack_targets = _find_attack_targets(unit, unit["hex_q"], unit["hex_r"])
	if not attack_targets.is_empty():
		# We can attack from here - pick the best target
		var best_attack = _pick_best_attack(unit, attack_targets)
		if best_attack != null:
			return {"type": "attack", "unit": unit, "target": best_attack, "from_q": unit["hex_q"], "from_r": unit["hex_r"]}
	
	# 2. Find best position to move to
	var reachable = hex_grid.get_reachable_hexes(unit["hex_q"], unit["hex_r"], unit["move"], unit["type"])
	if reachable.is_empty():
		# Can't move anywhere useful, wait
		_check_for_attack_after_wait(unit)
		return {"type": "wait", "unit": unit}
	
	# 3. Score each reachable hex
	var best_score = -99999.0
	var best_hex = Vector2i(unit["hex_q"], unit["hex_r"])
	var best_move_target = null
	
	for hex_pos in reachable:
		var sq = hex_pos.x
		var sr = hex_pos.y
		var score = _evaluate_hex(unit, sq, sr, player_units)
		
		# Add some randomness based on difficulty
		if difficulty == Enums.AIDifficulty.EASY:
			score += randf_range(-5.0, 5.0)
		elif difficulty == Enums.AIDifficulty.NORMAL:
			score += randf_range(-2.0, 2.0)
		
		# Check if we can attack from this position
		var targets = _find_attack_targets(unit, sq, sr)
		if not targets.is_empty():
			var attack_score = _score_attack_position(unit, targets)
			score += attack_score * 10.0
			
			# Remember best attack target
			if score > best_score:
				best_score = score
				best_hex = hex_pos
				best_move_target = _pick_best_attack(unit, targets)
		else:
			if score > best_score:
				best_score = score
				best_hex = hex_pos
				best_move_target = null
	
	# 4. Execute the move
	if best_hex.x != unit["hex_q"] or best_hex.y != unit["hex_r"]:
		hex_grid.move_unit(unit, best_hex.x, best_hex.y)
		
		# Attack if we can from the new position
		if best_move_target != null:
			return {"type": "move_and_attack", "unit": unit, "target": best_move_target,
				   "from_q": best_hex.x, "from_r": best_hex.y}
		
		return {"type": "move", "unit": unit, "to_q": best_hex.x, "to_r": best_hex.y}
	
	# No good move found
	return {"type": "wait", "unit": unit}


## Evaluate how good a hex is for this unit.
func _evaluate_hex(unit: Dictionary, q: int, r: int, player_units: Array) -> float:
	var score = 0.0
	var hex_grid = _game_manager.hex_grid
	
	# Prefer moving toward nearest enemy
	var nearest_enemy = _find_nearest_player_unit(q, r, player_units)
	if nearest_enemy != null:
		var dist = CombatSystem.hex_distance_calc(q, r, nearest_enemy["hex_q"], nearest_enemy["hex_r"])
		var ideal_dist = unit["range_max"]
		var closeness = max(0, 20 - abs(dist - ideal_dist))
		score += closeness * 2.0
	
	# Prefer higher ground / defensive terrain
	var terrain = hex_grid.get_terrain(q, r)
	var def_bonus = Enums.TERRAIN_DEFENSE[terrain]
	score += def_bonus * 3.0
	
	# Prefer being near allies (mutual support)
	var allies_nearby = _count_allies_in_range(q, r, 3)
	score += allies_nearby * 2.0
	
	# Avoid being near multiple enemies (getting surrounded)
	var enemies_nearby = _count_player_units_in_range(q, r, 4)
	score -= enemies_nearby * 4.0
	
	# Avoid open terrain if low HP
	var hp_ratio = float(unit["hp"]) / float(unit["max_hp"])
	if hp_ratio < 0.5:
		score += def_bonus * 5.0  # Strongly prefer cover when wounded
	
	# Slight bonus for forward positions
	var forward_bias = q * 0.5  # Higher Q = more toward enemy side
	score += forward_bias
	
	# Hard AI checks for crossfire / support
	if difficulty >= Enums.AIDifficulty.HARD:
		var nearby_allies_with_attack = _count_allies_in_range(q, r, unit["range_max"] * 2)
		score += nearby_allies_with_attack * 3.0  # Crossfire potential
	
	return score


## Find enemy units in range of a hex.
func _find_attack_targets(unit: Dictionary, q: int, r: int) -> Array[Dictionary]:
	var targets: Array[Dictionary] = []
	var enemies = _get_player_units()
	for enemy in enemies:
		if not enemy["alive"]:
			continue
		var dist = CombatSystem.hex_distance_calc(q, r, enemy["hex_q"], enemy["hex_r"])
		if dist >= unit["range_min"] and dist <= unit["range_max"]:
			var terrain = _game_manager.hex_grid.get_terrain(enemy["hex_q"], enemy["hex_r"])
			var def_bonus = Enums.TERRAIN_DEFENSE[terrain]
			targets.append({"unit": enemy, "dist": dist, "terrain_def": def_bonus})
	return targets


## Pick the best attack target among candidates.
func _pick_best_attack(unit: Dictionary, targets: Array) -> Dictionary:
	if targets.is_empty():
		return {}
	
	var best = null
	var best_score = -99999.0
	
	for t in targets:
		var enemy = t["unit"]
		var pred = CombatSystem.predict_damage(unit, enemy, t["terrain_def"])
		var score = pred["avg_damage"]
		
		# Priority: finish off low HP enemies
		if enemy["hp"] <= pred["avg_damage"]:
			score += 50.0  # High priority to kill
		
		# Priority: target high-value units
		if enemy["type"] == Enums.UnitType.ARTILLERY or enemy["type"] == Enums.UnitType.TANK:
			score += 10.0
		
		# Discount: don't suicide into bad counter-attack
		score -= pred["avg_counter"] * 0.5
		
		# Hard AI: prefer targets we can one-shot
		if difficulty >= Enums.AIDifficulty.HARD and pred["kills_defender"]:
			score += 25.0
		
		if score > best_score:
			best_score = score
			best = t
	
	return best


## Score a hex based on attack potential.
func _score_attack_position(unit: Dictionary, targets: Array) -> float:
	var total = 0.0
	for t in targets:
		var pred = CombatSystem.predict_damage(unit, t["unit"], t["terrain_def"])
		total += pred["avg_damage"]
		if pred["kills_defender"]:
			total += 20.0
	return total


func _find_nearest_player_unit(q: int, r: int, player_units: Array) -> Dictionary:
	var best = null
	var best_dist = 999
	for u in player_units:
		if not u["alive"]:
			continue
		var d = CombatSystem.hex_distance_calc(q, r, u["hex_q"], u["hex_r"])
		if d < best_dist:
			best_dist = d
			best = u
	return best


func _count_allies_in_range(q: int, r: int, range: int) -> int:
	var count = 0
	for u in _get_my_units():
		if not u["alive"]:
			continue
		if u["hex_q"] == q and u["hex_r"] == r:
			continue
		var d = CombatSystem.hex_distance_calc(q, r, u["hex_q"], u["hex_r"])
		if d <= range:
			count += 1
	return count


func _count_player_units_in_range(q: int, r: int, range: int) -> int:
	var count = 0
	for u in _get_player_units():
		if not u["alive"]:
			continue
		var d = CombatSystem.hex_distance_calc(q, r, u["hex_q"], u["hex_r"])
		if d <= range:
			count += 1
	return count


## Threat score for processing order (high = more threatening).
func _threat_score(unit: Dictionary) -> float:
	var score = float(unit["atk"]) + float(unit["hp"])
	if unit["type"] == Enums.UnitType.ARTILLERY:
		score *= 1.5  # Artillery is high priority
	return score


## Tactical priority for processing order (low = acts first).
func _tactical_priority(unit: Dictionary) -> int:
	match unit["type"]:
		Enums.UnitType.ARTILLERY: return 0  # Artillery fires first for support
		Enums.UnitType.SCOUT: return 1     # Scouts reposition
		Enums.UnitType.INFANTRY: return 2
		Enums.UnitType.MECH: return 3
		Enums.UnitType.TANK: return 4      # Tanks move in after softening
		_: return 5


func _get_my_units() -> Array:
	if _game_manager and _game_manager.has_method("get_enemy_units"):
		return _game_manager.get_enemy_units()
	return []


func _get_player_units() -> Array:
	if _game_manager and _game_manager.has_method("get_player_units"):
		return _game_manager.get_player_units()
	return []


## If unit waited, check if they can attack after all movement is done.
func _check_for_attack_after_wait(unit: Dictionary):
	var targets = _find_attack_targets(unit, unit["hex_q"], unit["hex_r"])
	if not targets.is_empty():
		var best = _pick_best_attack(unit, targets)
		if best != null:
			# Execute the attack immediately
			_game_manager.resolve_attack(unit, best["unit"], best["terrain_def"])
