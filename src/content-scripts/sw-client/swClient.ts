import type { Message, Settings } from "../../types";
import browser from "webextension-polyfill";
import { visiblePopup } from "../stores/global";
import { STORE_KDS_SETTINGS_FIELD } from "../../values";
import { settings } from "../stores/settings";


browser.storage.sync.get(STORE_KDS_SETTINGS_FIELD).then((s:Settings) => {
  if (s[STORE_KDS_SETTINGS_FIELD]) {settings.set(s[STORE_KDS_SETTINGS_FIELD]);}
});

settings.subscribe((val) => {
  if (val) browser.storage.sync.set({[STORE_KDS_SETTINGS_FIELD]: val});
});

browser.runtime.onMessage.addListener((message) => {
  let msg = message as Message;
  if (msg.type === "toggle_visible") {
    toggleVisible();
  }
});

const toggleVisible = () => {
  let visible:boolean;
  visiblePopup.subscribe((v) => visible = v)
  visiblePopup.set(!visible);
}