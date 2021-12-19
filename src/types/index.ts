export type MessageType = "toggle_visible";
export type MessageData = Record<string, unknown>;

export type Message = {
  type:MessageType;
  data: MessageData | null;
}

export type Settings = {
  doublesubs_enabled: boolean;
  black_background_enabled: boolean;
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