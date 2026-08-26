# Google / Apple social login тохиргоо

## 0. Гол нөхцөл: Expo Go дээр Google OAuth АЖИЛЛАХГҮЙ

Expo-ийн OAuth proxy (`auth.expo.io`) SDK 53-аас бүрэн хасагдсан тул
[албан ёсны баримт бичигт](https://docs.expo.dev/guides/authentication/) дурдсанаар
**OAuth/OpenID-г Expo Go дотор турших боломжгүй** — app scheme-г customize хийж
чадахгүйтэй холбоотой. Google товч нь Expo Go дотор тодорхой тайлбартай алдаа
гаргана. Email/password болон Demo нэвтрэлт Expo Go дээр хэвийн ажилласаар байна.

Google-оор нэвтрэхийн тулд **development build** ашиглана (доорх 4-р хэсэг).

## 1. Firebase provider enable хийх

Firebase Console → Authentication → Sign-in method:

- **Google** → Enable
- **Apple** → Enable (iOS production build ашиглах үед)
- Email/Password болон Anonymous provider-ийг хэрэгцээгээр enable хийнэ.

## 2. Google OAuth client ID үүсгэх

Google Cloud Console → APIs & Services → Credentials дээр Firebase project-той
холбоотой гурван OAuth client үүсгэнэ. Client ID-уудынхаа утгыг `.env` дотор
бичнэ (утга нь public identifier, secret биш):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android>.apps.googleusercontent.com
```

### 2.1 Web application client

- Application type: **Web application**
- Authorized JavaScript origins:
  - `http://localhost:8081` (web dev)
  - production web domain (байгаа бол)
- Authorized redirect URIs: web урсгалд expo-auth-session өөрийн origin дээр
  redirect хийдэг тул localhost origin-оо бүртгэхэд хангалттай.
- Энэ client ID-г мөн Firebase Console → Authentication → Google → Web SDK
  configuration-оос олж болно.

### 2.2 iOS client

- Application type: **iOS**
- Bundle ID: `com.temu.familyhabit` (app config-ын `ios.bundleIdentifier`)

**Redirect URI:** Google нь iOS client-д redirect URI-г гараар бичих талбар
өгдөггүй — Bundle ID-г хадгалахад `com.googleusercontent.apps.<IOS_CLIENT_ID>:/oauthredirect`
автоматаар зөвшөөрөгддөг. Яг энэ хэлбэрийг апп өөрөө ашигладаг:

- `src/screens/AuthScreen.jsx` нь `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`-ээс энэ
  reverse-client-ID URI-г автоматаар тооцоолж OAuth request-даа өгнө.
- Мөн ижил scheme-г OS апп руу чиглүүлэхээр `app.config.js` нь
  `ios.infoPlist.CFBundleURLTypes`-д автоматаар бүртгэнэ (client ID формат
  зөв байвал). `.env` өөрчилсний дараа native projects шинээр үүсгэх шаардлагатай:

```bash
npx expo prebuild --clean   # эсвэл EAS build шинээр хийнэ
```

### 2.3 Android client

- Application type: **Android**
- Package name: `com.temu.familyhabit`
- SHA-1 болон SHA-256 fingerprint:

```bash
# Debug keystore (development build):
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android

# Production keystore:
eas credentials   # эсвэл Play Console → App signing-ээс
```

**Redirect URI:** Android client-ын package name таарсан тул
`com.temu.familyhabit:/oauthredirect` автоматаар зөвшөөрөгддөг. Апп энэ URI-г
ашилладаг ба буцаж очих VIEW intent filter-ийг `app.config.js` дээр аль хэдийн
бүртгэсэн (`android.intentFilters`). Prebuild/rebuild хийсний дараа идэвхжинэ.

### 2.4 Хураангуй — аль environment, аль URI

| Environment | Redirect URI | Хаана бүртгэгдсэн |
|---|---|---|
| Expo Go | — | АЖИЛЛАХГҮЙ (proxy хасагдсан), апп өөрөө блоклоно |
| iOS dev/prod build | `com.googleusercontent.apps.<IOS_CLIENT_ID>:/oauthredirect` | Bundle ID-аар авто + `app.config.js` CFBundleURLTypes |
| Android dev/prod build | `com.temu.familyhabit:/oauthredirect` | Android client package-аар авто + `app.config.js` intentFilters |
| Web | origin-based (localhost:8081 гэх мэт) | Web client-ын Authorized origins |

## 3. Apple Sign-In

App config дотор дараах нь бэлэн:

- `ios.usesAppleSignIn: true`
- `expo-apple-authentication` plugin
- bundle identifier: `com.temu.familyhabit`

Apple Developer portal дээр App ID-д **Sign in with Apple** capability
идэвхжүүлж, Firebase Apple provider-д шаардлагатай Service ID, Team ID, Key ID,
private key-г сервер талд тохируулна.

## 4. Development build

Custom redirect scheme болон native provider-уудыг тогтвортой шалгахын тулд
Expo Go биш development build ашиглана:

```bash
npm install
npx eas build:configure
npx eas build --profile development --platform android
npx eas build --profile development --platform ios
```

`.env`, `app.config.js`, scheme зэрэг тохиргоо өөрчилсний дараа:

```bash
npx expo prebuild --clean   # local build ашиглавал
npx expo start -c           # Metro cache цэвэрлэх
```

Тохиргооны өөрчлөлт натив түвшинд (CFBundleURLTypes, intent filter) тусахын
тул development build-ийг ДАХИН barilgana — зөвхөн Metro refresh хангалтгүй.
