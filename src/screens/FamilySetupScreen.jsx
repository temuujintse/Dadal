import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Home, Users, KeyRound, LogOut, Plus, X, Sparkles } from 'lucide-react-native';

export const AVATARS = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐻', '🦊', '🐼', '🐰', '🦁'];

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

export default function FamilySetupScreen({ initialInviteCode = '', onCreateFamily, onJoinFamily, loading = false, error = null, onLogout }) {
  const [mode, setMode] = useState(initialInviteCode ? 'join' : 'create');
  const [familyName, setFamilyName] = useState('Манай гэр бүл');
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

  const canSubmit = () => {
    if (loading || !displayName.trim()) return false;
    if (mode === 'create') return Boolean(familyName.trim());
    return Boolean(inviteCode.trim());
  };

  const addQuickMember = () => {
    if (!extraName.trim()) return;
    setExtraMembers((prev) => [...prev, { name: extraName.trim(), avatar: extraAvatar }]);
    setExtraName('');
    setExtraAvatar(AVATARS[(extraMembers.length + 3) % AVATARS.length]);
  };

  const submit = () => {
    if (!canSubmit()) return;
    if (mode === 'create') onCreateFamily?.({ familyName: familyName.trim(), displayName: displayName.trim(), avatar, extraMembers });
    else onJoinFamily?.({ inviteCode: inviteCode.trim().toUpperCase(), displayName: displayName.trim(), avatar });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf5]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row justify-between items-center mb-7">
          <View>
            <Text className="text-[11px] font-black uppercase text-orange-500 tracking-widest">Сүүлийн алхам</Text>
            <Text className="text-2xl font-black text-gray-950">Гэр бүлээ тохируулъя</Text>
          </View>
          {onLogout ? <TouchableOpacity onPress={onLogout} className="w-11 h-11 rounded-2xl bg-white border border-orange-100 items-center justify-center"><LogOut size={18} color="#94a3b8" /></TouchableOpacity> : null}
        </View>

        <View className="bg-white rounded-3xl p-1 flex-row border border-orange-100 mb-5">
          <TouchableOpacity onPress={() => setMode('create')} className="flex-1 py-3 rounded-[20px] items-center flex-row justify-center gap-2" style={{ backgroundColor: mode === 'create' ? '#f97316' : 'transparent' }}><Home size={17} color={mode === 'create' ? '#fff' : '#64748b'} /><Text className={`font-black ${mode === 'create' ? 'text-white' : 'text-gray-500'}`}>Үүсгэх</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('join')} className="flex-1 py-3 rounded-[20px] items-center flex-row justify-center gap-2" style={{ backgroundColor: mode === 'join' ? '#7c3aed' : 'transparent' }}><Users size={17} color={mode === 'join' ? '#fff' : '#64748b'} /><Text className={`font-black ${mode === 'join' ? 'text-white' : 'text-gray-500'}`}>Нэгдэх</Text></TouchableOpacity>
        </View>

        {error ? <View className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-4"><Text className="text-xs font-bold text-red-600 leading-5">{error}</Text></View> : null}

        <View className="bg-white border border-orange-100 rounded-[28px] p-5 mb-4">
          <Text className="text-xs font-black text-gray-400 uppercase mb-3">Таны аватар</Text>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Таны нэр" placeholderTextColor="#94a3b8" className="bg-[#fffaf5] border border-orange-100 rounded-2xl p-4 font-bold text-gray-900 mt-3" />
        </View>

        {mode === 'create' ? (
          <>
            <View className="bg-white border border-orange-100 rounded-[28px] p-5 mb-4">
              <Text className="text-xs font-black text-gray-400 uppercase mb-3">Гэр бүлийн нэр</Text>
              <TextInput value={familyName} onChangeText={setFamilyName} placeholder="Манай гэр бүл" placeholderTextColor="#94a3b8" className="bg-[#fffaf5] border border-orange-100 rounded-2xl p-4 font-bold text-gray-900" />
            </View>

            <View className="bg-white border border-orange-100 rounded-[28px] p-5 mb-4">
              <View className="flex-row items-center gap-2 mb-1"><Sparkles size={17} color="#f97316" /><Text className="text-base font-black text-gray-950">Гишүүн нэмэх</Text></View>
              <Text className="text-xs font-semibold text-gray-400 mb-3">Зөвхөн аватар, нэр. Энэ хэсгийг алгасаж болно.</Text>
              <AvatarPicker value={extraAvatar} onChange={setExtraAvatar} compact />
              <View className="flex-row gap-2 mt-3">
                <TextInput value={extraName} onChangeText={setExtraName} placeholder="Жишээ: Энхжин" placeholderTextColor="#94a3b8" className="flex-1 bg-[#fffaf5] border border-orange-100 rounded-2xl px-4 font-bold text-gray-900" />
                <TouchableOpacity onPress={addQuickMember} className="w-14 h-14 rounded-2xl bg-orange-500 items-center justify-center"><Plus size={23} color="#fff" /></TouchableOpacity>
              </View>
              {extraMembers.length ? <View className="flex-row flex-wrap gap-2 mt-3">{extraMembers.map((member, index) => <View key={`${member.name}_${index}`} className="bg-orange-50 border border-orange-100 rounded-2xl px-3 py-2 flex-row items-center gap-2"><Text className="text-xl">{member.avatar}</Text><Text className="font-black text-gray-700">{member.name}</Text><TouchableOpacity onPress={() => setExtraMembers((prev) => prev.filter((_, i) => i !== index))}><X size={15} color="#f97316" /></TouchableOpacity></View>)}</View> : null}
            </View>
          </>
        ) : (
          <View className="bg-white border border-purple-100 rounded-[28px] p-5 mb-4">
            <Text className="text-xs font-black text-gray-400 uppercase mb-3">Урилгын код</Text>
            <View className="flex-row items-center bg-purple-50 border border-purple-100 rounded-2xl px-3"><KeyRound size={18} color="#7c3aed" /><TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="FAM-123456" placeholderTextColor="#94a3b8" className="flex-1 p-4 font-black text-gray-900" /></View>
          </View>
        )}

        <TouchableOpacity disabled={!canSubmit()} onPress={submit} className="rounded-3xl py-4 items-center" style={{ opacity: canSubmit() ? 1 : 0.5, backgroundColor: mode === 'create' ? '#f97316' : '#7c3aed' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-base">{mode === 'create' ? 'Гэр бүл үүсгэх' : 'Гэр бүлд нэгдэх'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
