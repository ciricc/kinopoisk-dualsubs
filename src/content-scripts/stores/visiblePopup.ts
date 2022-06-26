import { writable } from "svelte/store";

export const visiblePopup = writable<boolean>(false);