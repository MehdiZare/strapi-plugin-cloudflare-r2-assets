"use strict";
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
      reject.bind(
        null,
        new Error(
          "Unknown variable dynamic import: " + path + (path.split("/").length !== segs ? ". Note that variables only represent file names one level deep." : "")
        )
      )
    );
  });
};
const PLUGIN_ID = "cloudflare-r2-assets";
const SETTINGS_READ_ACTION = `plugin::${PLUGIN_ID}.read`;
const strapi = { "name": "cloudflare-r2-assets" };
const packageJson = {
  strapi
};
const pluginId = packageJson.strapi.name;
const getTrad = (id) => `${pluginId}.${id}`;
const prefixTranslations = (data, prefix) => Object.fromEntries(Object.entries(data).map(([key, value]) => [`${prefix}.${key}`, value]));
const index = {
  register(app) {
    app.registerPlugin({
      id: pluginId,
      name: "Cloudflare R2 Assets"
    });
  },
  bootstrap(app) {
    app.addSettingsLink("global", {
      id: `${pluginId}-settings`,
      to: `/settings/${pluginId}`,
      intlLabel: {
        id: getTrad("settings.link.label"),
        defaultMessage: "Cloudflare R2 Assets"
      },
      Component: () => Promise.resolve().then(() => require("./SettingsStatusPage-BH8S3eFI.js")),
      permissions: [
        {
          action: SETTINGS_READ_ACTION,
          subject: null
        }
      ]
    });
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => Promise.resolve().then(() => require("./en-DcBLfTkj.js")), "./translations/fr.json": () => Promise.resolve().then(() => require("./fr-CjUS8rp1.js")) }), `./translations/${locale}.json`, 3);
          return {
            data: prefixTranslations(data, pluginId),
            locale
          };
        } catch {
          return {
            data: {},
            locale
          };
        }
      })
    );
  }
};
exports.index = index;
exports.pluginId = pluginId;
