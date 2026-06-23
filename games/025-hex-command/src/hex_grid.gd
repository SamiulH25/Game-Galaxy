## HexGrid — Axial coordinate system for hex maps.
extends RefCounted

const Enums = preload("res://src/enums.gd")

## Radius of a hex in pixels (center to vertex).
var hex_size: float = 32.0

## Grid width in hexes.
var width: int = 15

## Grid height in hexes.
var height: int = 10

## 2D array of terrain types: terrain_data[r][q] = TerrainType
var terrain_data: Array = []

## Array of unit references keyed by hex: unit_grid[r][q] = Unit or null
var unit_grid: Array = []


func _init(p_hex_size: float = 32.0, p_width: int = 15, p_height: int = 10):
	hex_size = p_hex_size
	width = p_width
	height = p_height
	_resize_grids()


func _resize_grids():
	terrain_data.clear()
	unit_grid.clear()
	for r in range(height):
		var row_terrain: Array = []
		var row_units: Array = []
		for q in range(width):
			row_terrain.append(Enums.TerrainType.PLAINS)
			row_units.append(null)
		terrain_data.append(row_terrain)
		unit_grid.append(row_units)


## Convert axial hex coords to pixel position (center of hex).
func hex_to_pixel(q: int, r: int) -> Vector2:
	var x: float = hex_size * (sqrt(3.0) * q + sqrt(3.0) / 2.0 * r)
	var y: float = hex_size * (3.0 / 2.0 * r)
	return Vector2(x, y)


## Convert pixel position to axial hex coords (fractional).
func pixel_to_hex_frac(px: float, py: float) -> Vector2:
	var q: float = (sqrt(3.0) / 3.0 * px - 1.0 / 3.0 * py) / hex_size
	var r: float = (2.0 / 3.0 * py) / hex_size
	return Vector2(q, r)



## Round fractional hex coords to the nearest integer hex.
func hex_round(q: float, r: float) -> Vector2i:
	var s: float = -q - r
	var rq: int = roundi(q)
	var rr: int = roundi(r)
	var rs: int = roundi(s)
	
	var dq: float = abs(rq - q)
	var dr: float = abs(rr - r)
	var ds: float = abs(rs - s)
	
	if dq > dr and dq > ds:
		rq = -rr - rs
	elif dr > ds:
		rr = -rq - rs
	
	return Vector2i(rq, rr)


## Convert pixel to hex coord.
func pixel_to_hex(px: float, py: float) -> Vector2i:
	var frac = pixel_to_hex_frac(px, py)
	return hex_round(frac.x, frac.y)


## Check if hex coords are within map bounds.
func is_in_bounds(q: int, r: int) -> bool:
	return q >= 0 and q < width and r >= 0 and r < height


## Get terrain at hex.
func get_terrain(q: int, r: int) -> int:
	if not is_in_bounds(q, r):
		return Enums.TerrainType.WATER
	return terrain_data[r][q]


## Set terrain at hex.
func set_terrain(q: int, r: int, terrain: int):
	if is_in_bounds(q, r):
		terrain_data[r][q] = terrain


## Get unit at hex.
func get_unit(q: int, r: int):
	if not is_in_bounds(q, r):
		return null
	return unit_grid[r][q]


## Place unit at hex.
func place_unit(q: int, r: int, unit) -> bool:
	if not is_in_bounds(q, r) or unit_grid[r][q] != null:
		return false
	unit_grid[r][q] = unit
	unit.hex_q = q
	unit.hex_r = r
	return true


## Remove unit from its hex.
func remove_unit(unit) -> bool:
	if is_in_bounds(unit.hex_q, unit.hex_r) and unit_grid[unit.hex_r][unit.hex_q] == unit:
		unit_grid[unit.hex_r][unit.hex_q] = null
		return true
	return false


## Move unit from current hex to new hex.
func move_unit(unit, target_q: int, target_r: int) -> bool:
	if not is_in_bounds(target_q, target_r) or unit_grid[target_r][target_q] != null:
		return false
	remove_unit(unit)
	return place_unit(target_q, target_r, unit)


