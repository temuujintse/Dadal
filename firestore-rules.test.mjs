// Firestore аюулгүй байдлын дүрмийн тест.
//
// Ажиллуулах (Mac дээрээ, төслийн үндэс хавтсанд):
//   npm i -D @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore "node firestore-rules.test.mjs"
//
// RULES_FILE хувьсагчаар өөр дүрмийн файл туршиж болно (default: FIRESTORE_RULES.txt).
//
// Хүлээгдэх үр дүн: БҮХ тест ДАВНА (22/22).
//
// Түүх: 2026-08-25-ийн өмнө `FIRESTORE_RULES.txt` хоёр нүхтэй байсан ба тухайн
// хувилбар дээр А1 (inviteCodes-ыг жагсаах) болон А3/А5/А6 (урилгагүй гишүүнчлэл)
// халдлагын тестүүд УНАНА байсан — энэ нь нүх байгааг батлах зорилготой байв.
// Одоогийн FIRESTORE_RULES.txt эдгээрийг хаасан (файл дотор "ЗАСВАР 1 / 2" гэж
// тайлбарласан). Эх хувилбарыг backup-оос олж болно.


import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const RULES_FILE = process.env.RULES_FILE || 'FIRESTORE_RULES.txt';
const PORT = Number(process.env.FIRESTORE_EMULATOR_PORT || 8080);

const env = await initializeTestEnvironment({
  projectId: 'famhabit-rules-test',
  firestore: { host: '127.0.0.1', port: PORT, rules: fs.readFileSync(RULES_FILE, 'utf8') },
});

let pass = 0;
let fail = 0;
const results = [];

const check = async (name, expect, fn) => {
  let actual;
  try { await fn(); actual = 'allow'; }
  catch { actual = 'deny'; }
  const ok = actual === expect;
  if (ok) pass += 1;
  else fail += 1;
  results.push({ ok, name, expect, actual });
  console.log(`${ok ? '  ✓ ' : '  ✗ '} ${name}`);
  if (!ok) console.log(`      хүлээсэн: ${expect}, гарсан: ${actual}`);
};

const seed = async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families/FAM_VICTIM'), {
      familyId: 'FAM_VICTIM', familyName: 'Хохирогч гэр бүл', ownerUid: 'parent_uid', inviteCode: 'ABC-123',
    });
    await setDoc(doc(db, 'families/FAM_VICTIM/members/parent_uid'), { uid: 'parent_uid', name: 'Аав', role: 'parent', points: 50, streak: 3 });
    await setDoc(doc(db, 'families/FAM_VICTIM/members/child_uid'), { uid: 'child_uid', name: 'Хүүхэд', role: 'member', points: 20, streak: 1 });
    await setDoc(doc(db, 'families/FAM_VICTIM/dailyLogs/L1'), { dateKey: '2026-08-24', uid: 'child_uid', tasks: { t1: { done: true } }, mood: 'sad' });
    await setDoc(doc(db, 'families/FAM_VICTIM/rewards/reward_1'), { name: 'Кино', target: 300, status: 'locked', order: 0 });
    await setDoc(doc(db, 'inviteCodes/ABC-123'), { code: 'ABC-123', familyId: 'FAM_VICTIM', familyName: 'Хохирогч гэр бүл', ownerUid: 'parent_uid', active: true });
    await setDoc(doc(db, 'users/parent_uid'), { uid: 'parent_uid', familyId: 'FAM_VICTIM' });
  });
};

console.log(`\nДүрмийн файл: ${RULES_FILE}\n`);

