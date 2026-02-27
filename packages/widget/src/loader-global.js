import { initFromScripts, mount, mountFromScript } from "./core.js";

const api = {
  mount,
  init: initFromScripts,
};

if (typeof window !== "undefined") {
  window.CryptoWireWidget = api;

  if (typeof document !== "undefined" && document.currentScript) {
    mountFromScript(document.currentScript);
  } else {
    initFromScripts();
  }
}

export { initFromScripts as init, mount, mountFromScript };
