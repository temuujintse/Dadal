# Changelog

Энэ файл нь өмнө root дотор тусад нь байсан `FIXES.md`, `PRODUCTION_FIXES.md`,
`MULTI_TENANT_FIX.md`, `FLOW_LOGIC_FIX.md`, `FLOW_FEATURES.md`, `UI_CHANGES.md`,
`UX_UPGRADE_NOTES.md`, `VALIDATION.md` файлуудыг нэгтгэсэн түүх юм.

## [Unreleased] — 2026-10-14 Тохиргооны бүртгэлийн карт

- `SettingsScreen.jsx`: "Миний бүртгэл" картын `Нэр:` нь сонгосон гишүүний
  оронд НЭВТЭРСЭН хэрэглэгчийн нэрийг (`currentMember.name`) харуулдаг болов —
  `Үүрэг:`-тэй нийцтэй.

## [Unreleased] — 2026-08-25 Firestore rules нэгтгэл

- `FIRESTORE_RULES.fixed.txt` (засварласан дүрэм) болон `FIRESTORE_RULES.txt`
  (нүхтэй хувилбар)-ийг НЭГ каноник файл болгон нэгтгэв: одоо
  `FIRESTORE_RULES.txt` нь хоёр аюулгүйн нүхийг хаасан засварласан агуулгатай,
  `FIRESTORE_RULES.fixed.txt` устгагдсан. Хаагдсан нүхүүд:
  1. `inviteCodes` дээрх `allow read: if signedIn()` нь `list`-ийг ч оролцуулж
     байсан тул нэвтэрсэн хэн ч (anonymous зочин ч) БҮХ гэр бүлийн
     familyId/familyName/ownerUid-г татаж авч болно байсан → одоо зөвхөн
     `get`, `list: false`.
  2. `members/{uid}` create дүрэм нь урилга шалгахгүйгээр дурын гэр бүлд
     өөрийгөө `role:'parent'` (админ)-аар бичих боломж олгож байсан → одоо
     гурван зөвшөөрөгдсөн зам (admin-ийн нэмэлт / эзнийг өөрийгөө үүсгэх /
     хүчинтэй урилгын код + `role:'member'`).
- Эмулятор дээрх баталгаажуулалт (`firestore-rules.test.mjs`,
  `@firebase/rules-unit-testing` devDependency болгон нэмэгдсэн): нүхтэй
  хувилбарт А1/А3/А5/А6 халдлагын тестүүд УНАНА байсныг дахин нотлов,
  нэгтгэсэн файл **22/22 тест ДАВНА**.
- `firestore-rules.test.mjs`: default `RULES_FILE` одоо `FIRESTORE_RULES.txt`,
  толгойн тайлбар шинэчлэгдсэн. README-ийн Firebase хэсэгт deploy хийсний
  дараа амьд rules-ийг локал файлтай тулгах заавар нэмэгдсэн.

## [Unreleased] — 2026-08-15 тохиргооны засварууд

- `eas.json` нэмэгдсэн (development/preview/production build profile) — өмнө нь
  README дотор `eas build` заавар байсан ч `eas.json` дутуу байсан тул команд
  бодитоор ажиллахгүй байсан.
- Firebase config (`src/firebaseConfig.js`) hardcoded утгаас `.env` орчны
  хувьсагч руу шилжсэн (`EXPO_PUBLIC_FIREBASE_*`). `.env` нь `.gitignore`-д
  нэмэгдсэн — өмнө нь бодит Firebase project credential шууд эх кодонд
  commit хийгдэх эрсдэлтэй байсан.
- ESLint (`eslint.config.js`, `eslint-config-expo`) нэмэгдсэн, `npm run lint`
  script нэмэгдсэн. Анхны шалгалтаар зөвхөн 4 unused-import/var warning
  олдсон бөгөөд засагдсан.
- `nativewind` v2.0.11 → v4-т шинэчлэгдсэн (доор дэлгэрэнгүй).
- `src/App.jsx` (1135 мөр) нь `AuthContext`, `useFamilyData`,
  `useAuthActions` гэсэн context/hook-уудад задарсан (доор дэлгэрэнгүй).

## Nativewind v2 → v4 (2026-08-15)

- `babel.config.js`: `jsxImportSource: "nativewind"` нэмэгдэж,
  `nativewind/babel` preset хэвээр үлдсэн.
- `metro.config.js`: `withNativeWind(config, { input: './global.css' })`-ээр
  wrap хийгдсэн.
- `global.css` шинээр нэмэгдсэн (`@tailwind base/components/utilities`),
  `src/App.jsx`-ийн эхэнд импорт хийгдсэн.
