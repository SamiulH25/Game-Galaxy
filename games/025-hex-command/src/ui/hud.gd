extends Control

const Enums = preload("res://src/enums.gd")

signal end_turn_pressed()

var _mission_label: Label = null
var _turn_label: Label = null
var _status_label: Label = null
var _units_label: Label = null
var _briefing_overlay: Control = null


func _panel_bg(p: Panel, color: Color):
	var s = StyleBoxFlat.new()
	s.bg_color = color
	p.add_theme_stylebox_override("panel", s)


func _make_style_btn(bg: Color, border: Color, bw: int, cr: int) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(bw)
	s.set_corner_radius_all(cr)
	return s


func _ready():
	var panel = Panel.new()
	panel.anchor_left = 0.0
	panel.anchor_right = 1.0
	panel.anchor_top = 0.0
	panel.anchor_bottom = 0.0
	panel.offset_top = 0.0
	panel.offset_bottom = 40.0
	_panel_bg(panel, Color(0.03, 0.03, 0.1, 0.92))
	add_child(panel)
	var hbox = HBoxContainer.new()
	hbox.anchor_left = 0.0
	hbox.anchor_right = 1.0
	hbox.anchor_top = 0.0
	hbox.anchor_bottom = 1.0
	hbox.offset_left = 10
	hbox.offset_right = -10
	panel.add_child(hbox)
	_mission_label = Label.new()
	_mission_label.add_theme_color_override("font_color", Color(0.5, 0.8, 0.5))
	_mission_label.add_theme_font_size_override("font_size", 16)
	_mission_label.custom_minimum_size = Vector2(250, 40)
	_mission_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_mission_label.text = "Hex Command"
	hbox.add_child(_mission_label)
	_turn_label = Label.new()
	_turn_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.5))
	_turn_label.add_theme_font_size_override("font_size", 14)
	_turn_label.custom_minimum_size = Vector2(120, 40)
	_turn_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_turn_label.text = "Turn 1"
	hbox.add_child(_turn_label)
	_status_label = Label.new()
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	_status_label.add_theme_font_size_override("font_size", 14)
	_status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_status_label.text = "Your turn"
	hbox.add_child(_status_label)
	_units_label = Label.new()
	_units_label.add_theme_color_override("font_color", Color(0.5, 0.6, 0.5))
	_units_label.add_theme_font_size_override("font_size", 12)
	_units_label.custom_minimum_size = Vector2(150, 40)
	_units_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_units_label.text = ""
	hbox.add_child(_units_label)
	_briefing_overlay = _make_briefing_overlay()
	add_child(_briefing_overlay)


func _make_briefing_overlay() -> Control:
	var overlay = Panel.new()
	overlay.anchor_left = 0.2
	overlay.anchor_right = 0.8
	overlay.anchor_top = 0.2
	overlay.anchor_bottom = 0.8
	_panel_bg(overlay, Color(0.03, 0.03, 0.1, 0.95))
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	var vbox = VBoxContainer.new()
	vbox.anchor_left = 0.0
	vbox.anchor_right = 1.0
	vbox.anchor_top = 0.0
	vbox.anchor_bottom = 1.0
	vbox.offset_left = 30
	vbox.offset_right = -30
	vbox.offset_top = 30
	vbox.offset_bottom = -30
	overlay.add_child(vbox)
	var title = Label.new()
	title.name = "BriefingTitle"
	title.add_theme_color_override("font_color", Color(0.5, 0.9, 0.5))
	title.add_theme_font_size_override("font_size", 28)
	title.text = "MISSION"
	vbox.add_child(title)
	var desc = Label.new()
	desc.name = "BriefingDesc"
	desc.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	desc.add_theme_font_size_override("font_size", 16)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.max_lines_visible = 10
	desc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(desc)
	var obj = Label.new()
	obj.name = "BriefingObj"
	obj.add_theme_color_override("font_color", Color(0.7, 0.5, 0.3))
	obj.add_theme_font_size_override("font_size", 14)
	obj.text = "Objective: Destroy all enemy units"
	vbox.add_child(obj)
	var bonus = Label.new()
	bonus.name = "BriefingBonus"
	bonus.add_theme_color_override("font_color", Color(0.4, 0.5, 0.4))
	bonus.add_theme_font_size_override("font_size", 12)
	bonus.text = _get_bonus_text()
	vbox.add_child(bonus)
	var start_btn = Button.new()
	start_btn.text = "DEPLOY"
	start_btn.custom_minimum_size = Vector2(200, 50)
	start_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	start_btn.add_theme_color_override("font_color", Color(1, 1, 1))
	start_btn.add_theme_font_size_override("font_size", 18)
	start_btn.add_theme_stylebox_override("normal", _make_style_btn(Color(0.2, 0.5, 0.3, 0.8), Color(0.3, 0.8, 0.4), 2, 6))
	start_btn.add_theme_stylebox_override("hover", _make_style_btn(Color(0.3, 0.6, 0.4, 0.9), Color(0.4, 0.9, 0.5), 2, 6))
	start_btn.pressed.connect(func(): overlay.hide())
	vbox.add_child(start_btn)
	overlay.hide()
	return overlay


func show_briefing(mission_id: String, mission_name: String, briefing: String):
	var title = _briefing_overlay.find_child("BriefingTitle", true, false)
	var desc = _briefing_overlay.find_child("BriefingDesc", true, false)
	var obj = _briefing_overlay.find_child("BriefingObj", true, false)
	var bonus = _briefing_overlay.find_child("BriefingBonus", true, false)
	if title: title.text = mission_name
	if desc: desc.text = briefing
	if obj: obj.text = "Objective: Destroy all enemy units"
	if bonus: bonus.text = "Bonus: " + _get_bonus_text()
	_briefing_overlay.show()


func _get_bonus_text() -> String:
	return "Complete the mission"


func update_turn(turn: int, phase: int, player_alive: int, enemy_alive: int):
	_turn_label.text = "Turn " + str(turn)
	match phase:
		Enums.TurnPhase.PLAYER_MOVE, Enums.TurnPhase.PLAYER_ACTION:
			_status_label.text = "Your turn"
		Enums.TurnPhase.ENEMY_MOVE, Enums.TurnPhase.ENEMY_ACTION:
			_status_label.text = "Enemy turn..."
		Enums.TurnPhase.VICTORY:
			_status_label.text = "VICTORY!"
			_status_label.add_theme_color_override("font_color", Color(0.3, 1.0, 0.3))
		Enums.TurnPhase.GAME_OVER:
			_status_label.text = "DEFEAT"
			_status_label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	_units_label.text = String.chr(9674) + " " + str(player_alive) + "  " + String.chr(9838) + " " + str(enemy_alive)


func set_mission_name(name: String):
	_mission_label.text = name
