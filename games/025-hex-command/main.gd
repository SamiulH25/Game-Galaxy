extends Node2D

const Enums = preload("res://src/enums.gd")
const UnitData = preload("res://src/unit_data.gd")

func _panel_bg(p: Panel, color: Color):
	var s = StyleBoxFlat.new()
	s.bg_color = color
	p.add_theme_stylebox_override("panel", s)

var game_manager = null
var camera = null
var hud = null
var action_menu = null
var unit_info = null
var _hex_container: Node2D = null
var _unit_container: Node2D = null
var _highlight_container: Node2D = null
var _fx_container: Node2D = null


func _ready():
	_hex_container = Node2D.new()
	_hex_container.name = "HexContainer"
	add_child(_hex_container)
	_highlight_container = Node2D.new()
	_highlight_container.name = "HighlightContainer"
	add_child(_highlight_container)
	_unit_container = Node2D.new()
	_unit_container.name = "UnitContainer"
	add_child(_unit_container)
	_fx_container = Node2D.new()
	_fx_container.name = "FXContainer"
	add_child(_fx_container)
	camera = preload("res://src/camera_controller.gd").new()
	camera.name = "Camera"
	add_child(camera)
	game_manager = preload("res://src/game_manager.gd").new()
	game_manager.turn_phase_changed.connect(_on_phase_changed)
	game_manager.unit_selected.connect(_on_unit_selected)
	game_manager.hex_highlighted.connect(_on_hex_highlighted)
	game_manager.combat_resolved.connect(_on_combat_resolved)
	game_manager.mission_victory.connect(_on_victory)
	game_manager.mission_defeat.connect(_on_defeat)
	game_manager.mission_started.connect(_on_mission_started)
	_ui_ready()
	_show_mission_select()


func _ui_ready():
	hud = preload("res://src/ui/hud.gd").new()
	hud.name = "HUD"
	add_child(hud)
	action_menu = preload("res://src/ui/action_menu.gd").new()
	action_menu.name = "ActionMenu"
	action_menu.move_requested.connect(_on_move_requested)
	action_menu.attack_requested.connect(_on_attack_requested)
	action_menu.wait_requested.connect(_on_wait_requested)
	action_menu.end_turn_requested.connect(_on_end_turn_requested)
	add_child(action_menu)
	unit_info = preload("res://src/ui/unit_info_panel.gd").new()
	unit_info.name = "UnitInfo"
	add_child(unit_info)


func _make_style_bg(color: Color) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = color
	return s


func _make_style_btn(bg: Color, border: Color, border_w: int, corner: int) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.set_corner_radius_all(corner)
	return s


func _show_mission_select():
	_clear_map()
	var overlay = Panel.new()
	overlay.name = "MissionSelect"
	overlay.anchor_left = 0.15
	overlay.anchor_right = 0.85
	overlay.anchor_top = 0.1
	overlay.anchor_bottom = 0.9
	_panel_bg(overlay, Color(0.03, 0.03, 0.1, 0.95))
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)
	var vbox = VBoxContainer.new()
	vbox.anchor_left = 0.0
	vbox.anchor_right = 1.0
	vbox.anchor_top = 0.0
	vbox.anchor_bottom = 1.0
	vbox.offset_left = 40
	vbox.offset_right = -40
	vbox.offset_top = 20
	vbox.offset_bottom = -20
	overlay.add_child(vbox)
	var title = Label.new()
	title.text = "HEX COMMAND"
	title.add_theme_color_override("font_color", Color(0.4, 0.9, 0.4))
	title.add_theme_font_size_override("font_size", 36)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)
	var subtitle = Label.new()
	subtitle.text = "Turn-Based Strategy - Select Mission"
	subtitle.add_theme_color_override("font_color", Color(0.5, 0.6, 0.5))
	subtitle.add_theme_font_size_override("font_size", 16)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(subtitle)
	var spacer0 = Control.new()
	spacer0.custom_minimum_size = Vector2(0, 20)
	vbox.add_child(spacer0)
	var missions = game_manager.map_loader.get_mission_list()
	for i in range(missions.size()):
		var mid = missions[i]
		var mdata = game_manager.map_loader.get_mission(mid)
		var btn = _make_mission_button(mid, mdata["name"], mdata["briefing"], i + 1)
		vbox.add_child(btn)
	var spacer = Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND
	vbox.add_child(spacer)


