// Capacitor native integrations — safe to import from client-only code.
// No-op on the web; only runs inside the Android/iOS WebView.
import { Capacitor } from "@capacitor/core";

let initialized = false;

export async function initNative() {
  if (initialized || typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  initialized = true;

  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);

  // Status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0F172A" });
  } catch {}

  // Hide splash after first paint
  try {
    await SplashScreen.hide();
  } catch {}

  // Android hardware back button — navigate back in history, exit at root.
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  // Deep links (App Links / custom schemes)
  App.addListener("appUrlOpen", (event) => {
    try {
      const url = new URL(event.url);
      const path = url.pathname + url.search + url.hash;
      if (path && path !== "/") window.location.assign(path);
    } catch {}
  });
}