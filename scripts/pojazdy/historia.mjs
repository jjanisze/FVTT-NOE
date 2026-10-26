/**
 * A vehicle action is undone through Foundry's original token history entry. The GM's later
 * seat/footprint writes only derive from that action; undoing them separately immediately
 * triggers the same synchronization again and can fill the history with ineffective undos.
 * The same policy also covers derived lights/vision and clipboard completion (canvas-history.mjs).
 */
export { DERIVED_UPDATE as OPCJA_SYNCHRONIZACJI } from "../canvas-history.mjs";
