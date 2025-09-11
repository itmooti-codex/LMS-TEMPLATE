// SDK loader and initializer as a reusable class
export class VitalStatsSDK {
  constructor({ slug, apiKey }) {
    this.slug = slug;
    this.apiKey = apiKey;
    this.plugin = null;
  }

  async loadScript() {
    if (window.initVitalStats || window.initVitalStatsSDK) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://static-au03.vitalstats.app/static/sdk/v1/latest.js";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async initialize() {
    await this.loadScript();
    const initFn = window.initVitalStats || window.initVitalStatsSDK;
    if (!initFn) throw new Error("VitalStats init fn missing");
    const { plugin } = await initFn({
      slug: this.slug,
      apiKey: this.apiKey,
      isDefault: true,
    }).toPromise();
    this.plugin = plugin;
    return plugin;
  }
}
