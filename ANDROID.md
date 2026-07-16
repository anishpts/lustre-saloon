# Android (Capacitor) build guide

Your TanStack Start app stays unchanged. Capacitor just wraps the deployed
Vercel site in a native Android WebView.

## 1. Set your Vercel URL

Edit `capacitor.config.ts` and set `server.url` to your production URL:

```ts
server: {
  url: "https://<your-app>.vercel.app",
  androidScheme: "https",
}
```

## 2. One-time setup (on your local machine)

Android Studio + Java JDK 17+ are required. Then, in the project root:

```bash
bun install
bunx cap add android          # first time only
bunx cap sync android         # uses capacitor-web/ as webDir (see note below)
bunx cap open android
```

### Why `webDir` is `capacitor-web/`, not `dist/`

TanStack Start is server-rendered — `bun run build` produces a Nitro server
bundle in `.output/`, not a static `dist/index.html`. Capacitor still requires
a `webDir` at sync time, so we ship a tiny placeholder shell at
`capacitor-web/index.html`. The APK never really renders it: the WebView
immediately loads `server.url` (`https://lustre-saloon.vercel.app`) from
`capacitor.config.ts`. The placeholder only appears if the remote host is
unreachable, and after 8s it retries the hosted URL. Do not delete
`capacitor-web/` — `bunx cap sync android` will fail without it.

## 3. AndroidManifest.xml — permissions & deep links

After `cap add android`, open
`android/app/src/main/AndroidManifest.xml` and inside `<manifest>` add:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<uses-feature android:name="android.hardware.camera" android:required="false" />
```

For deep links, inside `<activity android:name=".MainActivity">` add another
`<intent-filter>`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="<your-app>.vercel.app" />
</intent-filter>
```

## 4. Network security

`server.url` uses HTTPS and `cleartext: false`, so no extra network-security
config is needed. If you ever need to allow a self-signed dev host, create
`android/app/src/main/res/xml/network_security_config.xml` and reference it
with `android:networkSecurityConfig="@xml/network_security_config"` on the
`<application>` element.

## 5. Splash screen & icon

Put a 1024×1024 PNG icon and a splash image (2732×2732 recommended) in
`resources/` at the project root, then run:

```bash
bun add -d @capacitor/assets
bunx @capacitor/assets generate --android
```

This regenerates every mipmap/drawable density. Splash colors are already set
in `capacitor.config.ts` (`#0F172A`).

## 6. Build the APK / AAB

In Android Studio: **Build → Generate Signed Bundle / APK** → choose APK or
Android App Bundle → create/select a keystore → Release. Output ends up in
`android/app/build/outputs/`.

## What already works out of the box

- Supabase auth (session lives in the WebView's localStorage)
- All CRUD calls (they hit your Vercel deployment over HTTPS)
- TanStack Router routing + deep links (see `src/lib/native.ts`)
- Android hardware back button (wired in `src/lib/native.ts`)
- File upload (`<input type="file">` triggers the native picker)
- Camera / notifications via `@capacitor/camera`, `@capacitor/push-notifications`
  and `@capacitor/local-notifications` (already installed)

No TanStack Start code, UI, or business logic was changed.