- `tailwind.config.js`: `presets: [require('nativewind/preset')]` нэмэгдсэн.
- Класс нэрсийн синтакс (`className="..."`) өөрчлөгдөөгүй — v4 нь v2-той
  ихэнх тохиолдолд class syntax-ийн хувьд нийцтэй ч, **энэ орчинд бодит
  утсан дээр харагдах байдлыг шалгах боломжгүй тул суулгасны дараа заавал
  Expo Go/dev build дээр нүдээр шалгаж үзнэ үү.**
- **Гаднын шинэ dependency нэмэгдсэн:** nativewind v4.2.6-ийн дотоод
  `react-native-css-interop` package нь Reanimated 4 animation interop-ийн
  тулд `react-native-worklets/plugin`-г Babel preset-дээ hardcode хийсэн
  байдаг тул, тэр package олдохгүй бол Metro bundling бүр амжилтгүй болно.
  Иймд `react-native-reanimated@~4.1.1` болон `react-native-worklets@0.5.1`
  (Expo SDK 54-ийн албан ёсны bundled хувилбарууд, `node_modules/expo`-ийн
  `bundledNativeModules.json`-оос авсан) `package.json`-д шууд dependency
  болгож нэмсэн — эдгээрийг апп өөрөө хэрэглэхгүй ч nativewind v4-ийг
  ажиллуулахад заавал шаардлагатай байна. Энэ нь native surface area-г
  нэмэгдүүлж байгаа тул **Expo Go дээр дахин ачаалах (`npx expo start -c`)
  болон dev client дахин build хийх шаардлагатай** гэдгийг анхаарна уу.
- Metro bundling (`npx expo export --platform android/ios`) энэ өөрчлөлтийн
  дараа 3054 module амжилттай bundle хийгдэж шалгагдсан (өмнө нь 2707
  байсан — зөрүү нь Reanimated/Worklets/css-interop-оос).

## App.jsx-ийн задаргаа (2026-08-15)

Өмнө нь бүх auth, family/task Firestore listener, CRUD action нэг
1135 мөр файлд байсан. Одоо:

- `src/context/AuthContext.jsx` — Firebase auth state, sign in/up/out,
  demo/anonymous login action-ууд (`useAuth()` hook-оор ашиглана).
- `src/hooks/useFamilyData.js` — users/{uid}, families/{familyId} болон
  дэд collection-уудын Firestore listener-үүд, create/join family
  transaction, task CRUD, daily log toggle, streak тооцоолол, rewards/meals/
  notification save — өмнө App.jsx дотор байсан бараг бүх Firestore логик.
- `src/hooks/useOnboarding.js`, `src/hooks/useInviteLinkCode.js`,
  `src/hooks/useTaskTimer.js` — жижиг, бие даасан UI concern тус бүр.
- `src/utils/dates.js`, `src/utils/streak.js`, `src/utils/invite.js`,
  `src/constants/tasks.js`, `src/constants/moods.js` — pure helper/constant
  функцүүд (Firestore, React state-гүй).
- `src/App.jsx` (1135 мөрөөс ~330 мөр болсон) нь одоо голчлон navigation/
  layout render болон UI-only local state (modal, edit mode, timer toast)
  хийдэг, дээрх hook/context-уудыг хэрэглэдэг болсон.

Функциональ логик **зорилготойгоор өөрчлөгдөөгүй** — цөөн тохиолдол
эс тооцвол зөвхөн файлын байршил, импортын зам өөрчлөгдсөн.
Мэдэгдэж буй ганц зориудын зан төлөвийн өөрчлөлт:

- Гишүүд сонгох (`members`) Firestore listener өмнө нь `selectedMemberId`
  өөрчлөгдөх бүрд unsubscribe/resubscribe хийдэг байсан (dependency array-д
  `selectedMemberId` орсон байсан). Одоо энэ listener зөвхөн `familyId`
  өөрчлөгдөхөд л дахин subscribe хийдэг (functional `setState` ашигласан) —
  дата/сонголтын үр дүн ижил хэвээр, зөвхөн шаардлагагүй resubscribe
  арилсан. Энэ бол цорын ганц зориудаар засагдсан зан төлөвийн ялгаа.

Хэдийгээр логик, unit-түвшний шалгалт (доор), Metro bundle бүгд
амжилттай байсан ч, энэ хэмжээний рефактор + dependency өөрчлөлтийг
**бодит device/simulator дээр турших хүртэл бүрэн баталгаатай гэж
үзэхгүй байхыг зөвлөж байна.**

## Шалгалт хийсэн зүйл (2026-08-15)

- `npm install` — cloud орчинд бодит network-тэй бүрэн шинэ суулгалт
  хийгдэж, `package-lock.json` шинэчлэгдсэн.
- `npx eslint .` — 0 error, 0 warning.
- `npx expo export --platform android` — 3054 module амжилттай bundle
  хийгдсэн (баазын хувилбар 2707 module-тэй амжилттай bundle хийгдэж
  байгааг эхлээд баталгаажуулсны дараа харьцуулсан).
