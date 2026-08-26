# Гэр Бүлийн Дадал — Expo React Native

Гэр бүлийн өдөр тутмын дадал, хоолны төлөвлөгөө, хамтын оноо, урамшууллыг нэг дор удирдах Expo/Firebase апп.

## UX шинэчлэл

- 3 хуудастай Lottie onboarding, тодорхой **Алгасах** товч
- Google, Apple ID, email болон demo нэвтрэлт
- Нэр + аватар сонгодог богино family setup
- Гэр бүлийн гишүүнийг аватар, нэрээр хурдан нэмэх
- Invite link хуулах, share хийх, deep link-ээр join code автоматаар бөглөх
- Dashboard дээр өнөөдрийн To-Do болон **баруун тийш шударч дуусгах** үйлдэл
- 5 үндсэн tab: Нүүр, Хоол, Шагнал, Стат, Тохиргоо
- Horizontal meal calendar, хоолны зурагтай card
- Progress bar, locked/unlocked төлөвтэй gamified rewards
- Line chart, pie chart бүхий ойлгомжтой stats
- Амжилтын haptic feedback болон confetti effect
- Өглөө 08:00, орой сонгосон цагт 2 найрсаг reminder

## Орчны хувьсагч (заавал эхэлж хийнэ)

Firebase config болон Google OAuth client ID-ууд эх кодонд биш, `.env`
файлаас уншигдана:

```bash
cp .env.example .env
```

`.env` файлд Firebase project-ынхаа (`EXPO_PUBLIC_FIREBASE_*`) болон
шаардлагатай бол Google OAuth client ID-уудаа бөглөнө. Firebase болон OAuth
secret/private key-г client app дотор бүү хадгал. `.env` нь `.gitignore`-д
орсон тул commit хийгдэхгүй.

## Эхлүүлэх

```bash
npm install
npx expo start -c
```

Expo Go-оор email/demo login болон үндсэн UI-г туршиж болно. Google OAuth,
Apple Sign-In зэрэг native authentication-ийг бодит production
тохиргоотой шалгахдаа development build ашиглана (`eas.json` бэлэн байгаа):

```bash
npx eas build --profile development --platform android
# эсвэл
npx eas build --profile development --platform ios
```

## Код чанар

```bash
npm run lint
```

`eslint-config-expo` дээр суурилсан. Одоогийн байдлаар 0 error, 0 warning.

## Firebase

1. `.env` дотор Firebase Web app config-оо оруулна (дээрх "Орчны
   хувьсагч" хэсгийг үзнэ үү).
2. Firebase Authentication дээр Email/Password, Anonymous, Google болон
   шаардлагатай бол Apple provider-уудыг enable хийнэ.
3. `FIRESTORE_RULES.txt`-ийн rules-ийг Firebase Console → Firestore
   Database → Rules хэсэгт **бодитоор deploy хийнэ** — энэ файл локал
   дээр байгаа нь Firebase дээр амьд байна гэсэн үг биш. Deploy хийсний
   дараа Console дээрх амьд rules энэ файлын агуулгатай ижил байгааг
   шалгана (эсвэл CLI-ээр: `firebase deploy --only firestore:rules`).
   Энэ файл 2026-08-25-нд хоёр аюулгүйн нүхийг хаасан нэгтгэсэн
   хувилбар бөгөөд `firestore-rules.test.mjs` тестийн бүх 22 шалгалтыг
   emulator дээр давсан — deploy хийхээс өмнө тестийг локал дээр ажиллуулж
   баталгаажуулахаа бүү март (дэлгэрэнгүйг файлын толгойноос).
4. Social login-ийн тохиргоог `SOCIAL_AUTH_SETUP.md`-ээс хийнэ.

## Гол бүтэц

```text
src/
  App.jsx                     — navigation/layout, UI-only local state
  context/AuthContext.jsx     — Firebase auth state + sign in/up/out action-ууд
  hooks/
    useFamilyData.js          — Firestore listener, family/task CRUD, streak
    useOnboarding.js
    useInviteLinkCode.js
    useTaskTimer.js
  utils/
    dates.js
    streak.js
    invite.js
  constants/
    tasks.js
    moods.js
  components/ConfettiBurst.jsx
  screens/
    OnboardingScreen.jsx
    AuthScreen.jsx
    FamilySetupScreen.jsx
    DashboardScreen.jsx
    MealsScreen.jsx
    RewardsScreen.jsx
    StatsScreen.jsx
    SettingsScreen.jsx
  services/
    feedback.js
    notifications.js
assets/lottie/
```

Дэлгэрэнгүй өөрчлөлтийн түүхийг `CHANGELOG.md`-ээс харна уу — тэнд
nativewind v2→v4 шинэчлэлт, App.jsx-ийн задаргаа, ямар шалгалт хийгдсэн
(мөн ямар нь **хийгдээгүй** — жишээ нь бодит device дээрх туршилт) тухай
дэлгэрэнгүй бичсэн байгаа.
