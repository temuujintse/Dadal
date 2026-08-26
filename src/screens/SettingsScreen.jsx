import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, ScrollView, Share } from 'react-native';
import { Copy, LogOut, Bell, Users, Shield, RotateCcw, CircleCheck, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen({
  familyProfile,
  selectedUser,
  currentMember,
  members = [],
  notificationSettings,
  onSaveNotificationSettings,
  onLogout,
  onResetOnboarding,
}) {
  const [remindersEnabled, setRemindersEnabled] = useState(Boolean(notificationSettings?.enabled));
  const [hour, setHour] = useState(String(notificationSettings?.hour ?? 20).padStart(2, '0'));
  const [minute, setMinute] = useState(String(notificationSettings?.minute ?? 30).padStart(2, '0'));
  const [copied, setCopied] = useState(false);
  const [reminderNotice, setReminderNotice] = useState('');

  useEffect(() => {
    setRemindersEnabled(Boolean(notificationSettings?.enabled));
    setHour(String(notificationSettings?.hour ?? 20).padStart(2, '0'));
    setMinute(String(notificationSettings?.minute ?? 30).padStart(2, '0'));
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
    await Share.share({ message: `Манай гэр бүлд Family Habit апп-аар нэгдээрэй: ${inviteLink}\nInvite code: ${familyProfile.inviteCode}` });
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

  return (
    <ScrollView className="px-5 pt-2" contentContainerStyle={{ paddingBottom: 132 }}>
      <Text className="text-2xl font-black text-gray-950 mb-4">Settings</Text>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center gap-3 mb-4">
          <Users size={22} color="#2563eb" />
          <View>
            <Text className="text-lg font-black text-gray-950">Гэр бүл</Text>
            <Text className="text-xs font-bold text-gray-400">{familyProfile?.familyName || 'Family Habit'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={copyInviteCode} className="bg-slate-50 rounded-2xl p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-black text-gray-400 uppercase">Invite code</Text>
            <Text className="text-xl font-black text-gray-950">{familyProfile?.inviteCode || 'FAM-000000'}</Text>
          </View>
          {copied ? <CircleCheck size={21} color="#16a34a" /> : <Copy size={20} color="#64748b" />}
        </TouchableOpacity>
        <View className="flex-row gap-2 mt-3"><TouchableOpacity onPress={copyInviteCode} className="flex-1 bg-orange-50 rounded-2xl py-3 items-center flex-row justify-center gap-2"><Copy size={16} color="#f97316" /><Text className="text-orange-600 font-black text-xs">{copied ? 'Хуулсан' : 'Линк хуулах'}</Text></TouchableOpacity><TouchableOpacity onPress={shareInvite} className="flex-1 bg-purple-50 rounded-2xl py-3 items-center flex-row justify-center gap-2"><Share2 size={16} color="#7c3aed" /><Text className="text-purple-600 font-black text-xs">Хуваалцах</Text></TouchableOpacity></View><Text className="text-xs font-bold text-gray-400 mt-3">Invite link болон code-ийг гэр бүлийн гишүүддээ илгээнэ.</Text>
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
        <View className="flex-row items-center gap-3 mb-3">
          <Shield size={22} color="#16a34a" />
          <Text className="text-lg font-black text-gray-950">Profile</Text>
        </View>
        <Text className="text-sm font-bold text-gray-500">Одоогийн хэрэглэгч: {selectedUser}</Text>
        <Text className="text-sm font-bold text-gray-500 mt-1">Role: {currentMember?.role || 'member'}</Text>
      </View>

      <View className="bg-white border border-gray-100 rounded-3xl p-5 mb-4">
        <Text className="text-lg font-black text-gray-950 mb-3">Гишүүд</Text>
        {members.map((member) => (
          <View key={member.uid} className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <View className="flex-row items-center gap-2"><Text className="text-2xl">{member.avatar || '🙂'}</Text><Text className="font-black text-gray-900">{member.name}</Text></View>
              <Text className="text-[10px] font-bold text-gray-400">{member.role} · {member.uid}</Text>
            </View>
            <Text className="font-black text-blue-600">{member.points || 0}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onResetOnboarding} className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex-row items-center justify-center gap-2 mb-3">
        <RotateCcw size={20} color="#2563eb" />
        <Text className="text-blue-600 font-black">Onboarding дахин харах</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout} className="bg-red-50 border border-red-100 rounded-3xl p-5 flex-row items-center justify-center gap-2">
        <LogOut size={20} color="#dc2626" />
        <Text className="text-red-600 font-black">Гарах</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
