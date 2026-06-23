extends Control

const UnitData = preload("res://src/unit_data.gd")

signal move_requested()
signal attack_requested()
signal wait_requested()
signal end_turn_requested()

var _move_btn: Button = null
var _attack_btn: Button = null
var _wait_btn: Button = null
var _end_turn_btn: Button = null
var _status_label: Label = null


func _make_style_bg(color: Color) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = color
	return s


func _make_btn_style(bg: Color, border: Color) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(4)
	return s


func _ready():
	var panel = Panel.new()
	panel.anchor_left = 0.0
	panel.anchor_right = 1.0
	panel.anchor_top = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_top = -60.0
	panel.offset_bottom = 0.0
	var panel_style = _make_style_bg(Color(0.05, 0.05, 0.15, 0.9))
	panel.add_theme_stylebox_override("panel", panel_style)
	add_child(panel)
	var hbox = HBoxContainer.new()
	hbox.anchor_left = 0.5
	hbox.anchor_top = 0.5
	hbox.anchor_right = 0.5
	hbox.anchor_bottom = 0.5
	hbox.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.add_child(hbox)
	_status_label = Label.new()
	_status_label.text = "Select a unit"
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	_status_label.add_theme_font_size_override("font_size", 16)
	_status_label.custom_minimum_size = Vector2(300, 40)
	_status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	hbox.add_child(_status_label)
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(200, 1)
	hbox.add_child(spacer)
	_move_btn = _make_button("Move", Color(0.3, 0.6, 0.4))
	_move_btn.pressed.connect(func(): move_requested.emit())
	hbox.add_child(_move_btn)
	_attack_btn = _make_button("Attack", Color(0.8, 0.3, 0.2))
	_attack_btn.pressed.connect(func(): attack_requested.emit())
	hbox.add_child(_attack_btn)
	_wait_btn = _make_button("Wait", Color(0.5, 0.5, 0.5))
	_wait_btn.pressed.connect(func(): wait_requested.emit())
	hbox.add_child(_wait_btn)
	_end_turn_btn = _make_button("End Turn", Color(0.7, 0.5, 0.2))
	_end_turn_btn.pressed.connect(func(): end_turn_requested.emit())
	hbox.add_child(_end_turn_btn)
	hbox.add_theme_constant_override("separation", 8)
	_set_buttons_enabled(false)


func _make_button(text: String, color: Color) -> Button:
	var btn = Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(100, 40)
	btn.add_theme_color_override("font_color", Color(1, 1, 1))
	btn.add_theme_font_size_override("font_size", 14)
	var normal = _make_btn_style(Color(color.r * 0.5, color.g * 0.5, color.b * 0.5, 0.7), color)
	btn.add_theme_stylebox_override("normal", normal)
	var hover = _make_btn_style(Color(color.r * 0.7, color.g * 0.7, color.b * 0.7, 0.9), Color(color.r * 1.2, color.g * 1.2, color.b * 1.2))
	btn.add_theme_stylebox_override("hover", hover)
	var disabled = _make_btn_style(Color(0.1, 0.1, 0.15, 0.5), Color(0.2, 0.2, 0.25))
	btn.add_theme_stylebox_override("disabled", disabled)
	return btn


func _set_buttons_enabled(enabled: bool):
	_move_btn.disabled = not enabled
	_attack_btn.disabled = not enabled
	_wait_btn.disabled = not enabled


func update_for_unit(unit: Dictionary, has_reachable: bool, has_attackable: bool):
	if unit.is_empty():
		_status_label.text = "Select a unit"
		_set_buttons_enabled(false)
		return
	var name = UnitData.get_name(unit["type"])
	_status_label.text = name + " | HP: " + str(unit["hp"]) + "/" + str(unit["max_hp"])
	if unit["has_moved"] and unit["has_acted"]:
		_status_label.text += " [Done]"
		_set_buttons_enabled(false)
		return
	if not unit["has_moved"]:
		_move_btn.disabled = not has_reachable
	else:
		_move_btn.disabled = true
		_move_btn.text = "Moved"
	if not unit["has_acted"]:
		_attack_btn.disabled = not has_attackable
	else:
		_attack_btn.disabled = true
		_attack_btn.text = "Acted"
	_wait_btn.disabled = false


func reset():
	_move_btn.text = "Move"
	_attack_btn.text = "Attack"
	_status_label.text = "Select a unit"
	_set_buttons_enabled(false)