- `npx expo export --platform ios` — мөн адил амжилттай.
- `src/utils/dates.js`, `streak.js`, `invite.js`, `constants/tasks.js`-ийн
  pure логикийг Node дээр шууд ажиллуулж (jest биш, зүгээр assertion
  script) хуучин App.jsx доторх мөн адил логиктой ижил үр дүн өгч байгааг
  тоон жишээгээр шалгасан (date rollover, streak тасрах цэг, task
  normalize default утгууд гэх мэт).
- **Юу шалгагдаагүй:** бодит Expo Go/dev client дээр UI, Firebase Auth/
  Firestore-тэй бодит холболт, Google/Apple sign-in, notification
  scheduling, nativewind v4-ийн styling бодит дэлгэц дээр адилхан
  харагдаж байгаа эсэх. Эдгээрийг зөвхөн та бодит утсан дээр шалгаж
  чадна.

---

## Өмнөх түүх (нэгтгэсэн)

### Зассан алдаанууд (`FIXES.md`)

1. **Firebase placeholder config crash** — `src/firebase.js` одоо
   `firebaseConfig.js` дээр `YOUR_...` placeholder эсвэл хоосон утга байвал
   Firebase initialize хийхгүй, app local/offline state-ээр асна.
2. **Mood зөвхөн хүнээр хадгалагдаж байсан** — одоо
   `userMoods[selectedDate][selectedUser] = mood` бүтэцтэй, өдөр бүрийн
   mood түүх тусдаа хадгалагдана.
3. **Streak тооцоолол байхгүй байсан** — өдөр бүрийн бүх task `done: true`
   эсэхийг шалгаж streak тооцдог helper нэмэгдсэн.
4. **`dailyLogs` nested state шууд mutation хийж байсан** — immutable
   байдлаар бүх түвшинд copy хийж update хийдэг болсон.
5. **Task card дээр TextInput/options/timer дарахад санамсаргүй check
   болох эрсдэл** — зөвхөн зүүн талын check дугуй дээр дарахад done/un-done
   болно.

### Production fixes (`PRODUCTION_FIXES.md`)

Data model нэг том `families/{familyId}` document-с дараах бүтэц рүү
шилжсэн:

```text
users/{uid}
inviteCodes/{code}
families/{familyId}
  members/{uid}
  tasks/{uid}
  dailyLogs/{dateKey_uid}
  meals/current
  rewards/{rewardId}
  settings/notifications
```

Member data `uid`-ээр keyed, create/join family transaction ашигладаг,
task points тохируулах боломжтой, role-based UI (parent-only editing),
`FIRESTORE_RULES.txt` шинэ бүтэцэд тохируулагдсан.

### Multi-tenant isolation fix (`MULTI_TENANT_FIX.md`)

Өмнөх хувилбар `artifacts/{appId}/public/data/family_app/main_state` гэсэн
ганц shared document ашигладаг байсан тул өөр өөр гэр бүлийн дата
тусгаарлагдахгүй байсан алдааг засаж, `users/{uid}` +
`families/{familyId}` бүтэц рүү шилжүүлсэн.

### Flow logic fix (`FLOW_LOGIC_FIX.md`)

App-ийн эхлэх дараалал: Splash → Onboarding (AsyncStorage
`familyHabitOnboardingDone`) → Auth → Family setup (хэрэв
`users/{uid}.familyId` байхгүй бол) → Main app. Settings дотор
"Onboarding дахин харах" товч нэмэгдсэн.

### Нэмэгдсэн features (`FLOW_FEATURES.md`)

Onboarding, Auth, Family setup, Dashboard, Settings, notification
reminder service screen/файлууд анх удаа нэмэгдсэн.

### UI засварууд (`UI_CHANGES.md`)

Home progress hero card, task card clean-up, mood selector compact
болгох, floating tab bar, bottom-sheet add task modal, Rewards/Meals/Stats
дэлгэцүүдийг шинэчлэх.

### UX шинэчлэл (`UX_UPGRADE_NOTES.md`)

Lottie onboarding, Google/Apple/email/demo login, invite link deep link,
haptic feedback, confetti, `react-native-chart-kit` статистик графикууд.

### Validation (`VALIDATION.md`, анхны хувилбар)

Анхны хувилбарт зөвхөн статик шалгалт хийгдсэн байсан (`npm install`,
`npx expo install --check`, Babel transform, Metro export, `expo config`).
Бодит утсан/simulator дээр ажиллуулж шалгаагүй гэдгийг тэмдэглэсэн байсан.
Энэ удаагийн засварт (дээрх "Unreleased" хэсэг) мөн адил зөвхөн статик
Metro export/babel шалгалт хийгдсэн — **бодит device дээрх шалгалт хэрэгтэй
хэвээр байна.**
