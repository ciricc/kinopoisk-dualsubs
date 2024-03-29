import type { Settings } from "src/types";

export const defaultSettings:Settings = {
  doublesubs_enabled: true,
  black_background_enabled: true,
  hightlight_primary_cue_enabled: true,
  hotkeys_enabled: true,
  show_hotkeys_onboarding: true,
  selectable_primary_cue_enabled: false,
}

export const STORE_KDS_SETTINGS_FIELD = "kds_settings";