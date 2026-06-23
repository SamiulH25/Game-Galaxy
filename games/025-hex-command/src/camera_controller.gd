## CameraController — Pan and zoom for the hex map.
extends Camera2D

## Zoom range.
var min_zoom: float = 0.5
var max_zoom: float = 2.0
var zoom_speed: float = 0.1
var pan_speed: float = 600.0
var drag_pan: bool = false
var _drag_start: Vector2 = Vector2.ZERO
var _camera_start: Vector2 = Vector2.ZERO
var _is_dragging: bool = false

## Map boundaries.
var map_width: int = 0
var map_height: int = 0
var hex_size: float = 36.0


func _ready():
	position = Vector2(400, 300)


func _process(delta):
	# Keyboard panning
	var pan = Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		pan.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		pan.y += 1
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		pan.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		pan.x += 1
	
	if pan != Vector2.ZERO:
		pan = pan.normalized() * pan_speed * delta / zoom.x
		position += pan
		_clamp_position()
	
	# Zoom with scroll wheel
	if drag_pan:
		# Middle-mouse drag for panning
		if Input.is_mouse_button_pressed(MOUSE_BUTTON_MIDDLE):
			if not _is_dragging:
				_is_dragging = true
				_drag_start = get_global_mouse_position()
				_camera_start = position
		else:
			if _is_dragging:
				_is_dragging = false
	
	if _is_dragging:
		var mouse_pos = get_global_mouse_position()
		var offset = mouse_pos - _drag_start
		position = _camera_start - offset * zoom.x
		_clamp_position()


func _input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			var new_zoom = zoom.x + zoom_speed
			zoom = Vector2(min(new_zoom, max_zoom), min(new_zoom, max_zoom))
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			var new_zoom = zoom.x - zoom_speed
			zoom = Vector2(max(new_zoom, min_zoom), max(new_zoom, min_zoom))


func _clamp_position():
	if map_width <= 0 or map_height <= 0:
		return
	var view_w = get_viewport_rect().size.x * zoom.x
	var view_h = get_viewport_rect().size.y * zoom.x
	var map_w = map_width * hex_size * 1.5
	var map_h = map_height * hex_size * 1.5
	
	position.x = clamp(position.x, -map_w * 0.2, map_w * 1.2 - view_w * 0.5)
	position.y = clamp(position.y, -map_h * 0.2, map_h * 1.2 - view_h * 0.5)


## Set map boundaries.
func set_map_bounds(p_width: int, p_height: int, p_hex_size: float):
	map_width = p_width
	map_height = p_height
	hex_size = p_hex_size
	# Center on map
	var map_w = map_width * hex_size * 1.2
	var map_h = map_height * hex_size * 1.0
	position = Vector2(map_w * 0.4, map_h * 0.3)
