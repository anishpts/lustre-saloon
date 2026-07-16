import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANT: replace `server.url` with your Vercel production URL, e.g.
//   https://your-app.vercel.app
// The Android WebView will load that URL directly, so Supabase auth, routing,
// deep links and all CRUD keep working exactly like the web app.
const config: CapacitorConfig = {
  appId: "app.lovable.salonbooking",
  appName: "Lustre",
  // TanStack Start is SSR — there is no local `dist/index.html` to ship.
  // Capacitor still requires a `webDir` at `cap sync` time, so we point it at
  // a tiny bundled shell (`capacitor-web/`) that only shows a loading state.
  // The actual app is loaded from `server.url` below (the deployed site).
  webDir: "capacitor-web",
  server: {
    // Point the native WebView at the deployed site.
    url: "https://saloon-app-tan.vercel.app",
    androidScheme: "https",
    // Allow http fallback only if your Vercel URL ever needs it (leave false in prod).
    cleartext: false,
    allowNavigation: [
      "*.vercel.app",
      "*.lovable.app",
      "*.supabase.co",
      "okfadxthpqwzuhwdnrnv.supabase.co",
    ],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0F172A",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0F172A",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;