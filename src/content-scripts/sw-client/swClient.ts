import type { Settings } from "../../types";
import browser from "webextension-polyfill";
import { STORE_KDS_SETTINGS_FIELD } from "../../values";
import { settings } from "../stores/settings";

// Синхронизируем стор браузера с настройками клиента
browser.storage.sync.get(STORE_KDS_SETTINGS_FIELD).then((s:Settings) => {
  if (s[STORE_KDS_SETTINGS_FIELD]) {
    settings.set(s[STORE_KDS_SETTINGS_FIELD]);
  }
});

// Если настройки изменяются пользователем, синхронизируем со стором браузера
settings.subscribe((val) => {
  if (val) {
    browser.storage.sync.set({[STORE_KDS_SETTINGS_FIELD]: val});
  }
});