// ══════════════════════════════════════════════════════════════════════
console.log('━━━ А. ХАЛДАГЧ — урилга аваагүй, зөвхөн нэвтэрсэн ━━━');
await seed();
{
  const atk = env.authenticatedContext('attacker_uid').firestore();

  await check('А1. inviteCodes цуглуулгыг бүтнээр нь жагсаах', 'deny',
    () => getDocs(collection(atk, 'inviteCodes')));

  await check('А2. Урилгын кодыг мэдэхгүйгээр гэр бүлийн документ унших', 'deny',
    () => getDoc(doc(atk, 'families/FAM_VICTIM')));

  await check('А3. Урилгагүйгээр өөрийгөө гишүүн болгож бичих', 'deny',
    () => setDoc(doc(atk, 'families/FAM_VICTIM/members/attacker_uid'),
      { uid: 'attacker_uid', name: 'Халдагч', role: 'member', points: 0, streak: 0 }));

  await check('А4. Урилгагүйгээр өөрийгөө PARENT (админ) болгож бичих', 'deny',
    () => setDoc(doc(atk, 'families/FAM_VICTIM/members/attacker_uid'),
      { uid: 'attacker_uid', name: 'Халдагч', role: 'parent', points: 0, streak: 0 }));

  await check('А5. Хуурамч урилгын код заасан гишүүн бичих', 'deny',
    () => setDoc(doc(atk, 'families/FAM_VICTIM/members/attacker_uid'),
      { uid: 'attacker_uid', name: 'Халдагч', role: 'member', joinedWithInviteCode: 'XXX-999' }));

  await check('А6. Өөр гэр бүлийн кодыг заасан гишүүн бичих', 'deny',
    () => setDoc(doc(atk, 'families/FAM_OTHER/members/attacker_uid'),
      { uid: 'attacker_uid', name: 'Халдагч', role: 'member', joinedWithInviteCode: 'ABC-123' }));
}

