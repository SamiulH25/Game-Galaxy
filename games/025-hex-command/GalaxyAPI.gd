extends Node
## GalaxyAPI — Singleton for Game Galaxy 2.0 platform integration.
##
## All API calls are asynchronous. Pass a callback Callable to receive
## the result when the server responds. Methods that don't need the
## response can be called fire-and-forget.
##
## Usage:
##   # Fire-and-forget (no callback needed)
##   GalaxyAPI.save({"level": 3, "score": 1200})
##
##   # With callback
##   GalaxyAPI.load(func(data):
##       print("Loaded: ", data)
##   )
##
##   GalaxyAPI.submit_score({"score": 1200})
##   GalaxyAPI.unlock_achievement("first_blood")

## Whether the JavaScript bridge is available (Web export only).
var bridge_available: bool = false

## Auth state
var _token: String = ""
var _game_id: String = ""
var _auth_ready: bool = false
var _retries: int = 0
var _max_retries: int = 30

## Unique ID counter for JS callbacks.
var _cb_id: int = 0

## Maps callback IDs to Godot Callables.
var _callbacks: Dictionary = {}


func _ready():
	if OS.has_feature("web"):
		bridge_available = true


## Try to grab the auth token from the JS layer.
## Returns true if we have a valid token (null/false otherwise).
func refresh_auth() -> bool:
	if not bridge_available:
		return false
	var result = JavaScriptBridge.eval("window.GalaxyAPI.getToken()", true)
	if typeof(result) == TYPE_STRING and len(result) > 0:
		_token = result
		_game_id = JavaScriptBridge.eval("window.GalaxyAPI.getGameId()", true)
		_auth_ready = true
		_retries = 0
		return true
	_retries += 1
	return false


## Call this with await to block until auth token arrives (or max retries).
##   await GalaxyAPI._ensure_auth()
func _ensure_auth() -> bool:
	if _auth_ready:
		return true
	refresh_auth()
	while not _auth_ready and _retries < _max_retries:
		await get_tree().create_timer(0.1).timeout
		refresh_auth()
	return _auth_ready


## Register a JavaScript Promise→callback bridge.
## Creates a window.__galaxyCb{N} JS function that, when called,
## triggers the Godot Callable with the result.
func _register_js_callback(callback: Callable) -> int:
	_cb_id += 1
	var cid = _cb_id
	_callbacks[cid] = callback
	
	var js_cb = JavaScriptBridge.create_callback(func(args):
		var result = args[0] if args.size() > 0 and args[0] != null else {}
		if _callbacks.has(cid):
			_callbacks[cid].call(result)
			_callbacks.erase(cid)
	)
	JavaScriptBridge.eval("window.__galaxyCb" + str(cid) + " = " + str(js_cb.get_id()), true)
	return cid


## Eval JS that wires a Promise's .then to our callback.
func _call_js_promise(js_promise_code: String, cid: int):
	var code = "(" + js_promise_code + ").then(function(r) { window.__galaxyCb" + str(cid) + "(r); })"
	JavaScriptBridge.eval(code, true)


## Safely pass a Dictionary to JS as a temporary window property.
## Returns the temp property name.
func _dict_to_js(data: Dictionary) -> String:
	var json_str = JSON.stringify(data)
	# JSON is valid JS — assign it directly as a value expression
	JavaScriptBridge.eval("window.__gd = " + json_str, true)
	return "window.__gd"


## ---- Public API ----

## Save game data. Callback receives the server response Dictionary.
func save(data: Dictionary, callback: Callable = Callable()):
	if not bridge_available:
		if callback: callback.call({})
		return
	
	await _ensure_auth()
	if not _auth_ready:
		if callback: callback.call({})
		return
	
	var temp = _dict_to_js(data)
	
	if callback:
		var cid = _register_js_callback(callback)
		_call_js_promise("window.GalaxyAPI.save(" + temp + ")", cid)
	else:
		JavaScriptBridge.eval("window.GalaxyAPI.save(" + temp + ")", true)


## Load saved game data. Callback receives the data Dictionary.
func load(callback: Callable):
	if not bridge_available:
		callback.call({})
		return
	
	await _ensure_auth()
	if not _auth_ready:
		callback.call({})
		return
	
	var cid = _register_js_callback(callback)
	_call_js_promise("window.GalaxyAPI.load()", cid)


## Unlock an achievement. Callback receives server response.
func unlock_achievement(achievement_id: String, callback: Callable = Callable()):
	if not bridge_available:
		if callback: callback.call({})
		return
	
	await _ensure_auth()
	if not _auth_ready:
		if callback: callback.call({})
		return
	
	if callback:
		var cid = _register_js_callback(callback)
		_call_js_promise("window.GalaxyAPI.unlockAchievement('" + achievement_id + "')", cid)
	else:
		JavaScriptBridge.eval("window.GalaxyAPI.unlockAchievement('" + achievement_id + "')", true)


## Submit score to leaderboard. Callback receives server response.
func submit_score(score_data: Dictionary, callback: Callable = Callable()):
	if not bridge_available:
		if callback: callback.call({})
		return
	
	await _ensure_auth()
	if not _auth_ready:
		if callback: callback.call({})
		return
	
	var temp = _dict_to_js(score_data)
	
	if callback:
		var cid = _register_js_callback(callback)
		_call_js_promise("window.GalaxyAPI.submitScore(" + temp + ")", cid)
	else:
		JavaScriptBridge.eval("window.GalaxyAPI.submitScore(" + temp + ")", true)
