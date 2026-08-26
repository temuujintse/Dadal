// ─────────────────────────────────────────────────────────────────────────────
// NativeWind v4 — className дэмждэг компонентуудын бүртгэл
// ─────────────────────────────────────────────────────────────────────────────
// NativeWind v4 нь className-ийг ЗӨВХӨН урьдчилан бүртгэгдсэн (cssInterop хийгдсэн)
// компонентууд дээр style болгон хөрвүүлдэг. Бүртгэлийг
// node_modules/react-native-css-interop/dist/runtime/components.js хийдэг бөгөөд
// тэнд дараах компонентууд байдаг:
//
//   Image, Pressable, Switch, Text, TouchableHighlight, TouchableOpacity,
//   TouchableWithoutFeedback, View, ActivityIndicator, StatusBar, ScrollView,
//   TextInput, FlatList, ImageBackground, KeyboardAvoidingView, VirtualizedList
//
// Тэр жагсаалтад react-native-ийн SafeAreaView БАЙХГҮЙ. (Тэнд зөвхөн
// `react-native-safe-area-context`-ийн SafeAreaView-г try/catch дотор бүртгэдэг ба
// энэ төсөлд тэр пакет суугаагүй тул чимээгүй алгасагддаг.) Animated.View ч мөн үгүй.
//
// Бүртгэгдээгүй компонент className-ээ энгийн string болгон авч, ЯМАР Ч style
// авдаггүй. Үүнээс болж:
//   <SafeAreaView className="flex-1">  →  flex огт үйлчлэхгүй → өндөр нь auto
//   → дотор нь буй <ScrollView className="flex-1"> (flexBasis: 0%) → өндөр 0
//   → бүх дэлгэц хоосон, зөвхөн absolute байрлалтай доод таб бар л харагдана
//     (тэр нь 0 өндөртэй контейнерийн доод ирмэгээс тоологдох тул дэлгэцийн
//      дээд хэсэгт очиж харагддаг).
//
// Доорх бүртгэл нь энэ бүхнийг засна.
// ЭНЭ ФАЙЛЫГ src/App.jsx-д global.css-ийн ДАРАА, бусад бүх зүйлээс ӨМНӨ import хийнэ.
import { Animated, SafeAreaView } from 'react-native';
import { cssInterop } from 'nativewind';

cssInterop(SafeAreaView, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Animated.Image, { className: 'style' });
cssInterop(Animated.ScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
