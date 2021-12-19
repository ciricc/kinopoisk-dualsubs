import type { Settings } from "../../types";
import { writable } from "svelte/store";

export const settings = writable<Settings|null>(null);