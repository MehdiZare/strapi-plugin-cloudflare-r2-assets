"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const react = require("react");
const designSystem = require("@strapi/design-system");
const admin = require("@strapi/strapi/admin");
const index = require("./index-YbMF0qkF.js");
const styledComponents = require("styled-components");
const statusVariantByTone = {
  ok: "success",
  warning: "warning",
  error: "danger"
};
const statusTextByTone = {
  ok: "Healthy",
  warning: "Check",
  error: "Issue"
};
const StatusCard = ({ title: title2, tone, subtitle, children }) => {
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Card, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.CardHeader, { direction: "column", alignItems: "stretch", gap: 2, padding: 4, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { justifyContent: "space-between", alignItems: "center", gap: 3, children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", tag: "h3", children: title2 }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Status, { variant: statusVariantByTone[tone], size: "S", children: statusTextByTone[tone] })
      ] }),
      subtitle ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: subtitle }) : null
    ] }),
    children ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.CardBody, { padding: 4, paddingTop: 0, children }) : null
  ] });
};
const CodeBlock = ({ children }) => {
  const theme = styledComponents.useTheme();
  return /* @__PURE__ */ jsxRuntime.jsx(
    designSystem.Box,
    {
      padding: 4,
      hasRadius: true,
      style: { overflowX: "auto", background: theme.colors.neutral100 },
      children: /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Typography,
        {
          variant: "pi",
          tag: "pre",
          style: { fontFamily: "monospace", whiteSpace: "pre", margin: 0 },
          children
        }
      )
    }
  );
};
const StatusIcon = ({ resolved, required }) => {
  if (!required && !resolved) {
    return /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral500", style: { fontFamily: "monospace" }, children: "—" });
  }
  return /* @__PURE__ */ jsxRuntime.jsx(
    designSystem.Typography,
    {
      variant: "pi",
      textColor: resolved ? "success600" : "danger600",
      style: { fontFamily: "monospace" },
      children: resolved ? "✓" : "✗"
    }
  );
};
const EnvKeyRow = ({ info }) => {
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { gap: 3, alignItems: "flex-start", paddingTop: 1, paddingBottom: 1, children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { style: { minWidth: "16px", textAlign: "center", paddingTop: "1px" }, children: /* @__PURE__ */ jsxRuntime.jsx(StatusIcon, { resolved: info.resolved, required: info.required }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 0, children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { gap: 2, alignItems: "center", children: /* @__PURE__ */ jsxRuntime.jsx(
        designSystem.Typography,
        {
          variant: "pi",
          fontWeight: "semiBold",
          textColor: !info.resolved && info.required ? "danger600" : "neutral800",
          style: { fontFamily: "monospace" },
          children: info.prefixedKey ?? info.key
        }
      ) }),
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: info.description }),
      !info.resolved && info.required ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "danger600", children: "Set in your .env file" }) : null
    ] })
  ] });
};
const EnvKeyList = ({ envKeys }) => {
  const required = envKeys.filter((k) => k.required);
  const optional = envKeys.filter((k) => !k.required);
  return /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "stretch", gap: 1, children: [
    required.map((info) => /* @__PURE__ */ jsxRuntime.jsx(EnvKeyRow, { info }, info.key)),
    optional.length > 0 ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, paddingBottom: 1, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "sigma", textColor: "neutral600", children: "OPTIONAL" }) }),
      optional.map((info) => /* @__PURE__ */ jsxRuntime.jsx(EnvKeyRow, { info }, info.key))
    ] }) : null
  ] });
};
const endpoint = `/${index.pluginId}/settings/status`;
const title = "Cloudflare R2 Assets";
const formatConfigValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || typeof value === "undefined") {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};
const pluginSetupSnippet = `// config/plugins.ts
export default () => ({
  upload: {
    config: {
      provider: "strapi-plugin-cloudflare-r2-assets",
      providerOptions: {},
    },
  },
});`;
const SettingsStatusPage = () => {
  const [state, setState] = react.useState({ status: "loading" });
  const { get } = admin.useFetchClient();
  react.useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const { data } = await get(endpoint, {
          signal: controller.signal
        });
        setState({ status: "success", data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    };
    void run();
    return () => controller.abort();
  }, [get]);
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(admin.Page.Title, { children: title }),
    /* @__PURE__ */ jsxRuntime.jsxs(admin.Page.Main, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(admin.Layouts.Header, { title, subtitle: "Read-only diagnostics for provider configuration and bucket connectivity." }),
      /* @__PURE__ */ jsxRuntime.jsxs(admin.Layouts.Content, { children: [
        state.status === "loading" ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 3, alignItems: "center", justifyContent: "center", padding: 8, children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Loader, {}),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "Loading status..." })
        ] }) : null,
        state.status === "error" ? /* @__PURE__ */ jsxRuntime.jsx(
          designSystem.Alert,
          {
            closeLabel: "Close alert",
            title: "Failed to load diagnostics",
            variant: "danger",
            children: state.error
          }
        ) : null,
        state.status === "success" ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
          state.data.versionCheck ? /* @__PURE__ */ jsxRuntime.jsx(
            StatusCard,
            {
              tone: state.data.versionCheck.updateAvailable ? "warning" : "ok",
              title: "Plugin Version",
              subtitle: state.data.versionCheck.updateAvailable ? `v${state.data.versionCheck.currentVersion} → v${state.data.versionCheck.latestVersion} available` : `v${state.data.versionCheck.currentVersion}`,
              children: state.data.versionCheck.updateAvailable ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 2, children: [
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral700", children: [
                  "Update with: ",
                  /* @__PURE__ */ jsxRuntime.jsx("code", { children: "npm install strapi-plugin-cloudflare-r2-assets@latest" })
                ] }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  designSystem.Link,
                  {
                    href: "https://github.com/MehdiZare/strapi-plugin-cloudflare-r2-assets/releases",
                    isExternal: true,
                    children: "View release notes"
                  }
                )
              ] }) : null
            }
          ) : null,
          state.data.activeProvider ? /* @__PURE__ */ jsxRuntime.jsx(
            StatusCard,
            {
              tone: "ok",
              title: "Upload Provider",
              subtitle: `Active provider: ${state.data.providerName ?? "unknown"}`
            }
          ) : /* @__PURE__ */ jsxRuntime.jsx(
            StatusCard,
            {
              tone: "error",
              title: "Upload Provider",
              subtitle: "The Cloudflare R2 upload provider is not active.",
              children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 3, children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral700", children: "To activate, configure the upload provider in your Strapi project:" }),
                /* @__PURE__ */ jsxRuntime.jsx(CodeBlock, { children: pluginSetupSnippet }),
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "Then restart Strapi." })
              ] })
            }
          ),
          state.data.activeProvider && state.data.envKeys ? /* @__PURE__ */ jsxRuntime.jsx(
            StatusCard,
            {
              tone: state.data.envKeys.filter((k) => k.required).every((k) => k.resolved) ? "ok" : "error",
              title: "Environment Variables",
              subtitle: state.data.envKeys.filter((k) => k.required).every((k) => k.resolved) ? "All required environment variables are set." : "Some required environment variables are missing.",
              children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 3, children: [
                /* @__PURE__ */ jsxRuntime.jsx(EnvKeyList, { envKeys: state.data.envKeys }),
                !state.data.envKeys.some((k) => k.prefixedKey) ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 2, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "If your env vars use a custom prefix (e.g. CMS_), set CF_R2_ENV_PREFIX in your .env file." }) }) : null,
                state.data.envKeys.filter((k) => k.required).some((k) => !k.resolved) ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "After setting missing variables, restart Strapi." }) : null
              ] })
            }
          ) : null,
          state.data.config ? /* @__PURE__ */ jsxRuntime.jsx(StatusCard, { tone: "ok", title: "Effective Configuration", children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 3, children: Object.entries(state.data.config).map(([key, value], index2, all) => /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 1, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: key }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "semiBold", textColor: "neutral800", children: formatConfigValue(value) })
            ] }),
            index2 < all.length - 1 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Divider, { marginTop: 2 }) : null
          ] }, key)) }) }) : null,
          state.data.health ? /* @__PURE__ */ jsxRuntime.jsx(
            StatusCard,
            {
              tone: state.data.health.ok ? "ok" : "error",
              title: "Bucket Connectivity",
              subtitle: state.data.health.detail ?? "No bucket check was executed.",
              children: !state.data.health.ok ? /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 2, children: [
                /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral700", fontWeight: "semiBold", children: "Troubleshooting steps:" }),
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Typography, { variant: "pi", textColor: "neutral700", tag: "ol", style: { paddingLeft: "20px", margin: 0 }, children: [
                  /* @__PURE__ */ jsxRuntime.jsxs("li", { children: [
                    "Verify that the bucket",
                    " ",
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "semiBold", tag: "span", children: state.data.config?.bucket ?? "(unknown)" }),
                    " ",
                    "exists in your Cloudflare R2 dashboard."
                  ] }),
                  /* @__PURE__ */ jsxRuntime.jsxs("li", { children: [
                    "Confirm the endpoint",
                    " ",
                    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "semiBold", tag: "span", children: state.data.config?.endpoint ?? "(unknown)" }),
                    " ",
                    "is correct for your account."
                  ] }),
                  /* @__PURE__ */ jsxRuntime.jsx("li", { children: "Check that your R2 API token has read/write permissions for the bucket." }),
                  /* @__PURE__ */ jsxRuntime.jsx("li", { children: "Ensure the access key ID and secret access key are valid and not revoked." })
                ] })
              ] }) : null
            }
          ) : null,
          state.data.warnings.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 2, children: state.data.warnings.map((warning) => /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Alert,
            {
              closeLabel: "Close alert",
              title: "Warning",
              variant: "warning",
              children: warning
            },
            warning
          )) }) : null,
          state.data.errors.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx(designSystem.Flex, { direction: "column", gap: 2, children: state.data.errors.map((error) => /* @__PURE__ */ jsxRuntime.jsx(
            designSystem.Alert,
            {
              closeLabel: "Close alert",
              title: "Configuration Error",
              variant: "danger",
              children: error
            },
            error
          )) }) : null
        ] }) : null
      ] })
    ] })
  ] });
};
exports.default = SettingsStatusPage;
