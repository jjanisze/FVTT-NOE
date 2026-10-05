/** Nevada compatibility entry point; both bitmap themes share the compositor. */
import { createBitmapScenery } from "./poscig-bitmap.mjs";
export const createNevada = (scene, distance=0, signal) => createBitmapScenery(scene,"pustynia",distance,signal);
