extends Control

const UnitData = preload("res://src/unit_data.gd")

var _panel: Panel = null
var _name_label: Label = null
var _hp_bar: ProgressBar = null
var _hp_label: Label = null
var _stats_label: Label = null
var _desc_label: Label = null


func _panel_bg(p: Panel, color: Color):
	var s = StyleBoxFlat.new()
	s.bg_color = color
	p.add_theme_stylebox_override("panel", s)


func _hp_style(color: Color) -> StyleBoxFlat:
	var s = StyleBoxFlat.new()
	s.bg_color = color
	s.set_corner_radius_all(2)
	return s


func _ready():
	_panel = Panel.new()
	_panel.anchor_left = 1.0
	_panel.anchor_right = 1.0
	_panel.anchor_top = 0.05
	_panel.anchor_bottom = 0.05
	_panel.offset_left = -240.0
	_panel.offset_right = -10.0
	_panel.offset_top = 10.0
	_panel.offset_bottom = 220.0
	_panel_bg(_panel, Color(0.05, 0.05, 0.15, 0.92))
	add_child(_panel)
	var vbox = VBoxContainer.new()
	vbox.anchor_left = 0.0
	vbox.anchor_right = 1.0
	vbox.anchor_top = 0.0
	vbox.anchor_bottom = 1.0
	vbox.offset_left = 10
	vbox.offset_right = -10
	vbox.offset_top = 10
	vbox.offset_bottom = -10
	_panel.add_child(vbox)
	_name_label = Label.new()
	_name_label.add_theme_color_override("font_color", Color(0.8, 0.9, 0.8))
	_name_label.add_theme_font_size_override("font_size", 18)
	_name_label.text = ""
	vbox.add_child(_name_label)
	var hp_container = HBoxContainer.new()
	_hp_label = Label.new()
	_hp_label.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	_hp_label.add_theme_font_size_override("font_size", 12)
	_hp_label.custom_minimum_size = Vector2(40, 20)
	_hp_label.text = "HP:"
	hp_container.add_child(_hp_label)
	_hp_bar = ProgressBar.new()
	_hp_bar.custom_minimum_size = Vector2(120, 20)
	_hp_bar.show_percentage = false
	_hp_bar.add_theme_color_override("font_color", Color(1, 1, 1))
	_hp_bar.add_theme_stylebox_override("fill", _hp_style(Color(0.2, 0.6, 0.2)))
	_hp_bar.add_theme_stylebox_override("background", _hp_style(Color(0.1, 0.15, 0.1)))
	hp_container.add_child(_hp_bar)
	vbox.add_child(hp_container)
	_stats_label = Label.new()
	_stats_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	_stats_label.add_theme_font_size_override("font_size", 12)
	_stats_label.text = ""
	vbox.add_child(_stats_label)
	_desc_label = Label.new()
	_desc_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.5))
	_desc_label.add_theme_font_size_override("font_size", 11)
	_desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_desc_label.max_lines_visible = 3
	_desc_label.text = ""
	vbox.add_child(_desc_label)
	var spacer = Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND
	vbox.add_child(spacer)
	var terrain_label = Label.new()
	terrain_label.name = "TerrainInfo"
	terrain_label.add_theme_color_override("font_color", Color(0.4, 0.5, 0.4))
	terrain_label.add_theme_font_size_override("font_size", 11)
	terrain_label.text = ""
	vbox.add_child(terrain_label)
	hide()


func show_unit(unit: Dictionary, terrain_name: String = "", terrain_def: int = 0):
	if unit.is_empty():
		hide()
		return
	show()
	_name_label.text = UnitData.get_name(unit["type"])
	if unit["owner"] != 0:
		_name_label.add_theme_color_override("font_color", Color(0.9, 0.5, 0.4))
	else:
		_name_label.add_theme_color_override("font_color", Color(0.4, 0.9, 0.5))
	if unit["promoted"]:
		_name_label.text += " *"
	_hp_bar.max_value = unit["max_hp"]
	_hp_bar.value = unit["hp"]
	_hp_label.text = "HP: " + str(unit["hp"]) + "/" + str(unit["max_hp"])
	var hp_ratio = float(unit["hp"]) / float(unit["max_hp"])
	var hp_col = Color(0.2, 0.6, 0.2) if hp_ratio > 0.5 else (Color(0.7, 0.6, 0.2) if hp_ratio > 0.25 else Color(0.7, 0.2, 0.2))
	_hp_bar.add_theme_stylebox_override("fill", _hp_style(hp_col))
	var stats_text = "ATK: " + str(unit["atk"]) + "  DEF: " + str(unit["def"])
	stats_text += "  MOV: " + str(unit["move"])
	stats_text += "  RNG: " + str(unit["range_min"]) + "-" + str(unit["range_max"])
	if unit["kills"] > 0:
		stats_text += "  Kills: " + str(unit["kills"])
	_stats_label.text = stats_text
	_desc_label.text = UnitData.get_stat(unit["type"], "description")
	var terrain_label = _panel.find_child("TerrainInfo", true, false)
	if terrain_label:
		if terrain_name:
			terrain_label.text = "Terrain: " + terrain_name + " (DEF+" + str(terrain_def) + ")"
		else:
			terrain_label.text = ""


func show_prediction(pred: Dictionary):
	var text = ""
	if pred.has("avg_damage"):
		text += "~" + str(roundi(pred["avg_damage"])) + " dmg"
		if pred.get("kills_defender", false):
			text += " [KILL]"
	if pred.has("avg_counter"):
		text += " | Counter: ~" + str(roundi(pred["avg_counter"]))
		if pred.get("kills_attacker", false):
			text += " [RISK]"
	_stats_label.text += "\n" + text


func show_combat_result(results: Dictionary):
	var text = ""
	if results.has("damage_dealt"):
		text += "Dealt: " + str(results["damage_dealt"])
	if results.get("defender_destroyed", false):
		text += " [DESTROYED]"
	if results.has("counter_damage") and results["counter_damage"] > 0:
		text += " | Counter: " + str(results["counter_damage"])
	if results.get("attacker_destroyed", false):
		text += " [LOST]"
	if results.get("promoted", false):
		text += " [PROMOTED]"
	_stats_label.text += "\n" + text
