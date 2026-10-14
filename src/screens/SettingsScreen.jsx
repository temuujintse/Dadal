import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, ScrollView, Share } from 'react-native';
import { Copy, LogOut, Bell, Users, Shield, RotateCcw, CircleCheck, Share2, Flame } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { getGroupTypeMeta, isAdminRole } from '../constants/groupTypes';
import { ACTIVITY_LEVELS, SEX_OPTIONS, calcDailyCalories } from '../utils/nutrition';
import { GENERIC_DAILY_CALORIE_TARGET } from '../constants/foodCalories';

export default function SettingsScreen({
  familyProfile,
  selectedUser,
  currentMember,
  members = [],
  notificationSettings,
  onSaveNotificationSettings,
  onLogout,
  onResetOnboarding,
  onSaveMemberProfile,
}) {
  const groupMeta = getGroupTypeMeta(familyProfile?.groupType);
  // "Эцэг эх" гэдэг ЗӨВХӨН 'family' төрөлд утга учиртай ярианы нэр —
  // бусад бүлэгт "Админ" гэсэн ерөнхий нэр илүү зохимжтой.
  const adminLabel = groupMeta.id === 'family' ? 'Эцэг эх' : 'Админ';
  const memberRoleLabel = (role) => (isAdminRole(role) ? adminLabel : groupMeta.memberLabelSingular === 'та' ? 'Гишүүн' : groupMeta.memberLabelSingular.charAt(0).toUpperCase() + groupMeta.memberLabelSingular.slice(1));
  const [remindersEnabled, setRemindersEnabled] = useState(Boolean(notificationSettings?.enabled));
  const [waterEnabled, setWaterEnabled] = useState(Boolean(notificationSettings?.water));
  const [waterNotice, setWaterNotice] = useState('');
  const [hour, setHour] = useState(String(notificationSettings?.hour ?? 20).padStart(2, '0'));
  const [minute, setMinute] = useState(String(notificationSettings?.minute ?? 30).padStart(2, '0'));
  const [copied, setCopied] = useState(false);
  const [reminderNotice, setReminderNotice] = useState('');

  // ── Хувь хүний илчлэгийн зорилт (БҮГД сонголттой) ─────────────────────
  // Зөвхөн ӨӨРИЙНХӨӨ мэдээллийг өөрөө бөглөнө. Бөглөөгүй бол ерөнхий 2000
  // ккал хэвээр — энэ бол шаардлага биш, нэмэлт боломж.
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ birthYear: '', sex: '', heightCm: '', weightKg: '', activityLevel: 'light' });
  const [profileNotice, setProfileNotice] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setProfileDraft({
      birthYear: currentMember?.birthYear ? String(currentMember.birthYear) : '',
      sex: currentMember?.sex || '',
      heightCm: currentMember?.heightCm ? String(currentMember.heightCm) : '',
      weightKg: currentMember?.weightKg ? String(currentMember.weightKg) : '',
      activityLevel: currentMember?.activityLevel || 'light',
    });
  }, [currentMember]);

  const calorieResult = calcDailyCalories(profileDraft);

  const saveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileNotice('');
    const result = await onSaveMemberProfile?.(profileDraft);
    setProfileSaving(false);
    if (result && !result.ok) {
      setProfileNotice(result.message || 'Хадгалж чадсангүй.');
      return;
    }
    setProfileNotice('Хадгаллаа.');
    setTimeout(() => setProfileNotice(''), 2200);
  };

  const clearProfile = async () => {
    setProfileDraft({ birthYear: '', sex: '', heightCm: '', weightKg: '', activityLevel: 'light' });
    await onSaveMemberProfile?.({ birthYear: '', sex: '', heightCm: '', weightKg: '', activityLevel: '' });
    setProfileNotice('Мэдээллийг устгалаа.');
    setTimeout(() => setProfileNotice(''), 2200);
  };

  useEffect(() => {
    setRemindersEnabled(Boolean(notificationSettings?.enabled));
    setHour(String(notificationSettings?.hour ?? 20).padStart(2, '0'));
    setMinute(String(notificationSettings?.minute ?? 30).padStart(2, '0'));
    setWaterEnabled(Boolean(notificationSettings?.water));
  }, [notificationSettings]);

  const inviteLink = `familyhabit://join?code=${familyProfile?.inviteCode || ''}`;

  const copyInviteCode = async () => {
    const code = familyProfile?.inviteCode || '';
    if (!code) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const shareInvite = async () => {
    if (!familyProfile?.inviteCode) return;
    const groupName = familyProfile?.familyName || groupMeta.label;
    await Share.share({ message: `"${groupName}" ${groupMeta.noun}-т Дадал апп-аар нэгдээрэй: ${inviteLink}\nInvite code: ${familyProfile.inviteCode}` });
  };

  const saveReminders = async (enabled = remindersEnabled) => {
    const safeHour = Math.min(Math.max(Number(hour || 20), 0), 23);
    const safeMinute = Math.min(Math.max(Number(minute || 30), 0), 59);
    return onSaveNotificationSettings?.({ enabled, hour: safeHour, minute: safeMinute });
  };

  // Optimistic-аар switch-ийг эргүүлдэг ч save амжилтгүй болсоор ХУЧИН
  // утгад нь буцаана — hook нь зөвшөөрөл татгалзсан/алдааны үед state-ээ
  // огт бичдэггүй тул энд гар аргаар revert хийнэ.
  const toggleReminders = async (enabled) => {
    const previous = remindersEnabled;
    setReminderNotice('');
    setRemindersEnabled(enabled);
    let result;
    try {
      result = await saveReminders(enabled);
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      setRemindersEnabled(previous);
      setReminderNotice(result?.message || 'Мэдэгдлийн тохиргоо хадгалагдсангүй. Дахин оролдоно уу.');
    }
  };

  const handleSaveReminders = async () => {
    setReminderNotice('');
    let result;
    try {
      result = await saveReminders(remindersEnabled);
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) setReminderNotice(result?.message || 'Мэдэгдлийн тохиргоо хадгалагдсангүй. Дахин оролдоно уу.');
  };

  // Ус уух сануулга нь өдрийн дадлын reminder-ээс ТУСГААР асаагддаг ч дотроо
  // NEГ notification батчаар (cancelAll + дахин товлох) хамт удирддаг тул
  // мерж хийж onSaveNotificationSettings рүү зөвхөн water талбарыг дамжуулна.
  const toggleWater = async (enabled) => {
    const previous = waterEnabled;
    setWaterNotice('');
    setWaterEnabled(enabled);
    let result;
    try {
      result = await onSaveNotificationSettings?.({ water: enabled });
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      setWaterEnabled(previous);
      setWaterNotice(result?.message || 'Ус уух сануулга хадгалагдсангүй. Дахин оролдоно уу.');
    }
  };

  return (
    <ScrollView className="px-5 pt-2" contentContainerStyle={{ paddingBottom: 132 }}>
      <Text className="text-2xl font-black text-gray-950 mb-4">Тохиргоо</Text>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center gap-3 mb-4">
          <Users size={22} color="#1e293b" />
          <View>
            <Text className="text-lg font-black" style={{ color: '#1e293b' }}>{groupMeta.shortLabel}</Text>
            <Text className="text-xs font-bold" style={{ color: '#64748b' }}>{familyProfile?.familyName || groupMeta.label}</Text>
          </View>
        </View>
        {/* Хувь хүний хөтөлбөрт урих хүн байхгүй тул урилгын блок ОГТ
            харагдахгүй (groupTypes.showInvite). Өмнө нь ганцаараа хөтлөх
            горимд ч "Invite code" карт гарч ирдэг байсан нь ойлгомжгүй байв. */}
        {groupMeta.showInvite ? (
        <>
        <TouchableOpacity onPress={copyInviteCode} className="bg-slate-50 rounded-2xl p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-black text-gray-400 uppercase">Invite code</Text>
            <Text className="text-xl font-black text-gray-950">{familyProfile?.inviteCode || 'FAM-000000'}</Text>
          </View>
          {copied ? <CircleCheck size={21} color="#2563eb" /> : <Copy size={20} color="#64748b" />}
        </TouchableOpacity>
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={copyInviteCode}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Линк хуулах"
            className="flex-1 bg-orange-50 border border-orange-100 rounded-2xl py-3 items-center flex-row justify-center gap-2"
            style={{ minHeight: 44 }}
          >
            <Copy size={16} color="#f97316" /><Text className="text-orange-600 font-black text-xs">{copied ? 'Хуулсан' : 'Линк хуулах'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareInvite}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Хуваалцах"
            className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 items-center flex-row justify-center gap-2"
            style={{ minHeight: 44 }}
          >
            <Share2 size={16} color="#1e293b" /><Text className="font-black text-xs" style={{ color: '#1e293b' }}>Хуваалцах</Text>
          </TouchableOpacity>
        </View><Text className="text-xs font-bold text-gray-400 mt-3">Invite link болон code-ийг {groupMeta.memberLabel}-дээ илгээнэ.</Text>
        </>
        ) : (
          <Text className="text-xs font-bold text-gray-400">Энэ бол зөвхөн танд зориулсан хөтөлбөр — урих шаардлагагүй.</Text>
        )}
      </View>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3 flex-1 pr-3">
            <Bell size={22} color="#f97316" />
            <View>
              <Text className="text-lg font-black text-gray-950">Notification reminder</Text>
              <Text className="text-xs font-bold text-gray-400">Өглөө ба орой, өдөрт 2 удаа</Text>
            </View>
          </View>
          <Switch value={remindersEnabled} onValueChange={toggleReminders} />
        </View>
        <View className="flex-row gap-3">
          <TextInput value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center font-black" />
          <TextInput value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center font-black" />
        </View>
        <TouchableOpacity onPress={handleSaveReminders} className="mt-3 bg-orange-500 rounded-2xl py-3 items-center">
          <Text className="text-white font-black">Reminder хадгалах</Text>
        </TouchableOpacity>
        {reminderNotice ? <Text className="text-xs font-bold text-red-500 mt-3 leading-5">{reminderNotice}</Text> : null}
        <Text className="text-xs font-bold text-gray-400 mt-3">Өглөө 08:00-д, орой таны сонгосон цагт найрсаг reminder ирнэ.</Text>
      </View>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1 pr-3">
            <Text style={{ fontSize: 22 }}>💧</Text>
            <View>
              <Text className="text-lg font-black text-gray-950">Ус уух сануулга</Text>
              <Text className="text-xs font-bold text-gray-400">Өдөрт 5 удаа (10:00-19:30)</Text>
            </View>
          </View>
          <Switch value={waterEnabled} onValueChange={toggleWater} />
        </View>
        {waterNotice ? <Text className="text-xs font-bold text-red-500 mt-3 leading-5">{waterNotice}</Text> : null}
      </View>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center gap-3 mb-3">
          <Shield size={22} color="#1e293b" />
          <Text className="text-lg font-black" style={{ color: '#1e293b' }}>Миний бүртгэл</Text>
        </View>
        <Text className="text-sm font-bold text-gray-500">Нэр: {currentMember?.name || 'Гишүүн'}</Text>
        <Text className="text-sm font-bold text-gray-500 mt-1">Үүрэг: {memberRoleLabel(currentMember?.role)}</Text>
      </View>

      {/* ── Илчлэгийн зорилт — БҮРЭН СОНГОЛТТОЙ ────────────────────────
          Бөглөөгүй бол хоол бүртгэлд ерөнхий 2000 ккал ашиглана. Зөвхөн
          нэвтэрсэн хүн ӨӨРИЙНХӨӨ утгыг оруулна (Firestore дүрэм ч ижил). */}
      {onSaveMemberProfile ? (
      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <TouchableOpacity
          onPress={() => setProfileOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel="Илчлэгийн зорилт тохируулах"
          className="flex-row items-center justify-between"
          style={{ minHeight: 44 }}
        >
          <View className="flex-row items-center gap-3 flex-1 pr-2">
            <Flame size={22} color="#f97316" />
            <View className="flex-1">
              <Text className="text-lg font-black" style={{ color: '#1e293b' }}>Илчлэгийн зорилт</Text>
              <Text className="text-xs font-bold" style={{ color: '#64748b' }}>
                {calorieResult.ok ? `Одоогийн зорилт: ${calorieResult.calories} ккал/өдөр` : `Ерөнхий ${GENERIC_DAILY_CALORIE_TARGET} ккал ашиглаж байна`}
              </Text>
            </View>
          </View>
          <Text className="text-xs font-black text-orange-500">{profileOpen ? 'Хаах' : 'Тохируулах'}</Text>
        </TouchableOpacity>

        {profileOpen ? (
          <View className="mt-4 gap-3">
            <Text className="text-[11px] font-bold text-gray-400 leading-4">
              Бүгд сонголттой. Бөглөвөл хоолны илчлэгийн зорилтыг тань дээр тааруулж тооцно. Хэзээ ч устгаж болно.
            </Text>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-gray-400 uppercase mb-1">Төрсөн он</Text>
                <TextInput
                  value={profileDraft.birthYear}
                  onChangeText={(value) => setProfileDraft((d) => ({ ...d, birthYear: value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                  keyboardType="number-pad"
                  placeholder="1990"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-gray-200 rounded-2xl px-3 py-3 font-bold text-gray-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-gray-400 uppercase mb-1">Өндөр (см)</Text>
                <TextInput
                  value={profileDraft.heightCm}
                  onChangeText={(value) => setProfileDraft((d) => ({ ...d, heightCm: value.replace(/[^0-9]/g, '').slice(0, 3) }))}
                  keyboardType="number-pad"
                  placeholder="170"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-gray-200 rounded-2xl px-3 py-3 font-bold text-gray-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-gray-400 uppercase mb-1">Жин (кг)</Text>
                <TextInput
                  value={profileDraft.weightKg}
                  onChangeText={(value) => setProfileDraft((d) => ({ ...d, weightKg: value.replace(/[^0-9]/g, '').slice(0, 3) }))}
                  keyboardType="number-pad"
                  placeholder="65"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-gray-200 rounded-2xl px-3 py-3 font-bold text-gray-900"
                />
              </View>
            </View>

            <View>
              <Text className="text-[10px] font-black text-gray-400 uppercase mb-1.5">Хүйс</Text>
              <View className="flex-row gap-2">
                {SEX_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => setProfileDraft((d) => ({ ...d, sex: d.sex === option.id ? '' : option.id }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: profileDraft.sex === option.id }}
                    className={`flex-1 rounded-2xl py-3 items-center border ${profileDraft.sex === option.id ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'}`}
                    style={{ minHeight: 44 }}
                  >
                    <Text className={`text-xs font-black ${profileDraft.sex === option.id ? 'text-white' : 'text-gray-500'}`}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-[10px] font-black text-gray-400 uppercase mb-1.5">Хөдөлгөөний түвшин</Text>
              <View className="gap-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    onPress={() => setProfileDraft((d) => ({ ...d, activityLevel: level.id }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: profileDraft.activityLevel === level.id }}
                    className={`rounded-2xl px-4 py-3 border flex-row items-center justify-between ${profileDraft.activityLevel === level.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                    style={{ minHeight: 44 }}
                  >
                    <Text className={`text-xs font-black ${profileDraft.activityLevel === level.id ? 'text-blue-700' : 'text-gray-600'}`}>{level.label}</Text>
                    <Text className="text-[10px] font-bold text-gray-400">{level.hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="bg-slate-50 rounded-2xl p-4">
              {calorieResult.ok ? (
                <>
                  <Text className="text-[10px] font-black text-gray-400 uppercase">Тооцоолсон өдрийн хэрэгцээ</Text>
                  <Text className="text-2xl font-black text-gray-950 mt-1">{calorieResult.calories} ккал</Text>
                  <Text className="text-[10px] font-bold text-gray-400 mt-1 leading-4">
                    Mifflin-St Jeor томьёогоор тооцсон ОЙРОЛЦОО баримжаа. Хүн бүрийн бодит хэрэгцээ өөр байдаг тул эмчийн болон хоол зүйчийн зөвлөгөөг орлохгүй.
                  </Text>
                </>
              ) : (
                <Text className="text-[11px] font-bold text-gray-500 leading-4">
                  {calorieResult.reason === 'minor'
                    ? '18-аас доош насны хүүхдийн илчлэгийн хэрэгцээ өсөлтийн үе шатаас хамаардаг тул апп тооцоолохгүй — ерөнхий утгыг ашиглана.'
                    : 'Төрсөн он, хүйс, өндөр, жин дөрвийг бөглөвөл зорилтыг тань дээр тааруулж тооцно.'}
                </Text>
              )}
            </View>

            {profileNotice ? <Text className="text-xs font-bold text-blue-600">{profileNotice}</Text> : null}

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={saveProfile}
                disabled={profileSaving}
                accessibilityRole="button"
                accessibilityLabel="Илчлэгийн мэдээлэл хадгалах"
                className="flex-1 bg-orange-500 rounded-2xl py-3 items-center"
                style={{ minHeight: 44, opacity: profileSaving ? 0.6 : 1 }}
              >
                <Text className="text-white font-black text-xs">{profileSaving ? 'Хадгалж байна…' : 'Хадгалах'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearProfile}
                accessibilityRole="button"
                accessibilityLabel="Илчлэгийн мэдээлэл устгах"
                className="bg-white border border-gray-200 rounded-2xl py-3 px-4 items-center"
                style={{ minHeight: 44 }}
              >
                <Text className="font-black text-xs text-gray-500">Устгах</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
      ) : null}

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <Text className="text-lg font-black text-gray-950 mb-3">Гишүүд</Text>
        {members.map((member) => (
          <View key={member.uid} className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-2"><Text className="text-2xl">{member.avatar || '🙂'}</Text><Text className="font-black text-gray-900">{member.name}</Text></View>
              <Text className="text-[10px] font-bold text-gray-400">{memberRoleLabel(member.role)}</Text>
            </View>
            <Text className="font-black" style={{ color: '#f97316' }}>{member.points || 0}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onResetOnboarding}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Onboarding дахин харах"
        className="bg-white border border-gray-200 rounded-3xl p-4 flex-row items-center justify-center gap-2 mb-3"
        style={{ minHeight: 52 }}
      >
        <RotateCcw size={20} color="#1e293b" />
        <Text className="font-black" style={{ color: '#1e293b' }}>Onboarding дахин харах</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onLogout}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Гарах"
        className="bg-white border border-red-200 rounded-3xl p-4 flex-row items-center justify-center gap-2"
        style={{ minHeight: 52 }}
      >
        <LogOut size={20} color="#dc2626" />
        <Text className="text-red-600 font-black">Гарах</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
