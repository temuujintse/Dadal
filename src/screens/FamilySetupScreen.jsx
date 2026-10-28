import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Users, KeyRound, LogOut, Plus, X, ChevronLeft, Camera, Check } from 'lucide-react-native';
import { GROUP_TYPE_LIST, getGroupTypeMeta, getMemberRole } from '../constants/groupTypes';
import { getBaseTasks } from '../constants/tasks';
import FloatCard from '../components/FloatCard';

export const AVATARS = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐻', '🦊', '🐼', '🐰', '🦁'];

const DEFAULT_FAMILY_NAME = 'Манай гэр бүл';
// Төрөл сонгоход тохирох анхны нэр — хэрэглэгч нэрийг өөрчлөөгүй үед л дарж бичнэ.
const DEFAULT_NAME_BY_TYPE = {
  family: 'Манай гэр бүл',
  friends: 'Манай найзууд',
  personal: 'Миний дадал',
  couple: 'Бидний хос',
};
const STEP_COUNT = 4;
// Зураг сонгох нь native модуль (image-picker) шаарддаг тул зөвхөн дарсан үед ачаална.
const loadPhotoService = () => import('../services/photos');

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
              backgroundColor: selected ? '#dcfce7' : '#fff',
              borderColor: selected ? '#16a34a' : '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: compact ? 23 : 28 }}>{avatar}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function StepHeader({ step, title, subtitle, onBack, onLogout }) {
  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center">
        {onBack ? (
          <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Буцах" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center">
            <ChevronLeft size={18} color="#64748b" />
          </TouchableOpacity>
        ) : <View className="w-10" />}
        {onLogout ? <TouchableOpacity onPress={onLogout} accessibilityLabel="Гарах" className="w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center"><LogOut size={17} color="#94a3b8" /></TouchableOpacity> : null}
      </View>
      {step ? (
        <View className="flex-row gap-1.5 mt-5">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <View key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i < step ? '#16a34a' : '#e5e7eb' }} />
          ))}
        </View>
      ) : null}
      {step ? <Text className="text-[11px] font-black uppercase text-green-600 tracking-widest mt-4">{step}-р алхам · {STEP_COUNT}</Text> : null}
      <Text className="text-2xl font-black text-gray-950 mt-1">{title}</Text>
      {subtitle ? <Text className="text-sm font-semibold text-gray-500 mt-1">{subtitle}</Text> : null}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, loading }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} className="rounded-3xl py-4 items-center mt-2" style={{ opacity: disabled ? 0.45 : 1, backgroundColor: '#16a34a' }}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-base">{label}</Text>}
    </TouchableOpacity>
  );
}

function PersonPhoto({ person, size = 64 }) {
  return (
    <View className="items-center justify-center overflow-hidden bg-green-50 border border-green-100" style={{ width: size, height: size, borderRadius: size * 0.34 }}>
      {person.photoData
        ? <Image source={{ uri: person.photoData }} style={{ width: size, height: size }} />
        : <Text style={{ fontSize: size * 0.5 }}>{person.avatar}</Text>}
    </View>
  );
}

