// Түр хаасан / шатлан нээх функцүүдийн нэгдсэн флаг.
//
// PHOTO_UPLOAD_ENABLED: зураг оруулах функц бүрэн кодлогдсон
// (`services/photos.js`, `storage.rules`) боловч Firebase Storage нь Blaze
// (төлбөртэй) төлөвлөгөө шаарддаг тул одоохондоо идэвхжүүлээгүй. Флаг false
// байх үед UI дээрх "Зураг" товчнууд ОГТ ХАРАГДАХГҮЙ — эс бөгөөс хэрэглэгч
// дарж, ойлгомжгүй Firebase алдаа хүлээж авна.
//
// Storage идэвхжүүлсний дараа хийх зүйл:
//   1. Firebase Console → Storage → Get started
//   2. firebase deploy --only storage
//   3. ЭНД true болгоно — өөр ямар ч код өөрчлөх шаардлагагүй.
//
// АНХААР: аль хэдийн байршуулсан зураг (member.photoURL / coverPhotoURL) нь
// флагнаас үл хамааран ХАРАГДАНА — зөвхөн ШИНЭЭР оруулах товч нуугдана.
export const PHOTO_UPLOAD_ENABLED = false;