func _make_mission_button(mission_id: String, name: String, desc: String, num: int) -> Button:
	var btn = Button.new()
	btn.text = "Mission " + str(num) + ": " + name
	btn.custom_minimum_size = Vector2(0, 50)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.add_theme_color_override("font_color", Color(0.7, 0.8, 0.7))
	btn.add_theme_font_size_override("font_size", 16)
	var style = _make_style_btn(Color(0.08, 0.08, 0.2, 0.8), Color(0.2, 0.4, 0.3, 0.5), 1, 4)
	btn.add_theme_stylebox_override("normal", style)
	var hover = _make_style_btn(Color(0.12, 0.12, 0.3, 0.9), Color(0.3, 0.6, 0.4, 0.8), 1, 4)
	btn.add_theme_stylebox_override("hover", hover)
	btn.pressed.connect(func():
		_remove_mission_select()
		game_manager.start_mission(mission_id)
	)
	return btn


func _remove_mission_select():
	var ms = find_child("MissionSelect", true, false)
	if ms:
		ms.queue_free()


func _on_mission_started(mission_id: String, mission_name: String, briefing: String):
	_clear_map()
	_render_map()
	_render_units()
	camera.set_map_bounds(game_manager.hex_grid.width, game_manager.hex_grid.height, game_manager.hex_grid.hex_size)
	hud.set_mission_name(mission_name)
	hud.show_briefing(mission_id, mission_name, briefing)
	_update_hud()
	action_menu.reset()


func _clear_map():
	for c in _hex_container.get_children():
		c.queue_free()
	for c in _unit_container.get_children():
		c.queue_free()
	for c in _highlight_container.get_children():
		c.queue_free()
	for c in _fx_container.get_children():
		c.queue_free()


func _render_map():
	var grid = game_manager.hex_grid
	var hex_size = grid.hex_size
	for r in range(grid.height):
		for q in range(grid.width):
			var pos = grid.hex_to_pixel(q, r)
			var terrain = grid.get_terrain(q, r)
			var color = Enums.TERRAIN_COLORS[terrain]
			var hex_bg = ColorRect.new()
			hex_bg.color = color
			hex_bg.size = Vector2(hex_size * 1.8, hex_size * 1.6)
			hex_bg.position = pos - hex_bg.size * 0.5
			_hex_container.add_child(hex_bg)
			var border = ColorRect.new()
			border.color = Color(color.r * 0.6, color.g * 0.6, color.b * 0.6, 0.4)
			border.size = Vector2(hex_size * 1.8, hex_size * 1.6)
			border.position = pos - border.size * 0.5
			_hex_container.add_child(border)


func _render_units():
	for c in _unit_container.get_children():
		c.queue_free()
	for unit in game_manager.all_units:
		if not unit["alive"]:
			continue
		_render_unit_sprite(unit)


func _render_unit_sprite(unit: Dictionary):
	var grid = game_manager.hex_grid
	var pos = grid.hex_to_pixel(unit["hex_q"], unit["hex_r"])
	var color = UnitData.get_color(unit["type"])
	var circle = ColorRect.new()
	circle.color = color
	circle.size = Vector2(28, 28)
	circle.position = pos - circle.size * 0.5
	_unit_container.add_child(circle)
	var owner_indicator = ColorRect.new()
	if unit["owner"] == 0:
		owner_indicator.color = Color(0.2, 0.4, 1.0, 0.8)
	else:
		owner_indicator.color = Color(1.0, 0.2, 0.2, 0.8)
	owner_indicator.size = Vector2(10, 10)
	owner_indicator.position = pos + Vector2(14, -14)
	_unit_container.add_child(owner_indicator)
	var hp_ratio = float(unit["hp"]) / float(unit["max_hp"])
	var hp_bar = ColorRect.new()
	var hp_col = Color(0.2, 0.6, 0.2) if hp_ratio > 0.5 else (Color(0.7, 0.6, 0.2) if hp_ratio > 0.25 else Color(0.7, 0.2, 0.2))
	hp_bar.color = hp_col
	hp_bar.size = Vector2(24 * hp_ratio, 3)
	hp_bar.position = pos + Vector2(-12, 16)
	_unit_container.add_child(hp_bar)
	var hp_bg = ColorRect.new()
	hp_bg.color = Color(0.1, 0.1, 0.1, 0.6)
	hp_bg.size = Vector2(24, 3)
	hp_bg.position = pos + Vector2(-12, 16)
	_unit_container.add_child(hp_bg)
	if unit["promoted"]:
		var star = ColorRect.new()
		star.color = Color(1.0, 0.8, 0.0)
		star.size = Vector2(8, 8)
		star.position = pos + Vector2(-16, -16)
		_unit_container.add_child(star)


