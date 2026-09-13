// Бүлгийн 4 төрөл — "Гэр бүл" гэдэг апп нь ганц зориулалттай биш болов.
//
// АНХААР: Firestore-ийн collection нэр `families` ХЭВЭЭР үлдэнэ. Нэр солих
// нь өгөгдөл нүүлгэх, дүрэм дахин бичих их ажил боловч ашиг тус нь
// хэрэглэгчид ер харагдахгүй — тиймээс зөвхөн `groupType` талбараар ялгав.
// Хуучин баримтад `groupType` талбар байхгүй тул normalizeGroupType()
// ямагт 'family' гэж үзнэ (доор), ингэснээр migration хэрэггүй.
export const GROUP_TYPES = {
  family: {
    id: 'family',
    emoji: '👨‍👩‍👧‍👦',
    label: 'Гэр бүлийн дадал',
    shortLabel: 'Гэр бүл',
    memberLabel: 'гишүүд',
    memberLabelSingular: 'гишүүн',
    description: 'Эцэг эх, хүүхдүүд хамтдаа дадлаа хянана',
    maxMembers: 12,
    // 'admin' анги эрх нь адилхан ч, гэр бүлийн контекстэд 'parent' нэрийг
    // харуулна (SettingsScreen, invite урилга гэх мэт газарт хэрэглэгдэнэ).
    roles: { admin: 'parent', member: 'child' },
    showRewards: true,
    showMembersRow: true,
    // Урих код харуулах эсэх (хувь хүн дээр утгагүй).
    showInvite: true,
    // Эзэмшлийн хэлбэр — "… тойм", "… меню", "… 7 хоногийн тайлан" гэх
    // мэт олон дэлгэц дээр угтвар болж ордог.
    possessive: 'Гэр бүлийн',
    // Ерөнхий нэр — "…д нэгдэх", "… үүсгэх" товчнуудад.
    noun: 'гэр бүл',
    createLabel: 'Гэр бүл үүсгэх',
  },
  friends: {
    id: 'friends',
    emoji: '🧑‍🤝‍🧑',
    label: 'Найзуудын дадал',
    shortLabel: 'Найзууд',
    memberLabel: 'найзууд',
    memberLabelSingular: 'найз',
    description: 'Найзуудтайгаа хамт зорилгодоо хүрнэ',
    maxMembers: 20,
    roles: { admin: 'admin', member: 'member' },
    showRewards: true,
    showMembersRow: true,
    showInvite: true,
    possessive: 'Найзуудын',
    noun: 'бүлэг',
    createLabel: 'Бүлэг үүсгэх',
  },
  personal: {
    id: 'personal',
    emoji: '🧘',
    label: 'Хувь хүний дадал',
    shortLabel: 'Хувь хүн',
    memberLabel: 'та',
    memberLabelSingular: 'та',
    description: 'Зөвхөн өөрийн дадлаа хянана',
    maxMembers: 1,
    roles: { admin: 'admin', member: 'member' },
    // PLAN_V2.md §3.5 (б): Шагналын табыг ҮЛДЭЭНЭ, гэхдээ текстийг нь
    // "гэр бүлийн урамшуулал" биш "өөртөө амласан шагнал" гэсэн утгаар
    // харуулна (RewardsScreen дээр title/rewardsHeading-аар дамжина).
    showRewards: true,
    // Ганц хүнтэй тул гишүүдийн эгнээ (avatar strip) харуулах шаардлагагүй.
    showMembersRow: false,
    // Ганцаараа хөтлөх тул урих код ОГТ харуулахгүй — өмнө нь хувь хүний
    // горимд ч "урих код" карт харагддаг байсан нь ойлгомжгүй байв.
    showInvite: false,
    possessive: 'Миний',
    noun: 'дадлын хөтөлбөр',
    createLabel: 'Эхлүүлэх',
  },
  couple: {
    id: 'couple',
    emoji: '💑',
    label: 'Хосуудын дадал',
    shortLabel: 'Хосууд',
    memberLabel: 'хос',
    memberLabelSingular: 'хань',
    description: 'Хоёулаа хамт сайн дадал төлөвшүүлнэ',
    maxMembers: 2,
    roles: { admin: 'admin', member: 'member' },
    showRewards: true,
    showMembersRow: true,
    showInvite: true,
    possessive: 'Хосуудын',
    noun: 'хос',
    createLabel: 'Бүлэг үүсгэх',
  },
};

export const GROUP_TYPE_LIST = Object.values(GROUP_TYPES);

// Хуучин (groupType талбаргүй) болон буруу/танигдаагүй утгыг АЮУЛГҮЙ
// 'family' рүү буулгана — canManage, дадлын багц гэх мэт бусад бүх логик
// үргэлж энэ функцээр дамжсан утга дээр л ажиллах ёстой.
export const normalizeGroupType = (groupType) => (
  GROUP_TYPES[groupType] ? groupType : 'family'
);

export const getGroupTypeMeta = (groupType) => GROUP_TYPES[normalizeGroupType(groupType)];

// Тухайн groupType-д "админ" эрхтэй эсэхийг шалгах ерөнхий функц.
// Дотоод role утга ('admin'/'parent') хоёулаа зөвшөөрнө — Firestore-д
// хадгалагдсан хуучин 'parent' string-үүд шинэ логиктой мөргөлдөхгүй.
export const isAdminRole = (role) => role === 'admin' || role === 'parent';
