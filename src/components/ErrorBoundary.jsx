import React from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// React-ийн render/effect дотор баригдаагүй алдаа гарвал ХАМАГ модулийн мод
// unmount хийгдэж, хэрэглэгч зүгээр ЦАГААН ДЭЛГЭЦ хардаг. Юу болсныг ойлгох ч
// боломжгүй, дахин оролдох товч ч байхгүй. Error boundary нь тэр алдааг барьж
// ойлгомжтой дэлгэц харуулаад, дахин оролдох боломж өгнө.
//
// ЗААВАЛ class компонент байх ёстой — getDerivedStateFromError /
// componentDidCatch-ийн hook хувилбар React-д байхгүй.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Одоохондоо зөвхөн console. Sentry гэх мэт crash reporting нэмэх үед
    // яг ЭНД дуудна — бүх баригдаагүй UI алдаа энэ цэгээр дамжина.
    console.error('[ErrorBoundary] Баригдаагүй UI алдаа:', error?.message, info?.componentStack);
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView className="flex-1 bg-[#fffaf5]">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
          <View className="w-16 h-16 rounded-3xl bg-orange-100 items-center justify-center mb-5">
            <Text className="text-3xl">🛠️</Text>
          </View>

          <Text className="text-2xl font-black text-gray-950">Апп гэнэт зогслоо</Text>
          <Text className="text-sm font-semibold text-gray-500 mt-3 leading-6">
            Уучлаарай, санаандгүй алдаа гарлаа. Таны хадгалагдсан дадал, оноо аюулгүй
            хэвээр байгаа — доорх товчийг дарж дахин оролдоно уу.
          </Text>

          {__DEV__ ? (
            <View className="bg-white border border-red-100 rounded-2xl p-4 mt-5">
              <Text className="text-[10px] font-black uppercase text-red-500 mb-2">
                Зөвхөн хөгжүүлэлтийн горимд харагдана
              </Text>
              <Text className="text-xs font-mono text-gray-700">
                {String(error?.message || error)}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={this.handleRetry}
            accessibilityRole="button"
            className="bg-orange-500 rounded-3xl py-4 items-center mt-7"
          >
            <Text className="text-white font-black text-base">Дахин оролдох</Text>
          </TouchableOpacity>

          <Text className="text-[11px] font-semibold text-gray-400 text-center mt-4">
            Дахин давтагдвал аппыг бүрэн хааж, дахин нээнэ үү.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }
}
