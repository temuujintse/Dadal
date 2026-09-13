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
    // Апп нь зөвхөн гэр бүлд биш — найзууд, хос, хувь хүнд ч зориулагдсан
    // болсон тул нэрийг ерөнхий болгов (PLAN_V2 §3.3).
    name: 'Дадал',
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
      infoPlist: {
        // Апп нь зөвхөн стандарт HTTPS шифрлэлт ашигладаг тул экспортын
        // хязгаарлалтаас чөлөөлөгдөнө. Энд нэг удаа зарласнаар App Store
        // Connect build бүр дээр тэр асуултыг дахин тавихгүй.
        ITSAppUsesNonExemptEncryption: false,
      },
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
      // Гишүүний профайл зураг болон гэр бүлийн нүүрний зураг сонгоход
      // хэрэглэнэ. iOS дээр эдгээр тайлбар МӨРГҮЙ бол App Store шалгалтаас
      // унана, Android дээр READ_MEDIA_IMAGES зөвшөөрөл нэмэгдэнэ.
      // Камер хэрэглэхгүй (зөвхөн зургийн сангаас сонгоно) тул
      // cameraPermission-ыг ЗОРИУДААР false болгож, илүү зөвшөөрөл
      // асуухаас сэргийлэв.
      [
        'expo-image-picker',
        {
          photosPermission: 'Гэр бүлийн гишүүдийн профайл зураг оруулахын тулд зургийн сандаа хандах зөвшөөрөл өгнө үү.',
          cameraPermission: false,
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
    // EAS Update (expo-updates). `eas build` эдгээрийг өөрөө нэмэх гэсэн ч
    // динамик config руу бичиж чаддаггүй тул гараар оруулав.
    // `runtimeVersion.policy: 'appVersion'` — update нь зөвхөн ижил
    // `version` (одоо 1.0.0) дугаартай build рүү тарна. Native өөрчлөлт
    // хийвэл version-оо ахиулж, шинэ build гаргах ёстой.
    updates: {
      url: 'https://u.expo.dev/385dc4bf-551d-488c-ba0d-3bff186140f1',
    },
    runtimeVersion: {
      policy: 'appVersion',
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
  // ЧУХАЛ: `...expoConfig.expo.ios.infoPlist`-ээр НИЙЛҮҮЛЖ бичнэ. Өмнө нь энэ
  // мөр infoPlist-ийг бүтнээр нь дарж бичдэг байсан тул Google client ID
  // тохируулмагц дээрх ITSAppUsesNonExemptEncryption арчигдаж, App Store
  // Connect build бүр дээр шифрлэлтийн асуултыг дахин тавьдаг болох байв.
  expoConfig.expo.ios.infoPlist = {
    ...expoConfig.expo.ios.infoPlist,
    CFBundleURLTypes: [
      {
        CFBundleURLName: 'google-oauth-reverse-client',
        CFBundleURLSchemes: [reversedClientId],
      },
    ],
  };
}

module.exports = expoConfig;