func _on_hex_highlighted(hexes: Array):
	for c in _highlight_container.get_children():
		c.queue_free()
	var grid = game_manager.hex_grid
	var hex_size = grid.hex_size
	for h in hexes:
		var pos = grid.hex_to_pixel(h.x, h.y)
		var hl = ColorRect.new()
		var is_attack = false
		if game_manager.attack_hexes != null:
			for ah in game_manager.attack_hexes:
				if ah.x == h.x and ah.y == h.y:
					is_attack = true
					break
		if is_attack:
			hl.color = Color(0.8, 0.2, 0.1, 0.3)
		else:
			hl.color = Color(0.2, 0.6, 0.4, 0.25)
		hl.size = Vector2(hex_size * 1.6, hex_size * 1.4)
		hl.position = pos - hl.size * 0.5
		_highlight_container.add_child(hl)


func _on_unit_selected(unit: Dictionary):
	if unit.is_empty():
		unit_info.hide()
		return
	var terrain = game_manager.hex_grid.get_terrain(unit["hex_q"], unit["hex_r"])
	var terrain_name = Enums.TERRAIN_NAMES.get(terrain, "Unknown")
	var terrain_def = Enums.TERRAIN_DEFENSE[terrain]
	unit_info.show_unit(unit, terrain_name, terrain_def)


func _on_phase_changed(phase: int):
	_update_hud()
	action_menu.reset()
	if phase == Enums.TurnPhase.VICTORY:
		_show_result_overlay("VICTORY", "All enemy units destroyed!", Color(0.2, 0.8, 0.3))
	elif phase == Enums.TurnPhase.GAME_OVER:
		_show_result_overlay("DEFEAT", "All your units have been lost.", Color(0.8, 0.2, 0.2))


func _on_move_requested():
	pass


func _on_attack_requested():
	pass


func _on_wait_requested():
	game_manager.wait_action()


func _on_end_turn_requested():
	game_manager.end_player_turn()


func _on_combat_resolved(results: Dictionary):
	_render_units()
	_update_hud()
	if results.has("damage_dealt"):
		_spawn_floating_text(str(results["damage_dealt"]) + " DMG", Color(1, 0.5, 0.2))
	if results.get("defender_destroyed", false):
		_spawn_floating_text("DESTROYED!", Color(1, 0.3, 0.3))
	if results.get("promoted", false):
		_spawn_floating_text("* PROMOTED!", Color(1, 0.8, 0))
	if game_manager.selected_unit:
		var terrain = game_manager.hex_grid.get_terrain(game_manager.selected_unit["hex_q"], game_manager.selected_unit["hex_r"])
		var terrain_name = Enums.TERRAIN_NAMES.get(terrain, "Unknown")
		var terrain_def = Enums.TERRAIN_DEFENSE[terrain]
		unit_info.show_unit(game_manager.selected_unit, terrain_name, terrain_def)
		unit_info.show_combat_result(results)


func _spawn_floating_text(text: String, color: Color):
	var label = Label.new()
	label.text = text
	label.add_theme_color_override("font_color", color)
	label.add_theme_font_size_override("font_size", 20)
	label.position = Vector2(400 + randi_range(-50, 50), 300 + randi_range(-50, 50))
	_fx_container.add_child(label)
	var tween = create_tween()
	tween.tween_property(label, "position:y", label.position.y - 60, 1.0)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 1.0)
	tween.tween_callback(func(): label.queue_free())


