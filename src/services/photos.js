import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isStorageConfigured } from '../firebase';

// Зургийн ДЭЭД хэмжээ. Утасны эх зураг ихэвчлэн 3-8МБ байдаг — түүнийг
// шууд upload хийвэл Firebase Storage-ийн үнэгүй багц (Spark, 5ГБ) хэдхэн
// зуун зурагт дүүрч, татаж унших нь бас удаан болно. Аватарыг 320px,
// нүүрний зургийг 1080px болгож жижигрүүлээд JPEG 70% чанараар хадгална
// (аватар ≈ 20-40КБ, cover ≈ 150-250КБ).
const PRESETS = {
  avatar: { size: 320, quality: 0.7 },
  cover: { size: 1080, quality: 0.7 },
};

// Гэрээ: бүх функц { ok: true, ... } эсвэл { ok: false, code, message }
// буцаана — дуудагч тал try/catch бичихгүйгээр алдааг toast дээр гаргана.
const fail = (code, message) => ({ ok: false, code, message });

// Зургийн санд хандах зөвшөөрөл. Хэрэглэгч татгалзвал ДАХИН асуухгүй —
// expo өөрөө systemwide dialog-оо дахин гаргахгүй тул тохиргоо руу заана.
export async function ensureLibraryPermission() {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return { ok: true };
  if (!current.canAskAgain) {
    return fail('PERMISSION_BLOCKED', 'Зургийн санд хандах эрх хаалттай байна. Утасныхаа Тохиргоо → Дадал хэсгээс зөвшөөрнө үү.');
  }
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!asked.granted) return fail('PERMISSION_DENIED', 'Зураг сонгохын тулд зургийн сангийн зөвшөөрөл хэрэгтэй.');
  return { ok: true };
}

// Сонгох → тайрах → жижигрүүлэх. Upload хийхгүй, зөвхөн локал URI буцаана.
export async function pickAndResizeImage(preset = 'avatar') {
  const { size, quality } = PRESETS[preset] || PRESETS.avatar;

  const permission = await ensureLibraryPermission();
  if (!permission.ok) return permission;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    // Аватар дөрвөлжин, нүүрний зураг өргөн — тайрах хүрээг урьдчилж өгнө.
    aspect: preset === 'cover' ? [16, 9] : [1, 1],
    quality: 1, // эх чанараар нь аваад, ДАРАА нь manipulate дээр шахна
  });
  if (result.canceled) return fail('CANCELED', '');

  const asset = result.assets?.[0];
  if (!asset?.uri) return fail('NO_ASSET', 'Зураг уншиж чадсангүй. Өөр зураг сонгоно уу.');

  try {
    // Зөвхөн ӨРГӨНӨӨР нь заана — өндөр нь харьцаагаа хадгална.
    const resized = await manipulateAsync(asset.uri, [{ resize: { width: size } }], {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    return { ok: true, uri: resized.uri, width: resized.width, height: resized.height };
  } catch (e) {
    console.error('Image resize error:', e?.message);
    return fail('RESIZE_FAILED', 'Зургийг боловсруулж чадсангүй. Өөр зураг сонгоод үзнэ үү.');
  }
}

// Локал URI-г Firebase Storage руу байршуулж, татах холбоосыг буцаана.
async function uploadLocalUri(localUri, storagePath) {
  if (!isStorageConfigured || !storage) {
    return fail('STORAGE_OFF', 'Firebase Storage тохируулагдаагүй байна. Console → Storage хэсгээс идэвхжүүлнэ үү.');
  }
  try {
    // RN дээр Blob авах стандарт зам. Жижигрүүлсэн зураг тул хэмжээ бага,
    // санах ойн асуудал гарахгүй.
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(fileRef);
    return { ok: true, url };
  } catch (e) {
    console.error('Photo upload error:', e?.code, e?.message);
    if (e?.code === 'storage/unauthorized') {
      return fail('UNAUTHORIZED', 'Зураг байршуулах эрх байхгүй байна. Storage дүрмээ шалгана уу.');
    }
    return fail('UPLOAD_FAILED', 'Зураг байршуулж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.');
  }
}

// Гишүүний аватар. Зам нь гишүүн бүрт ТОГТМОЛ — шинэ зураг тавихад
// хуучин нь дарагдана, тиймээс хэрэглээгүй файл хуримтлагдахгүй.
export async function pickAndUploadMemberPhoto({ familyId, uid }) {
  if (!familyId || !uid) return fail('NO_TARGET', 'Гэр бүл эсвэл хэрэглэгч тодорхойгүй байна.');
  const picked = await pickAndResizeImage('avatar');
  if (!picked.ok) return picked;
  return uploadLocalUri(picked.uri, `families/${familyId}/members/${uid}/avatar.jpg`);
}

// Гэр бүлийн нүүрний (cover) зураг — дэлгэцийн дээд талд харагдана.
export async function pickAndUploadFamilyCover({ familyId }) {
  if (!familyId) return fail('NO_TARGET', 'Гэр бүл тодорхойгүй байна.');
  const picked = await pickAndResizeImage('cover');
  if (!picked.ok) return picked;
  return uploadLocalUri(picked.uri, `families/${familyId}/cover.jpg`);
}
