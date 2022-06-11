import type { Message, Settings } from "../../types";
import browser from "webextension-polyfill";
import { visiblePopup } from "../stores/global";
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

// Слушаем сообщения от браузера
browser.runtime.onMessage.addListener((message) => {
  const msg = message as Message;
  if (msg.type === "toggle_visible") {
    toggleVisible();
  }
});

const toggleVisible = () => {
  let visible:boolean;
  visiblePopup.subscribe((v) => visible = v)
  visiblePopup.set(!visible);
}