// ── А3/А4 амжилттай болсон тохиолдолд юу нээгдэхийг харуулна ──
console.log('\n━━━ Б. Хэрэв халдагч гишүүн болж чадвал юу нээгдэх вэ ━━━');
await seed();
{
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'families/FAM_VICTIM/members/attacker_uid'),
      { uid: 'attacker_uid', name: 'Халдагч', role: 'parent', points: 0, streak: 0 });
  });
  const atk = env.authenticatedContext('attacker_uid').firestore();

  await check('Б1. Хүүхдийн өдөр тутмын лог (mood орсон) унших', 'allow',
    () => getDocs(collection(atk, 'families/FAM_VICTIM/dailyLogs')));
  await check('Б2. Гэр бүлийн жинхэнэ гишүүнийг устгах', 'allow',
    () => deleteDoc(doc(atk, 'families/FAM_VICTIM/members/child_uid')));
  console.log('      ↑ Энэ хоёр ЗӨВШӨӨРӨГДӨХ нь хэвийн — халдагч аль хэдийн admin болсон.');
  console.log('        Гол хамгаалалт нь А3/А4 дээр байх ёстой: тэнд орох ёсгүй.');
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n━━━ В. ХУУЛЬ ЁСНЫ УРСГАЛ — эвдэрсэн эсэхийг шалгана ━━━');
await seed();
{
  const owner = env.authenticatedContext('new_owner').firestore();
  await check('В1. Шинэ гэр бүл үүсгэх (family документ)', 'allow',
    () => setDoc(doc(owner, 'families/FAM_NEW'), { familyId: 'FAM_NEW', familyName: 'Шинэ', ownerUid: 'new_owner' }));
  await check('В2. Эзэн өөрийгөө parent болгож бичих', 'allow',
    () => setDoc(doc(owner, 'families/FAM_NEW/members/new_owner'), { uid: 'new_owner', name: 'Эзэн', role: 'parent', points: 0, streak: 0 }));
  await check('В3. Эзэн өөрийн дадлын жагсаалт үүсгэх', 'allow',
    () => setDoc(doc(owner, 'families/FAM_NEW/tasks/new_owner'), { uid: 'new_owner', tasks: [] }));
}
await seed();
{
  const joiner = env.authenticatedContext('joiner_uid').firestore();
  await check('В4. Урилгын кодоор гэр бүлийн код унших (нэг документ)', 'allow',
    () => getDoc(doc(joiner, 'inviteCodes/ABC-123')));
  await check('В5. Хүчинтэй кодоор гишүүн болж нэгдэх', 'allow',
    () => setDoc(doc(joiner, 'families/FAM_VICTIM/members/joiner_uid'),
      { uid: 'joiner_uid', name: 'Шинэ гишүүн', role: 'member', points: 0, streak: 0, joinedWithInviteCode: 'ABC-123' }));
}
await seed();
{
  const parent = env.authenticatedContext('parent_uid').firestore();
  await check('В6. Эцэг эх хүүхдийн профайл нэмэх', 'allow',
    () => setDoc(doc(parent, 'families/FAM_VICTIM/members/profile_kid_1'), { uid: 'profile_kid_1', name: 'Бага хүү', role: 'member', points: 0, streak: 0 }));
  await check('В7. Эцэг эх хүүхдийн өдрийн лог бичих', 'allow',
    () => setDoc(doc(parent, 'families/FAM_VICTIM/dailyLogs/L2'), { dateKey: '2026-08-24', uid: 'child_uid', tasks: { t1: { done: true } } }));
  await check('В8. Эцэг эх шагнал засах', 'allow',
    () => setDoc(doc(parent, 'families/FAM_VICTIM/rewards/reward_1'), { name: 'Пицца', target: 200, status: 'locked', order: 0 }));
}
await seed();
{
  const kid = env.authenticatedContext('child_uid').firestore();
  await check('В9. Хүүхэд өөрийн өдрийн лог бичих', 'allow',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/dailyLogs/L3'), { dateKey: '2026-08-24', uid: 'child_uid', tasks: { t1: { done: true } } }));
  await check('В10. Хүүхэд өөрийн оноо/streak шинэчлэх', 'allow',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/members/child_uid'), { uid: 'child_uid', name: 'Хүүхэд', role: 'member', points: 40, streak: 2 }, { merge: true }));
  await check('В11. Хүүхэд мэдэгдлийн тохиргоо хадгалах', 'allow',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/settings/notifications'), { enabled: true, hour: 20, minute: 30 }));

  await check('В12. Хүүхэд АААВЫН өдрийн лог бичих (аппад чимээгүй унадаг)', 'deny',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/dailyLogs/L_DAD'), { dateKey: '2026-08-24', uid: 'parent_uid', tasks: { t1: { done: true } } }));
  await check('В13. Хүүхэд өөрийгөө parent болгох (role солих)', 'deny',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/members/child_uid'), { uid: 'child_uid', name: 'Хүүхэд', role: 'parent', points: 20, streak: 1 }));
  await check('В14. Хүүхэд шагнал засах', 'deny',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/rewards/reward_1'), { name: 'Хакердсан', target: 1, status: 'locked', order: 0 }));
}

// ══════════════════════════════════════════════════════════════════════
console.log('━━━ Г. ЗУРАГ (photoData) БА АДМИН ШИЛЖҮҮЛЭХ ━━━');
await seed();
{
  const kid = env.authenticatedContext('child_uid').firestore();
  const parent = env.authenticatedContext('parent_uid').firestore();
  const smallPhoto = `data:image/jpeg;base64,${'A'.repeat(9000)}`;
  const hugePhoto = `data:image/jpeg;base64,${'A'.repeat(30000)}`;
  await check('Г1. Гишүүн өөрийн жижиг зургаа (photoData) хадгалах', 'allow',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/members/child_uid'), { photoData: smallPhoto }, { merge: true }));
  await check('Г2. Хэт том photoData (>20000)', 'deny',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/members/child_uid'), { photoData: hugePhoto }, { merge: true }));
  await check('Г3. Гишүүн бусдын зургийг солих', 'deny',
    () => setDoc(doc(kid, 'families/FAM_VICTIM/members/parent_uid'), { photoData: smallPhoto }, { merge: true }));
  await check('Г4. Админ өөр гишүүнийг админ болгох', 'allow',
    () => setDoc(doc(parent, 'families/FAM_VICTIM/members/child_uid'), { role: 'parent' }, { merge: true }));
  await check('Г5. Админ өөрийгөө энгийн гишүүн болгох (шилжүүлэлт)', 'allow',
    () => setDoc(doc(parent, 'families/FAM_VICTIM/members/parent_uid'), { role: 'member' }, { merge: true }));
}

// ══════════════════════════════════════════════════════════════════════
console.log(`\n${pass} давсан, ${fail} унасан\n`);
if (fail) {
  console.log('Унасан тестүүд:');
  results.filter((r) => !r.ok).forEach((r) => console.log(`  · ${r.name}  (хүлээсэн ${r.expect}, гарсан ${r.actual})`));
}
await env.cleanup();
process.exit(fail ? 1 : 0);
