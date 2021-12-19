import App from "./App.svelte";
import './sw-client/swClient';
import 'virtual:windi.css';

/** Creating mount element on website page */
const MOUNT_EL_ID = "kinopoisk-dualsubs-extension";
let mountEl = document.getElementById(MOUNT_EL_ID);
if (mountEl) mountEl.innerHTML = "";
mountEl = document.createElement("div");
mountEl.setAttribute("id", MOUNT_EL_ID);
document.body.appendChild(mountEl);

const app = new App({
    target: mountEl,
});

export default app;