export default function FamilySetupScreen({ initialInviteCode = '', onCreateFamily, onJoinFamily, loading = false, error = null, onLogout }) {
  const [mode, setMode] = useState(initialInviteCode ? 'join' : 'create');
  const [step, setStep] = useState(1);
  const [groupType, setGroupType] = useState(null);
  const [familyName, setFamilyName] = useState(DEFAULT_FAMILY_NAME);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('👨');
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [extraName, setExtraName] = useState('');
  const [extraRole, setExtraRole] = useState(null);
  const [extraMembers, setExtraMembers] = useState([]);
  const [coreTaskIds, setCoreTaskIds] = useState([]);
  const [photoNotice, setPhotoNotice] = useState('');

  useEffect(() => {
    if (!initialInviteCode) return;
    setInviteCode(initialInviteCode);
    setMode('join');
  }, [initialInviteCode]);

  const groupMeta = getGroupTypeMeta(groupType);
  const memberRoles = groupMeta.memberRoles || [];
  const isSolo = groupMeta.maxMembers === 1;
  const canAddMoreMembers = groupMeta.maxMembers - 1 > extraMembers.length;
  const starterTasks = useMemo(() => (groupType ? getBaseTasks(groupType, false) : []), [groupType]);

  const selectType = (nextType) => {
    if (Object.values(DEFAULT_NAME_BY_TYPE).includes(familyName)) setFamilyName(DEFAULT_NAME_BY_TYPE[nextType] || DEFAULT_FAMILY_NAME);
    setGroupType(nextType);
    setExtraRole(getGroupTypeMeta(nextType).memberRoles?.[0]?.id || null);
    // Анхдагчаар нойр, ус (hours/count төрлийн) дадлуудыг үндсэн болгож сонгоно.
    setCoreTaskIds(getBaseTasks(nextType, false).filter((task) => ['hours', 'count'].includes(task.detailType)).map((task) => task.id));
    setStep(2);
  };

  const addMember = () => {
    if (!extraName.trim() || !canAddMoreMembers) return;
    const role = getMemberRole(groupType, extraRole);
    setExtraMembers((prev) => [...prev, { name: extraName.trim(), avatar: role?.emoji || '🙂', memberRole: role?.id || null, isKid: Boolean(role?.kid), photoData: null }]);
    setExtraName('');
  };

  const pickPhoto = async (index) => {
    setPhotoNotice('');
    try {
      const { pickAvatarAsDataUrl } = await loadPhotoService();
      const picked = await pickAvatarAsDataUrl();
      if (!picked.ok) {
        if (picked.code !== 'CANCELED') setPhotoNotice(picked.message);
        return;
      }
      if (index === -1) setOwnerPhoto(picked.dataUrl);
      else setExtraMembers((prev) => prev.map((member, i) => (i === index ? { ...member, photoData: picked.dataUrl } : member)));
    } catch (e) {
      console.error('Photo pick error:', e?.message);
      setPhotoNotice('Зураг сонгох боломжгүй байна. Emoji-гоор үргэлжлүүлж болно.');
    }
  };

  const toggleCore = (id) => setCoreTaskIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const submitCreate = () => {
    if (loading || !displayName.trim() || !familyName.trim() || !coreTaskIds.length) return;
    onCreateFamily?.({ familyName: familyName.trim(), displayName: displayName.trim(), avatar, photoData: ownerPhoto, extraMembers, groupType, coreTaskIds });
  };

  const submitJoin = () => {
    if (loading || !displayName.trim() || !inviteCode.trim()) return;
    onJoinFamily?.({ inviteCode: inviteCode.trim().toUpperCase(), displayName: displayName.trim(), avatar });
  };

  const errorBox = error ? <View className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-4"><Text className="text-xs font-bold text-red-600 leading-5">{error}</Text></View> : null;
  const screen = (children) => (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  );

  // ── Урилгын кодоор нэгдэх ──────────────────────────────────────────────
  if (mode === 'join') {
    return screen(
      <>
        <StepHeader title="Бүлэгт нэгдэх" subtitle="Урилгын код болон нэрээ оруулна." onBack={() => setMode('create')} onLogout={onLogout} />
        {errorBox}
        <FloatCard index={0} style={{ padding: 18, marginBottom: 12 }}>
          <Text className="text-xs font-black text-gray-400 uppercase mb-3">Урилгын код</Text>
          <View className="flex-row items-center bg-green-50 border border-green-100 rounded-2xl px-3"><KeyRound size={18} color="#16a34a" /><TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="FAM-123456" placeholderTextColor="#94a3b8" className="flex-1 p-4 font-black text-gray-900" /></View>
        </FloatCard>
        <FloatCard index={1} style={{ padding: 18, marginBottom: 12 }}>
          <Text className="text-xs font-black text-gray-400 uppercase mb-3">Таны аватар</Text>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Таны нэр" placeholderTextColor="#94a3b8" className="bg-slate-50 border border-gray-200 rounded-2xl p-4 font-bold text-gray-900 mt-3" />
        </FloatCard>
        <PrimaryButton label="Бүлэгт нэгдэх" onPress={submitJoin} disabled={!displayName.trim() || !inviteCode.trim()} loading={loading} />
      </>
    );
  }

  // ── 1. Бүлгийн төрөл ──────────────────────────────────────────────────
  if (step === 1 || !groupType) {
    return screen(
      <>
        <StepHeader step={1} title="Хэнтэй хамт дадал хэвшүүлэх вэ?" subtitle="Бүлгийн төрлөө сонгоно уу." onLogout={onLogout} />
        <View className="gap-1">
          {GROUP_TYPE_LIST.map((type, index) => (
            <FloatCard key={type.id} index={index} selected={groupType === type.id} onPress={() => selectType(type.id)} accessibilityLabel={type.label} style={{ padding: 18 }}>
              <View className="flex-row items-center gap-4">
                <Text style={{ fontSize: 38 }}>{type.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-base font-black text-gray-950">{type.label}</Text>
                  <Text className="text-xs font-semibold text-gray-500 mt-0.5">{type.description}</Text>
                </View>
              </View>
            </FloatCard>
          ))}
        </View>
        <TouchableOpacity onPress={() => setMode('join')} className="flex-row items-center justify-center gap-2 py-3 mt-4 rounded-2xl bg-white border border-gray-200">
          <Users size={16} color="#64748b" />
          <Text className="font-black text-gray-500 text-sm">Урилгын кодоор нэгдэх</Text>
        </TouchableOpacity>
      </>
    );
  }

  // ── 2. Нэр, гишүүд ────────────────────────────────────────────────────
  if (step === 2) {
    return screen(
      <>
        <StepHeader step={2} title={isSolo ? 'Өөрийгөө танилцуулаарай' : 'Гишүүдээ нэмье'} subtitle={isSolo ? null : groupType === 'family' ? 'Жишээ нь: Бат → эхнэр, 3 хүү.' : null} onBack={() => setStep(1)} onLogout={onLogout} />
        <FloatCard index={0} style={{ padding: 18, marginBottom: 12 }}>
          <Text className="text-xs font-black text-gray-400 uppercase mb-3">Таны нэр, аватар</Text>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Жишээ: Бат" placeholderTextColor="#94a3b8" className="bg-slate-50 border border-gray-200 rounded-2xl p-4 font-bold text-gray-900 mt-3" />
          <Text className="text-xs font-black text-gray-400 uppercase mt-4 mb-2">{groupMeta.possessive} нэр</Text>
          <TextInput value={familyName} onChangeText={setFamilyName} placeholder={DEFAULT_NAME_BY_TYPE[groupType]} placeholderTextColor="#94a3b8" className="bg-slate-50 border border-gray-200 rounded-2xl p-4 font-bold text-gray-900" />
        </FloatCard>

        {!isSolo ? (
          <FloatCard index={1} style={{ padding: 18, marginBottom: 12 }}>
            <Text className="text-base font-black text-gray-950">Гишүүд нэмэх</Text>
            <Text className="text-xs font-semibold text-gray-400 mb-3">{canAddMoreMembers ? 'Үүргийг нь сонгоод нэрийг бичнэ. Дараа нь ч нэмж болно.' : `Дээд тал нь ${groupMeta.maxMembers} хүн.`}</Text>
            {canAddMoreMembers ? (
              <>
                {memberRoles.length > 1 ? (
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {memberRoles.map((role) => {
                      const selected = extraRole === role.id;
                      return (
                        <TouchableOpacity key={role.id} onPress={() => setExtraRole(role.id)} accessibilityState={{ selected }} className="px-3 py-2 rounded-2xl border flex-row items-center gap-1" style={{ backgroundColor: selected ? '#dcfce7' : '#fff', borderColor: selected ? '#16a34a' : '#e5e7eb' }}>
                          <Text>{role.emoji}</Text>
                          <Text className="text-xs font-black" style={{ color: selected ? '#15803d' : '#64748b' }}>{role.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
                <View className="flex-row gap-2">
                  <TextInput value={extraName} onChangeText={setExtraName} onSubmitEditing={addMember} placeholder="Нэр, жишээ: Энхжин" placeholderTextColor="#94a3b8" className="flex-1 bg-slate-50 border border-gray-200 rounded-2xl px-4 font-bold text-gray-900" />
                  <TouchableOpacity onPress={addMember} accessibilityLabel="Гишүүн нэмэх" className="w-14 h-14 rounded-2xl bg-green-600 items-center justify-center"><Plus size={23} color="#fff" /></TouchableOpacity>
                </View>
              </>
            ) : null}
            {extraMembers.length ? (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {extraMembers.map((member, index) => (
                  <View key={`${member.name}_${index}`} className="bg-green-50 border border-green-100 rounded-2xl px-3 py-2 flex-row items-center gap-2">
                    <Text className="text-xl">{member.avatar}</Text>
                    <View>
                      <Text className="font-black text-gray-800">{member.name}</Text>
                      {member.memberRole ? <Text className="text-[10px] font-bold text-green-700">{getMemberRole(groupType, member.memberRole)?.label}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => setExtraMembers((prev) => prev.filter((_, i) => i !== index))} accessibilityLabel={`${member.name} хасах`}><X size={15} color="#16a34a" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </FloatCard>
        ) : null}
        <PrimaryButton label="Үргэлжлүүлэх" onPress={() => setStep(3)} disabled={!displayName.trim() || !familyName.trim()} />
      </>
    );
  }

  // ── 3. Зураг ──────────────────────────────────────────────────────────
  if (step === 3) {
    const people = [{ name: displayName.trim() || 'Та', avatar, photoData: ownerPhoto, label: 'Та' }, ...extraMembers.map((member) => ({ ...member, label: getMemberRole(groupType, member.memberRole)?.label || '' }))];
    return screen(
      <>
        <StepHeader step={3} title="Зургаа оруулаарай" subtitle="Хүн бүр өөрийн зурагтай бол илүү дотно. Алгасаж бас болно." onBack={() => setStep(2)} onLogout={onLogout} />
        {photoNotice ? <View className="bg-orange-50 border border-orange-100 rounded-2xl p-3 mb-3"><Text className="text-xs font-bold text-orange-700">{photoNotice}</Text></View> : null}
        <View className="flex-row flex-wrap justify-between">
          {people.map((person, index) => (
            <View key={`${person.name}_${index}`} style={{ width: '48%' }}>
              <FloatCard index={index} onPress={() => pickPhoto(index - 1)} accessibilityLabel={`${person.name} зураг сонгох`} style={{ padding: 16, alignItems: 'center' }}>
                <PersonPhoto person={person} size={72} />
                <Text className="font-black text-gray-900 mt-2" numberOfLines={1}>{person.name}</Text>
                {person.label ? <Text className="text-[10px] font-bold text-gray-400">{person.label}</Text> : null}
                <View className="flex-row items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-green-50">
                  <Camera size={12} color="#16a34a" />
                  <Text className="text-[10px] font-black text-green-700">{person.photoData ? 'Солих' : 'Зураг'}</Text>
                </View>
              </FloatCard>
            </View>
          ))}
        </View>
        <PrimaryButton label="Үргэлжлүүлэх" onPress={() => setStep(4)} />
      </>
    );
  }

  // ── 4. Үндсэн дадал ───────────────────────────────────────────────────
  return screen(
    <>
      <StepHeader step={4} title="Үндсэн дадлаа сонгоно уу" subtitle={isSolo ? 'Өдөр бүр заавал хийх дадлууд.' : 'Эдгээр нь бүх гишүүнд заавал байна. Гишүүд дараа нь 20+ санал болгосон дадлаас өөрсдөө нэмж сонгоно.'} onBack={() => setStep(3)} onLogout={onLogout} />
      {errorBox}
      <View className="gap-1">
        {starterTasks.map((task, index) => {
          const selected = coreTaskIds.includes(task.id);
          return (
            <FloatCard key={task.id} index={index} selected={selected} onPress={() => toggleCore(task.id)} accessibilityLabel={task.text} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: selected ? '#16a34a' : '#f1f5f9' }}>
                  {selected ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
                </View>
                <Text className="flex-1 text-[15px] font-black text-gray-900">{task.text}</Text>
                <Text className="text-[10px] font-black text-orange-600">+{task.points}</Text>
              </View>
            </FloatCard>
          );
        })}
      </View>
      <PrimaryButton label={`${groupMeta.createLabel} (${coreTaskIds.length} дадал)`} onPress={submitCreate} disabled={!coreTaskIds.length} loading={loading} />
    </>
  );
}