func _show_result_overlay(title: String, message: String, color: Color):
	var overlay = Panel.new()
	overlay.name = "ResultOverlay"
	overlay.anchor_left = 0.2
	overlay.anchor_right = 0.8
	overlay.anchor_top = 0.25
	overlay.anchor_bottom = 0.75
	_panel_bg(overlay, Color(0.03, 0.03, 0.1, 0.95))
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)
	var vbox = VBoxContainer.new()
	vbox.anchor_left = 0.0
	vbox.anchor_right = 1.0
	vbox.anchor_top = 0.0
	vbox.anchor_bottom = 1.0
	vbox.offset_left = 30
	vbox.offset_right = -30
	overlay.add_child(vbox)
	var title_label = Label.new()
	title_label.text = title
	title_label.add_theme_color_override("font_color", color)
	title_label.add_theme_font_size_override("font_size", 36)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title_label)
	var msg_label = Label.new()
	msg_label.text = message
	msg_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	msg_label.add_theme_font_size_override("font_size", 16)
	msg_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	msg_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(msg_label)
	var stats_label = Label.new()
	var alive = 0
	for u in game_manager.player_units:
		if u["alive"]: alive += 1
	stats_label.text = "Units Survived: " + str(alive) + "/" + str(game_manager.player_units.size())
	stats_label.add_theme_color_override("font_color", Color(0.5, 0.6, 0.5))
	stats_label.add_theme_font_size_override("font_size", 14)
	stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(stats_label)
	var btn = Button.new()
	btn.text = "BACK TO MISSIONS"
	btn.custom_minimum_size = Vector2(250, 50)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	btn.add_theme_color_override("font_color", Color(1, 1, 1))
	btn.add_theme_font_size_override("font_size", 16)
	_save_mission_progress()
	_unlock_achievement()
	var btn_style = _make_style_btn(Color(0.2, 0.4, 0.3, 0.8), Color(0.3, 0.6, 0.4), 1, 6)
	btn.add_theme_stylebox_override("normal", btn_style)
	btn.pressed.connect(func():
		overlay.queue_free()
		_show_mission_select()
	)
	vbox.add_child(btn)


func _save_mission_progress():
	if not game_manager.current_mission_id:
		return
	var data = {
		"last_mission": game_manager.current_mission_id,
		"completed_missions": [game_manager.current_mission_id],
		"turn_number": game_manager.turn_number,
	}
	if Engine.has_singleton("GalaxyAPI"):
		var api = Engine.get_singleton("GalaxyAPI")
		if api and api.has_method("save"):
			api.save(data)


func _unlock_achievement():
	if not game_manager.current_mission_id:
		return
	var ach_id = "mission_" + game_manager.current_mission_id
	if Engine.has_singleton("GalaxyAPI"):
		var api = Engine.get_singleton("GalaxyAPI")
		if api and api.has_method("unlock_achievement"):
			api.unlock_achievement(ach_id)


func _on_victory():
	pass


func _on_defeat():
	pass


func _update_hud():
	var alive_players = 0
	var alive_enemies = 0
	for u in game_manager.player_units:
		if u["alive"]: alive_players += 1
	for u in game_manager.enemy_units:
		if u["alive"]: alive_enemies += 1
	hud.update_turn(game_manager.turn_number, game_manager.phase, alive_players, alive_enemies)


func _input(event):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_click(event.position)


func _handle_click(screen_pos: Vector2):
	var phase = game_manager.phase
	if phase != Enums.TurnPhase.PLAYER_MOVE and phase != Enums.TurnPhase.PLAYER_ACTION:
		return
	var world_pos = camera.get_global_mouse_position()
	var hex = game_manager.hex_grid.pixel_to_hex(world_pos.x, world_pos.y)
	var q = hex.x
	var r = hex.y
	if not game_manager.hex_grid.is_in_bounds(q, r):
		return
	var clicked_unit = game_manager.hex_grid.get_unit(q, r)
	if clicked_unit != null and clicked_unit["owner"] == 0 and clicked_unit["alive"]:
		game_manager.select_unit(clicked_unit)
		action_menu.update_for_unit(clicked_unit, not clicked_unit["has_moved"], not clicked_unit["has_acted"])
		return
	if game_manager.selected_unit != null:
		for h in game_manager.attack_hexes:
			if h.x == q and h.y == r:
				var target = game_manager.hex_grid.get_unit(q, r)
				if target != null and target["owner"] != 0:
					game_manager.attack_target(q, r)
					action_menu.update_for_unit(game_manager.selected_unit, not game_manager.selected_unit["has_moved"], not game_manager.selected_unit["has_acted"])
					return
		if not game_manager.selected_unit["has_moved"]:
			for h in game_manager.reachable_hexes:
				if h.x == q and h.y == r:
					game_manager.move_unit_to(q, r)
					action_menu.update_for_unit(game_manager.selected_unit, not game_manager.selected_unit["has_moved"], not game_manager.selected_unit["has_acted"])
					return
	game_manager._deselect_unit()
	action_menu.reset()