## Get all 6 neighboring hex coordinates.
func get_neighbors(q: int, r: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for d in Enums.HEX_DIRS:
		var nq = q + d.x
		var nr = r + d.y
		if is_in_bounds(nq, nr):
			result.append(Vector2i(nq, nr))
	return result


## Get hexes within a given movement range, accounting for terrain cost and unit type.
func get_reachable_hexes(q: int, r: int, move_range: int, unit_type: int) -> Array[Vector2i]:
	var visited: Dictionary = {}  # "q,r" -> cost
	var frontier: Array = []  # [q, r, cost]
	
	var key = str(q) + "," + str(r)
	visited[key] = 0
	frontier.append([q, r, 0])
	
	var idx: int = 0
	while idx < frontier.size():
		var cur = frontier[idx]
		idx += 1
		var cq: int = cur[0]
		var cr: int = cur[1]
		var cost: int = cur[2]
		
		for d in Enums.HEX_DIRS:
			var nq = cq + d.x
			var nr = cr + d.y
			if not is_in_bounds(nq, nr):
				continue
			
			# Skip hexes with units
			if unit_grid[nr][nq] != null:
				continue
			
			var terrain = terrain_data[nr][nq]
			var move_costs = Enums.TERRAIN_MOVEMENT_COST[terrain]
			var move_cost: int = move_costs[unit_type]
			if move_cost >= 99:
				continue
			
			var new_cost: int = cost + move_cost
			var nkey = str(nq) + "," + str(nr)
			if new_cost <= move_range and (not visited.has(nkey) or visited[nkey] > new_cost):
				visited[nkey] = new_cost
				frontier.append([nq, nr, new_cost])
	
	# Convert visited keys back to Vector2i, excluding start
	var result: Array[Vector2i] = []
	for k in visited.keys():
		var parts = k.split(",")
		var hq = int(parts[0])
		var hr = int(parts[1])
		if hq != q or hr != r:
			result.append(Vector2i(hq, hr))
	
	return result


## Get hexes within attack range of a hex.
func get_attack_range_hexes(q: int, r: int, min_range: int, max_range: int) -> Array[Vector2i]:
	if max_range <= 0:
		return []
	
	var result: Array[Vector2i] = []
	var visited: Dictionary = {}
	var frontier: Array = [[q, r, 0]]
	visited[str(q) + "," + str(r)] = true
	
	var idx: int = 0
	while idx < frontier.size():
		var cur = frontier[idx]
		idx += 1
		var cq: int = cur[0]
		var cr: int = cur[1]
		var dist: int = cur[2]
		
		if dist >= max_range:
			continue
		
		for d in Enums.HEX_DIRS:
			var nq = cq + d.x
			var nr = cr + d.y
			var nkey = str(nq) + "," + str(nr)
			if is_in_bounds(nq, nr) and not visited.has(nkey):
				visited[nkey] = true
				var ndist = dist + 1
				if ndist >= min_range and ndist <= max_range:
					result.append(Vector2i(nq, nr))
				if ndist < max_range:
					frontier.append([nq, nr, ndist])
	
	return result


## Calculate hex distance between two hexes.
func hex_distance(q1: int, r1: int, q2: int, r2: int) -> int:
	var dq = q2 - q1
	var dr = r2 - r1
	return int((abs(dq) + abs(dr) + abs(dq + dr)) / 2)


## Find the path between two hexes (shortest by movement cost).
func find_path(from_q: int, from_r: int, to_q: int, to_r: int, unit_type: int) -> Array[Vector2i]:
	if from_q == to_q and from_r == to_r:
		return []
	
	# A* search
	var open_set: Array = []  # [q, r, g_cost, f_cost, parent_q, parent_r]
	var open_dict: Dictionary = {}
	var closed_dict: Dictionary = {}
	
	var start_key = str(from_q) + "," + str(from_r)
	var goal_key = str(to_q) + "," + str(to_r)
	
	open_dict[start_key] = true
	open_set.append([from_q, from_r, 0, hex_distance(from_q, from_r, to_q, to_r), -1, -1])
	
	while open_set.size() > 0:
		# Find lowest f_cost
		var lowest_idx: int = 0
		for i in range(1, open_set.size()):
			if open_set[i][3] < open_set[lowest_idx][3]:
				lowest_idx = i
		
		var cur = open_set[lowest_idx]
		var cq: int = cur[0]
		var cr: int = cur[1]
		var g: int = cur[2]
		
		open_set.remove_at(lowest_idx)
		open_dict.erase(str(cq) + "," + str(cr))
		
		var ckey = str(cq) + "," + str(cr)
		closed_dict[ckey] = true
		
		if ckey == goal_key:
			# Reconstruct path
			var path: Array[Vector2i] = []
			var pkey = str(cur[4]) + "," + str(cur[5])
			while pkey != start_key:
				var parts = pkey.split(",")
				path.append(Vector2i(int(parts[0]), int(parts[1])))
				# Find parent in closed set or open set
				var found = false
				# We store parent info in a separate dict for reconstruction
				# Use a simplified approach - store parent chain
				break
			
			path.reverse()
			path.append(Vector2i(to_q, to_r))
			return path
		
		for d in Enums.HEX_DIRS:
			var nq = cq + d.x
			var nr = cr + d.y
			var nkey = str(nq) + "," + str(nr)
			
			if not is_in_bounds(nq, nr) or closed_dict.has(nkey):
				continue
			
			# Skip hex with unit (except target)
			if unit_grid[nr][nq] != null and nkey != goal_key:
				continue
			
			var terrain = terrain_data[nr][nr] if nr < terrain_data.size() and nq < terrain_data[nr].size() else Enums.TerrainType.PLAINS
			terrain = terrain_data[nr][nq]
			var move_costs = Enums.TERRAIN_MOVEMENT_COST[terrain]
			var move_cost: int = move_costs[unit_type]
			if move_cost >= 99:
				continue
			
			var new_g = g + move_cost
			var h = hex_distance(nq, nr, to_q, to_r)
			var f = new_g + h
			
			if not open_dict.has(nkey) or open_dict[nkey] > f:
				open_dict[nkey] = f
				open_set.append([nq, nr, new_g, f, cq, cr])
	
	return []  # No path found
