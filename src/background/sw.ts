
import browser from 'webextension-polyfill';

import { defaultSettings, STORE_KDS_SETTINGS_FIELD } from '../values';
import type { Message, Settings } from '../types';

browser.action.onClicked.addListener((tab) => {
  if (tab.id) {
    browser.tabs.sendMessage(tab.id, {
      type: "toggle_visible",
      data: {},
    } as Message)
  }
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