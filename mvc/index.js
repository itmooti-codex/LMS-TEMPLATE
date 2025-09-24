// let model = new AWCModel();
// let view = new AWCView(model);
// let controller = new AWCController(model, view);

// controller.init();

import { config } from "../sdk/config.js";
import { VitalStatsSDK } from "../sdk/init.js";
import { createLoaderModal, showLoader, hideLoader } from "../utils/helper.js";
import { AWCModel } from "./model.js";
import { AWCController } from "./controller.js";
import { AWCView } from "./view.js";

(async function bootstrap() {
  createLoaderModal();
  showLoader();
  try {
    const { slug, apiKey } = config;
    const sdk = new VitalStatsSDK({ slug, apiKey });
    const plugin = await sdk.initialize();
    window.tempPlugin ??= plugin;
    const model = new AWCModel(plugin);
    const view = new AWCView({
      mountId: "renderForms",
      modalRootId: "modal-root",
      postTextareaId: "post-data",
      postButtonId: "post-button",
      model: model,
    });
    const controller = new AWCController(model, view);

    // Kick things off
    controller.init();
  } catch (error) {
    console.error(error);
  }
})();
