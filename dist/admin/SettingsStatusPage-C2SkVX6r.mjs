import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Card, CardHeader, Flex, Typography, Status, CardBody, Box, Loader, Alert, Link, Divider } from "@strapi/design-system";
import { useFetchClient, Page, Layouts } from "@strapi/strapi/admin";
import { p as pluginId } from "./index-C1VOg2Ip.mjs";
import { useTheme } from "styled-components";
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
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { direction: "column", alignItems: "stretch", gap: 2, padding: 4, children: [
      /* @__PURE__ */ jsxs(Flex, { justifyContent: "space-between", alignItems: "center", gap: 3, children: [
        /* @__PURE__ */ jsx(Typography, { variant: "omega", tag: "h3", children: title2 }),
        /* @__PURE__ */ jsx(Status, { variant: statusVariantByTone[tone], size: "S", children: statusTextByTone[tone] })
      ] }),
      subtitle ? /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: subtitle }) : null
    ] }),
    children ? /* @__PURE__ */ jsx(CardBody, { padding: 4, paddingTop: 0, children }) : null
  ] });
};
const CodeBlock = ({ children }) => {
  const theme = useTheme();
  return /* @__PURE__ */ jsx(
    Box,
    {
      padding: 4,
      hasRadius: true,
      style: { overflowX: "auto", background: theme.colors.neutral100 },
      children: /* @__PURE__ */ jsx(
        Typography,
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
    return /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral500", style: { fontFamily: "monospace" }, children: "—" });
  }
  return /* @__PURE__ */ jsx(
    Typography,
    {
      variant: "pi",
      textColor: resolved ? "success600" : "danger600",
      style: { fontFamily: "monospace" },
      children: resolved ? "✓" : "✗"
    }
  );
};
const EnvKeyRow = ({ info }) => {
  return /* @__PURE__ */ jsxs(Flex, { gap: 3, alignItems: "flex-start", paddingTop: 1, paddingBottom: 1, children: [
    /* @__PURE__ */ jsx(Box, { style: { minWidth: "16px", textAlign: "center", paddingTop: "1px" }, children: /* @__PURE__ */ jsx(StatusIcon, { resolved: info.resolved, required: info.required }) }),
    /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 0, children: [
      /* @__PURE__ */ jsx(Flex, { gap: 2, alignItems: "center", children: /* @__PURE__ */ jsx(
        Typography,
        {
          variant: "pi",
          fontWeight: "semiBold",
          textColor: !info.resolved && info.required ? "danger600" : "neutral800",
          style: { fontFamily: "monospace" },
          children: info.prefixedKey ?? info.key
        }
      ) }),
      /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: info.description }),
      !info.resolved && info.required ? /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "danger600", children: "Set in your .env file" }) : null
    ] })
  ] });
};
const EnvKeyList = ({ envKeys }) => {
  const required = envKeys.filter((k) => k.required);
  const optional = envKeys.filter((k) => !k.required);
  return /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "stretch", gap: 1, children: [
    required.map((info) => /* @__PURE__ */ jsx(EnvKeyRow, { info }, info.key)),
    optional.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Box, { paddingTop: 2, paddingBottom: 1, children: /* @__PURE__ */ jsx(Typography, { variant: "sigma", textColor: "neutral600", children: "OPTIONAL" }) }),
      optional.map((info) => /* @__PURE__ */ jsx(EnvKeyRow, { info }, info.key))
    ] }) : null
  ] });
};
const endpoint = `/${pluginId}/settings/status`;
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
  const [state, setState] = useState({ status: "loading" });
  const { get } = useFetchClient();
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Page.Title, { children: title }),
    /* @__PURE__ */ jsxs(Page.Main, { children: [
      /* @__PURE__ */ jsx(Layouts.Header, { title, subtitle: "Read-only diagnostics for provider configuration and bucket connectivity." }),
      /* @__PURE__ */ jsxs(Layouts.Content, { children: [
        state.status === "loading" ? /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, alignItems: "center", justifyContent: "center", padding: 8, children: [
          /* @__PURE__ */ jsx(Loader, {}),
          /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Loading status..." })
        ] }) : null,
        state.status === "error" ? /* @__PURE__ */ jsx(
          Alert,
          {
            closeLabel: "Close alert",
            title: "Failed to load diagnostics",
            variant: "danger",
            children: state.error
          }
        ) : null,
        state.status === "success" ? /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
          state.data.versionCheck ? /* @__PURE__ */ jsx(
            StatusCard,
            {
              tone: state.data.versionCheck.updateAvailable ? "warning" : "ok",
              title: "Plugin Version",
              subtitle: state.data.versionCheck.updateAvailable ? `v${state.data.versionCheck.currentVersion} → v${state.data.versionCheck.latestVersion} available` : `v${state.data.versionCheck.currentVersion}`,
              children: state.data.versionCheck.updateAvailable ? /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 2, children: [
                /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral700", children: [
                  "Update with: ",
                  /* @__PURE__ */ jsx("code", { children: "npm install strapi-plugin-cloudflare-r2-assets@latest" })
                ] }),
                /* @__PURE__ */ jsx(
                  Link,
                  {
                    href: "https://github.com/MehdiZare/strapi-plugin-cloudflare-r2-assets/releases",
                    isExternal: true,
                    children: "View release notes"
                  }
                )
              ] }) : null
            }
          ) : null,
          state.data.activeProvider ? /* @__PURE__ */ jsx(
            StatusCard,
            {
              tone: "ok",
              title: "Upload Provider",
              subtitle: `Active provider: ${state.data.providerName ?? "unknown"}`
            }
          ) : /* @__PURE__ */ jsx(
            StatusCard,
            {
              tone: "error",
              title: "Upload Provider",
              subtitle: "The Cloudflare R2 upload provider is not active.",
              children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", children: "To activate, configure the upload provider in your Strapi project:" }),
                /* @__PURE__ */ jsx(CodeBlock, { children: pluginSetupSnippet }),
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "Then restart Strapi." })
              ] })
            }
          ),
          state.data.activeProvider && state.data.envKeys ? /* @__PURE__ */ jsx(
            StatusCard,
            {
              tone: state.data.envKeys.filter((k) => k.required).every((k) => k.resolved) ? "ok" : "error",
              title: "Environment Variables",
              subtitle: state.data.envKeys.filter((k) => k.required).every((k) => k.resolved) ? "All required environment variables are set." : "Some required environment variables are missing.",
              children: /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 3, children: [
                /* @__PURE__ */ jsx(EnvKeyList, { envKeys: state.data.envKeys }),
                !state.data.envKeys.some((k) => k.prefixedKey) ? /* @__PURE__ */ jsx(Box, { paddingTop: 2, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "If your env vars use a custom prefix (e.g. CMS_), set CF_R2_ENV_PREFIX in your .env file." }) }) : null,
                state.data.envKeys.filter((k) => k.required).some((k) => !k.resolved) ? /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: "After setting missing variables, restart Strapi." }) : null
              ] })
            }
          ) : null,
          state.data.config ? /* @__PURE__ */ jsx(StatusCard, { tone: "ok", title: "Effective Configuration", children: /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 3, children: Object.entries(state.data.config).map(([key, value], index, all) => /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 1, children: [
              /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: key }),
              /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "semiBold", textColor: "neutral800", children: formatConfigValue(value) })
            ] }),
            index < all.length - 1 ? /* @__PURE__ */ jsx(Divider, { marginTop: 2 }) : null
          ] }, key)) }) }) : null,
          state.data.health ? /* @__PURE__ */ jsx(
            StatusCard,
            {
              tone: state.data.health.ok ? "ok" : "error",
              title: "Bucket Connectivity",
              subtitle: state.data.health.detail ?? "No bucket check was executed.",
              children: !state.data.health.ok ? /* @__PURE__ */ jsxs(Flex, { direction: "column", gap: 2, children: [
                /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral700", fontWeight: "semiBold", children: "Troubleshooting steps:" }),
                /* @__PURE__ */ jsxs(Typography, { variant: "pi", textColor: "neutral700", tag: "ol", style: { paddingLeft: "20px", margin: 0 }, children: [
                  /* @__PURE__ */ jsxs("li", { children: [
                    "Verify that the bucket",
                    " ",
                    /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "semiBold", tag: "span", children: state.data.config?.bucket ?? "(unknown)" }),
                    " ",
                    "exists in your Cloudflare R2 dashboard."
                  ] }),
                  /* @__PURE__ */ jsxs("li", { children: [
                    "Confirm the endpoint",
                    " ",
                    /* @__PURE__ */ jsx(Typography, { variant: "pi", fontWeight: "semiBold", tag: "span", children: state.data.config?.endpoint ?? "(unknown)" }),
                    " ",
                    "is correct for your account."
                  ] }),
                  /* @__PURE__ */ jsx("li", { children: "Check that your R2 API token has read/write permissions for the bucket." }),
                  /* @__PURE__ */ jsx("li", { children: "Ensure the access key ID and secret access key are valid and not revoked." })
                ] })
              ] }) : null
            }
          ) : null,
          state.data.warnings.length > 0 ? /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 2, children: state.data.warnings.map((warning) => /* @__PURE__ */ jsx(
            Alert,
            {
              closeLabel: "Close alert",
              title: "Warning",
              variant: "warning",
              children: warning
            },
            warning
          )) }) : null,
          state.data.errors.length > 0 ? /* @__PURE__ */ jsx(Flex, { direction: "column", gap: 2, children: state.data.errors.map((error) => /* @__PURE__ */ jsx(
            Alert,
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
export {
  SettingsStatusPage as default
};
