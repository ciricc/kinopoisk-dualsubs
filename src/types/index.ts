export type Settings = {
  doublesubs_enabled: boolean;
  black_background_enabled: boolean;
  hightlight_primary_cue_enabled: boolean;
  hotkeys_enabled: boolean;
  show_hotkeys_onboarding: boolean;
  selectable_primary_cue_enabled: boolean;
}

export type PlayerContentInformation = {
  episode: number;
  season: number;
  filmId: string;
}

export type PlayerWatchParams = {
  subtitleLanguage?: string;
}

export type PlayerSubtitles = {
  url: string;
}