## CombatSystem — Damage calculation and combat resolution.
extends RefCounted

## Calculate damage from attacker to defender.
## Returns Dictionary with damage_dealt, counter_damage, attacker_alive, defender_alive.
static func resolve_combat(attacker: Dictionary, defender: Dictionary, terrain_def: int) -> Dictionary:
	var result = {}
	
	# Base attack
	var base_atk = attacker["atk"]
	
	# Effective defense = unit DEF + terrain bonus
	var eff_def = defender["def"] + terrain_def
	
	# Damage = ATK * (10 / (10 + DEF)), with small randomness
	var raw_dmg = base_atk * 10.0 / float(10 + eff_def)
	var variance = randf_range(-0.5, 0.5)
	var damage = max(1, roundi(raw_dmg + variance))
	
	# Apply damage to defender
	defender["hp"] -= damage
	if defender["hp"] <= 0:
		defender["hp"] = 0
		defender["alive"] = false
	
	result["damage_dealt"] = damage
	result["defender_destroyed"] = not defender["alive"]
	
	# Counter-attack if defender is alive and attacker is in defender's range
	var counter_damage = 0
	if defender["alive"]:
		var dist = hex_distance_calc(attacker["hex_q"], attacker["hex_r"], defender["hex_q"], defender["hex_r"])
		if dist >= defender["range_min"] and dist <= defender["range_max"]:
			var def_atk = defender["atk"]
			var att_terrain = 0  # Attacker's terrain doesn't matter for counter
			var eff_def2 = attacker["def"]  # No terrain bonus for counter
			var raw_dmg2 = def_atk * 10.0 / float(10 + eff_def2)
			var variance2 = randf_range(-0.5, 0.5)
			counter_damage = max(0, roundi(raw_dmg2 + variance2))
			
			attacker["hp"] -= counter_damage
			if attacker["hp"] <= 0:
				attacker["hp"] = 0
				attacker["alive"] = false
	
	result["counter_damage"] = counter_damage
	result["attacker_destroyed"] = not attacker["alive"]
	
	# Grant kills if destroyed
	if not defender["alive"]:
		attacker["kills"] += 1
	elif not attacker["alive"] and defender.has("kills"):
		defender["kills"] += 1
	
	return result


## Calculate the expected outcome (used by AI for evaluation).
static func predict_damage(attacker: Dictionary, defender: Dictionary, terrain_def: int) -> Dictionary:
	var pred = {}
	
	var base_atk = attacker["atk"]
	var eff_def = defender["def"] + terrain_def
	var avg_dmg = base_atk * 10.0 / float(10 + eff_def)
	
	pred["avg_damage"] = avg_dmg
	pred["kills_defender"] = avg_dmg >= defender["hp"]
	
	# Counter-attack prediction
	var counter = 0
	var kills_attacker = false
	var dist = hex_distance_calc(attacker["hex_q"], attacker["hex_r"], defender["hex_q"], defender["hex_r"])
	if dist >= defender["range_min"] and dist <= defender["range_max"]:
		counter = defender["atk"] * 10.0 / float(10 + attacker["def"])
		kills_attacker = counter >= attacker["hp"]
	
	pred["avg_counter"] = counter
	pred["kills_attacker"] = kills_attacker
	
	return pred


## Prompt a unit if it has enough XP (3 kills = promotion).
static func check_promotion(unit: Dictionary) -> bool:
	if unit["promoted"]:
		return false
	if unit["kills"] >= 3:
		unit["promoted"] = true
		unit["atk"] += 1
		unit["def"] += 1
		unit["max_hp"] += 2
		unit["hp"] = min(unit["hp"] + 2, unit["max_hp"])
		return true
	return false


## Calculate hex distance using axial coords.
static func hex_distance_calc(q1: int, r1: int, q2: int, r2: int) -> int:
	var dq = q2 - q1
	var dr = r2 - r1
	return int((abs(dq) + abs(dr) + abs(dq + dr)) / 2)
