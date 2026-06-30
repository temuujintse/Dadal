# Гэр Бүлийн Дадал

## Суулгах
```bash
npm install
```

## Firebase тохиргоо (ЗААВАЛ)
Энэ апп Firestore ашиглан өгөгдлөө хадгалдаг тул эхлээд Firebase төсөл үүсгэх шаардлагатай:

1. https://console.firebase.google.com → "Add project" дарж шинэ төсөл үүсгэ
2. Зүүн талын цэснээс **Build > Firestore Database** → "Create database" → test mode-оор эхлүүл
3. Зүүн талын цэснээс **Build > Authentication** → Sign-in method → **Anonymous**-г идэвхжүүл
4. Project Settings (Тоормостой дүрс) → "Your apps" → Web app (</>) нэмж, гарсан `firebaseConfig` объектыг хуул
5. `src/firebaseConfig.js` файлд тэр утгуудыг тавьж бич (`apiKey`, `authDomain`, гэх мэт)

## Ажиллуулах
```bash
npm run dev
```
Дараа нь терминал дээр гарсан `http://localhost:5173` хаягаар нээнэ.

## Build (production)
```bash
npm run build
npm run preview
```

## Анхаарах зүйлс
- Бүх гэр бүлийн өгөгдөл нэг л Firestore document-д (`artifacts/family-habit-app/public/data/family_app/main_state`) хадгалагддаг тул document 1MB-аас хэтэрвэл алдаа гарна. Удаан хугацаагаар (жилээр) ашиглах бол `dailyLogs`-г тусдаа collection руу (өдөр тутамд нэг document) шилжүүлэх хэрэгтэй болно.
- `streak` (дараалсан өдрийн тоо) одоогоор хаана ч автоматаар тооцоологддоггүй, зөвхөн 0-ээс эхэлдэг утга. Энэ logic-ийг дараа нэмж бичих шаардлагатай.
- Anonymous auth ашигладаг тул Firestore document-д хандах эрх "нээлттэй" — гэр бүлийн дотоод хэрэглээнд зориулагдсан гэдгийг анхаарна уу.
# Dadal
