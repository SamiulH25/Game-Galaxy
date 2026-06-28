import { i as writable } from "./shared2.js";
import "./index-server2.js";
//#region src/lib/stores/galaxyRender.ts
var galaxyRenderReady = writable(false);
function enableGalaxyRender() {
	galaxyRenderReady.set(true);
}
//#endregion
export { galaxyRenderReady as n, enableGalaxyRender as t };
