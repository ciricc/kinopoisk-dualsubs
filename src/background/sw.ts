
import browser from 'webextension-polyfill';
import { defaultSettings, STORE_KDS_SETTINGS_FIELD } from '../values';
import type { Settings } from '../types';
import { getContentChildren, getContentMetadata, getContentStreamsMetadata, getWatchParams } from '../lib/KinopoiskOTTApi';

export type RuntimeMessage = {
  event: "ott:get_content_children" | "ott:get_metadata" | "ott:get_watchparams" | "ott:get_content_streams_metadata",
  data: GetContentChildren & GetMetadataRequest & GetContentStreamsMetadataRequest & GetWatchParams
}

export type GetMetadataRequest = {
  filmId: string
}

export type GetWatchParams = GetMetadataRequest
export type GetContentStreamsMetadataRequest = {
  contentId: string
}

export type GetContentChildren = GetContentStreamsMetadataRequest;

browser.runtime.onMessage.addListener(async (msg: RuntimeMessage): Promise<any> => {
  switch (msg.event) {
    case "ott:get_metadata":
      return getContentMetadata(msg.data.filmId);
    case "ott:get_watchparams":
      return getWatchParams(msg.data.filmId)
    case "ott:get_content_streams_metadata":
      return getContentStreamsMetadata(msg.data.contentId)
    case "ott:get_content_children":
      return getContentChildren(msg.data.contentId);
    default:
      return null;
  }
});

browser.action.onClicked.addListener(() => {
  browser.tabs.create({
    url: "https://github.com/ciricc/kinopoisk-dualsubs#readme",
  })
});

browser.storage.sync.get(STORE_KDS_SETTINGS_FIELD).then((v: Settings) => {
  let settings = { ...defaultSettings };

  if (v[STORE_KDS_SETTINGS_FIELD]) {
    settings = {
      ...settings,
      ...v[STORE_KDS_SETTINGS_FIELD],
    }
  }

  browser.storage.sync.set({ [STORE_KDS_SETTINGS_FIELD]: settings });
});