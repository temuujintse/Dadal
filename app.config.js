// ЕДИЙН БҮРЭН app config (app.json-ийг орлоо).
//
// Анхаар: Expo CLI нь app.config.js байвал app.json-ийг огт уншихгүй —
// хоёуланг нь merge хийдэггүй. Тиймээс бүх тохиргоо ЭНД байх ЁСТОЙ.
//
// Динамикийн OAuth хэсэг (.env-ээс):
// - iOS: Google iOS client-д redirect URI зөвхөн reverse-client-ID scheme
//   (`com.googleusercontent.apps.<client-id>:/…`) хэлбэрээр зөвшөөрөгддөг.
//   Энэ scheme-г CFBundleURLTypes-д бүртгэж апп руу чиглүүлнэ.
//   Client ID: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.
// - Android: Chrome Custom Tab-аас буцах `<package>:/oauthredirect` redirect
//   апп руу очихын тулд VIEW intent filter. Package: com.temu.familyhabit.
//
// EXPO_PUBLIC_* хувьсагчийг Expo CLI .env-ээс автоматаар ачаалдаг.

const IOS_CLIENT_ID_RE = /^\d+-[0-9a-zA-Z_-]+\.apps\.googleusercontent\.com$/;
const ANDROID_PACKAGE = 'com.temu.familyhabit';

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

const expoConfig = {
  expo: {
    name: 'Гэр Бүлийн Дадал',
    slug: 'family-habit-rn',
    // Төсөл ХУВИЙН биш, байгууллагын бүртгэлд (tushigakatsukis-team) үүссэн.
    // Ийм үед `owner`-ийг заавал бичнэ — эс тэгвэл EAS нь нэвтэрсэн
    // хэрэглэгчийн хувийн бүртгэлээс `family-habit-rn` slug-ийг хайж олохгүй
    // бөгөөд build эхлэхэд "Project not found" гэж унана.
    owner: 'tushigakatsukis-team',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: ANDROID_PACKAGE,
      usesAppleSignIn: true,
    },
    android: {
      package: ANDROID_PACKAGE,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F97316',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [{ scheme: ANDROID_PACKAGE }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#FFFAF5',
        },
      ],
      'expo-apple-authentication',
      [
        'expo-web-browser',
        {
          experimentalLauncherActivity: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#F97316',
        },
      ],
    ],
    scheme: 'familyhabit',
    // `eas init` нь динамик config (app.config.js) руу өөрөө бичиж чаддаггүй
    // тул энэ ID-г гараар нэмэв. Энэ нь EAS дээрх төслийг заана:
    // @tushigakatsukis-team/family-habit-rn
    extra: {
      eas: {
        projectId: '385dc4bf-551d-488c-ba0d-3bff186140f1',
      },
    },
  },
};

// Client ID формат таарч байж л scheme бүртгэнэ — хоосон/буруу үед iOS
// URL type нэмэхгүй (SOCIAL_AUTH_SETUP.md-д заавар бий).
if (IOS_CLIENT_ID_RE.test(iosClientId)) {
  const reversedClientId = `com.googleusercontent.apps.${iosClientId.replace(
    /\.apps\.googleusercontent\.com$/i,
    ''
  )}`;
  expoConfig.expo.ios.infoPlist = {
    CFBundleURLTypes: [
      {
        CFBundleURLName: 'google-oauth-reverse-client',
        CFBundleURLSchemes: [reversedClientId],
      },
    ],
  };
}

module.exports = expoConfig;
