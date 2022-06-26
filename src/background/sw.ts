
import browser from 'webextension-polyfill';
import { defaultSettings, STORE_KDS_SETTINGS_FIELD } from '../values';
import type { Settings } from '../types';

browser.action.onClicked.addListener(() => {
  browser.tabs.create({
    url: "https://github.com/ciricc/kinopoisk-dualsubs#readme",
  })
});

browser.storage.sync.get(STORE_KDS_SETTINGS_FIELD).then((v:Settings) => {
  let settings = {...defaultSettings};
  if (v[STORE_KDS_SETTINGS_FIELD]) {
    settings = {
      ...settings,
      ...v[STORE_KDS_SETTINGS_FIELD],
    }
  }
  browser.storage.sync.set({[STORE_KDS_SETTINGS_FIELD]: settings});
});