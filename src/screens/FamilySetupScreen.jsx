import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Home, Users, KeyRound, LogOut, Plus, X, Sparkles, ChevronLeft } from 'lucide-react-native';
import { GROUP_TYPE_LIST, getGroupTypeMeta } from '../constants/groupTypes';

export const AVATARS = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐻', '🦊', '🐼', '🐰', '🦁'];

const DEFAULT_FAMILY_NAME = 'Манай гэр бүл';
// Төрөл сонгоход "Манай гэр бүл" гэсэн анхны утга хэвээр харагдвал зохимжгүй
// тул сонголт бүрт тохирсон анхны утга — гэхдээ ЗӨВХӨН хэрэглэгч өөрөө
// нэрийг нь ХАРААХАН өөрчлөөгүй байгаа тохиолдолд л дарж бичнэ.
const DEFAULT_NAME_BY_TYPE = {
  family: 'Манай гэр бүл',
  friends: 'Манай найзууд',
  personal: 'Миний дадал',
  couple: 'Бидний хос',
};

function AvatarPicker({ value, onChange, compact = false }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingVertical: 4 }}>
      {AVATARS.map((avatar) => {
        const selected = value === avatar;
        return (
          <TouchableOpacity
            key={avatar}
            onPress={() => onChange(avatar)}
            className="items-center justify-center border"
            style={{
              width: compact ? 44 : 52,
              height: compact ? 44 : 52,
              borderRadius: compact ? 16 : 19,
              backgroundColor: selected ? '#ffedd5' : '#fff',
              borderColor: selected ? '#f97316' : '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: compact ? 23 : 28 }}>{avatar}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Гэр бүл ҮҮСГЭХ (join биш) урсгалын НЭГДҮГЭЭР алхам — 4 бүлгийн картаас
// сонгоно. Нэгдэх (join) горимд groupType нь НЭГДЭЖ буй гэр бүлээс
// АВТОМАТААР ирдэг тул энэ алхам зөвхөн 'create' горимд харагдана.
function GroupTypeStep({ value, onSelect }) {
  return (
    <View className="gap-3">
      <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">1-р алхам</Text>
      <Text className="text-2xl font-black text-gray-950 mb-1">Ямар бүлэг үүсгэх вэ?</Text>
      <View className="gap-3 mt-2">
        {GROUP_TYPE_LIST.map((type) => {
          const selected = value === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              onPress={() => onSelect(type.id)}
              accessibilityRole="button"
              accessibilityLabel={type.label}
              accessibilityState={{ selected }}
              className="flex-row items-center gap-4 p-4 rounded-[28px] border"
              style={{ backgroundColor: selected ? '#fff7ed' : '#fff', borderColor: selected ? '#f97316' : '#e5e7eb' }}
            >
              <Text style={{ fontSize: 32 }}>{type.emoji}</Text>
              <View className="flex-1">
                <Text className="text-base font-black text-gray-950">{type.label}</Text>
                <Text className="text-xs font-semibold text-gray-500 mt-0.5">{type.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function FamilySetupScreen({ initialInviteCode = '', onCreateFamily, onJoinFamily, loading = false, error = null, onLogout }) {
  const [mode, setMode] = useState(initialInviteCode ? 'join' : 'create');
  const [groupType, setGroupType] = useState(null);
  const [familyName, setFamilyName] = useState(DEFAULT_FAMILY_NAME);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('👨');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [extraName, setExtraName] = useState('');
  const [extraAvatar, setExtraAvatar] = useState('👧');
  const [extraMembers, setExtraMembers] = useState([]);

  useEffect(() => {
    if (!initialInviteCode) return;
    setInviteCode(initialInviteCode);
    setMode('join');
  }, [initialInviteCode]);

  const groupMeta = getGroupTypeMeta(groupType);
  // Хувь хүний (personal) төрөлд гишүүн нэмэх огт шаардлагагүй (maxMembers=1);
  // хосуудад (couple) өөрөөс гадна ердөө 1 хүн нэмэгддэг тул нэмэх хэсгийг
  // тухайн үед нуух/хязгаарлана.
  const canAddMoreMembers = !groupMeta || groupMeta.maxMembers - 1 > extraMembers.length;
  const showMemberAdder = groupMeta?.maxMembers !== 1;

  const canSubmit = () => {
    if (loading || !displayName.trim()) return false;
    if (mode === 'create') return Boolean(familyName.trim()) && Boolean(groupType);
    return Boolean(inviteCode.trim());
  };

  const addQuickMember = () => {
    if (!extraName.trim() || !canAddMoreMembers) return;
    setExtraMembers((prev) => [...prev, { name: extraName.trim(), avatar: extraAvatar }]);
    setExtraName('');
    setExtraAvatar(AVATARS[(extraMembers.length + 3) % AVATARS.length]);
  };

  const submit = () => {
    if (!canSubmit()) return;
    if (mode === 'create') onCreateFamily?.({ familyName: familyName.trim(), displayName: displayName.trim(), avatar, extraMembers, groupType });
    else onJoinFamily?.({ inviteCode: inviteCode.trim().toUpperCase(), displayName: displayName.trim(), avatar });
  };

  // 'create' горимд групп СОНГОГДООГҮЙ бол зөвхөн 4 картыг харуулаад
  // үлдэх бүх формыг нуух — хэрэглэгч нэрээ бичихээсээ ӨМНӨ ямар бүлэг
  // үүсгэж байгаагаа шийднэ.
  if (mode === 'create' && !groupType) {
    return (
      <SafeAreaView className="flex-1 bg-[#fffaf5]">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-between items-center mb-7">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">Тохиргоо</Text>
              <Text className="text-2xl font-black text-gray-950">Эхлүүлье</Text>
            </View>
            {onLogout ? <TouchableOpacity onPress={onLogout} className="w-11 h-11 rounded-2xl bg-white border border-orange-100 items-center justify-center"><LogOut size={18} color="#94a3b8" /></TouchableOpacity> : null}
          </View>

          <TouchableOpacity onPress={() => setMode('join')} className="flex-row items-center justify-center gap-2 py-3 mb-5 rounded-2xl bg-white border border-gray-200">
            <Users size={16} color="#64748b" />
            <Text className="font-black text-gray-500 text-sm">Оронд нь урилгын кодоор нэгдэх</Text>
          </TouchableOpacity>

          <GroupTypeStep
            value={groupType}
            onSelect={(nextType) => {
              // Хэрэглэгч нэрийг АЛЬ ХЭДИЙН өөрчилсэн бол хөндөхгүй.
              if (Object.values(DEFAULT_NAME_BY_TYPE).includes(familyName)) {
                setFamilyName(DEFAULT_NAME_BY_TYPE[nextType] || DEFAULT_FAMILY_NAME);
              }
              setGroupType(nextType);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf5]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row justify-between items-center mb-7">
          <View className="flex-row items-center flex-1 pr-3">
            {mode === 'create' ? (
              <TouchableOpacity
                onPress={() => setGroupType(null)}
                accessibilityRole="button"
                accessibilityLabel="Бүлгийн төрөл дахин сонгох"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 items-center justify-center mr-2"
              >
                <ChevronLeft size={18} color="#64748b" />
              </TouchableOpacity>
            ) : null}
            <View className="flex-1">
              <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">{mode === 'create' ? `2-р алхам · ${groupMeta.shortLabel}` : 'Сүүлийн алхам'}</Text>
              <Text className="text-2xl font-black text-gray-950">{mode === 'create' ? groupMeta.label : 'Бүлэгт нэгдэх'}</Text>
            </View>
          </View>
          {onLogout ? <TouchableOpacity onPress={onLogout} className="w-11 h-11 rounded-2xl bg-white border border-orange-100 items-center justify-center"><LogOut size={18} color="#94a3b8" /></TouchableOpacity> : null}
        </View>

        <View className="bg-white rounded-3xl p-1 flex-row border border-gray-200 mb-5">
          <TouchableOpacity onPress={() => setMode('create')} className="flex-1 py-3 rounded-[20px] items-center flex-row justify-center gap-2" style={{ backgroundColor: mode === 'create' ? '#f97316' : 'transparent' }}><Home size={17} color={mode === 'create' ? '#fff' : '#64748b'} /><Text className={`font-black ${mode === 'create' ? 'text-white' : 'text-gray-500'}`}>Үүсгэх</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('join')} className="flex-1 py-3 rounded-[20px] items-center flex-row justify-center gap-2" style={{ backgroundColor: mode === 'join' ? '#f97316' : 'transparent' }}><Users size={17} color={mode === 'join' ? '#fff' : '#64748b'} /><Text className={`font-black ${mode === 'join' ? 'text-white' : 'text-gray-500'}`}>Нэгдэх</Text></TouchableOpacity>
        </View>

        {error ? <View className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-4"><Text className="text-xs font-bold text-red-600 leading-5">{error}</Text></View> : null}

        <View className="bg-white border border-gray-200 rounded-[28px] p-5 mb-4">
          <Text className="text-xs font-black text-gray-400 uppercase mb-3">Таны аватар</Text>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Таны нэр" placeholderTextColor="#94a3b8" className="bg-[#fffaf5] border border-gray-200 rounded-2xl p-4 font-bold text-gray-900 mt-3" />
        </View>

        {mode === 'create' ? (
          <>
            <View className="bg-white border border-gray-200 rounded-[28px] p-5 mb-4">
              <Text className="text-xs font-black text-gray-400 uppercase mb-3">{groupMeta.label} нэр</Text>
              <TextInput value={familyName} onChangeText={setFamilyName} placeholder={DEFAULT_NAME_BY_TYPE[groupType] || DEFAULT_FAMILY_NAME} placeholderTextColor="#94a3b8" className="bg-[#fffaf5] border border-gray-200 rounded-2xl p-4 font-bold text-gray-900" />
            </View>

            {showMemberAdder ? (
              <View className="bg-white border border-gray-200 rounded-[28px] p-5 mb-4">
                <View className="flex-row items-center gap-2 mb-1"><Sparkles size={17} color="#f97316" /><Text className="text-base font-black text-gray-950">{groupMeta.memberLabelSingular === 'найз' ? 'Найз нэмэх' : groupMeta.memberLabelSingular === 'хань' ? 'Хань нэмэх' : 'Гишүүн нэмэх'}</Text></View>
                <Text className="text-xs font-semibold text-gray-400 mb-3">
                  {canAddMoreMembers ? 'Зөвхөн аватар, нэр. Энэ хэсгийг алгасаж болно.' : `Энэ бүлэгт дээд тал нь ${groupMeta.maxMembers} хүн байж болно.`}
                </Text>
                {canAddMoreMembers ? (
                  <>
                    <AvatarPicker value={extraAvatar} onChange={setExtraAvatar} compact />
                    <View className="flex-row gap-2 mt-3">
                      <TextInput value={extraName} onChangeText={setExtraName} placeholder="Жишээ: Энхжин" placeholderTextColor="#94a3b8" className="flex-1 bg-[#fffaf5] border border-orange-100 rounded-2xl px-4 font-bold text-gray-900" />
                      <TouchableOpacity onPress={addQuickMember} className="w-14 h-14 rounded-2xl bg-orange-500 items-center justify-center"><Plus size={23} color="#fff" /></TouchableOpacity>
                    </View>
                  </>
                ) : null}
                {extraMembers.length ? <View className="flex-row flex-wrap gap-2 mt-3">{extraMembers.map((member, index) => <View key={`${member.name}_${index}`} className="bg-orange-50 border border-orange-100 rounded-2xl px-3 py-2 flex-row items-center gap-2"><Text className="text-xl">{member.avatar}</Text><Text className="font-black text-gray-700">{member.name}</Text><TouchableOpacity onPress={() => setExtraMembers((prev) => prev.filter((_, i) => i !== index))}><X size={15} color="#f97316" /></TouchableOpacity></View>)}</View> : null}
              </View>
            ) : null}
          </>
        ) : (
          <View className="bg-white border border-gray-200 rounded-[28px] p-5 mb-4">
            <Text className="text-xs font-black text-gray-400 uppercase mb-3">Урилгын код</Text>
            <View className="flex-row items-center bg-orange-50 border border-orange-100 rounded-2xl px-3"><KeyRound size={18} color="#f97316" /><TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="FAM-123456" placeholderTextColor="#94a3b8" className="flex-1 p-4 font-black text-gray-900" /></View>
          </View>
        )}

        <TouchableOpacity disabled={!canSubmit()} onPress={submit} className="rounded-3xl py-4 items-center" style={{ opacity: canSubmit() ? 1 : 0.5, backgroundColor: '#f97316' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-base">{mode === 'create' ? groupMeta.createLabel : 'Бүлэгт нэгдэх'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
