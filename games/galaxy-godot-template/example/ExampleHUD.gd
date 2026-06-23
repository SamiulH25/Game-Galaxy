extends Node
## Example script showing how to use GalaxyAPI.
## Attach this to a Node or use as reference for your own game.

@onready var status_label: Label = $"../Status"

var _game_data: Dictionary = {
	"score": 0,
	"level": 1,
	"player_name": "Hero"
}


func _ready():
	status_label.text = "GalaxyAPI ready. Press 1-4 to test!"
	_print("Bridge available: " + str(GalaxyAPI.bridge_available))


func _input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				_on_save()
			KEY_2:
				_on_load()
			KEY_3:
				_on_submit_score()
			KEY_4:
				_on_unlock_achievement()


func _on_save():
	_print("Saving...")
	_game_data["score"] += 100
	GalaxyAPI.save(_game_data, func(result):
		if result and not result.is_empty():
			_print("Save OK: " + JSON.stringify(result))
		else:
			_print("Save failed or no auth")
	)


func _on_load():
	_print("Loading...")
	GalaxyAPI.load(func(data):
		if data and not data.is_empty():
			_game_data = data
			_print("Loaded: " + JSON.stringify(data))
		else:
			_print("No save data found")
	)


func _on_submit_score():
	_print("Submitting score...")
	var score_data = {
		"score": _game_data.get("score", 0),
		"level": _game_data.get("level", 1)
	}
	GalaxyAPI.submit_score(score_data, func(result):
		if result and not result.is_empty():
			_print("Score submitted: " + JSON.stringify(result))
		else:
			_print("Score submission failed")
	)


func _on_unlock_achievement():
	_print("Unlocking achievement...")
	GalaxyAPI.unlock_achievement("test_achievement", func(result):
		if result and not result.is_empty():
			_print("Achievement: " + JSON.stringify(result))
		else:
			_print("Achievement unlock failed")
	)


func _print(msg: String):
	print("[Example] ", msg)
	if status_label:
		status_label.text = msg
