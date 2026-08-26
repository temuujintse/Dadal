// Firebase JS SDK-ийн auth модуль Expo/Metro-ийн шинэ package.json "exports"
// resolution-той зөрчилдөж, "Component auth has not been registered yet" гэх
// crash үүсгэдэг нь мэдэгдэж байгаа асуудал (Expo SDK 53+ дээр unstable_enablePackageExports
// анхныхаараа true болсон). Доорх тохиргоо нь энэ зөрчлийг арилгана.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// `_to_delete/_tmp_extract` дотор энэ төслийн БҮТЭН хуулбар (src/, package.json,
// metro.config.js) хэвтэж байгаа. Metro тэр хавтсыг мөн уншвал ижил нэртэй
// package.json хоёр удаа бүртгэгдэж "jest-haste-map: Haste module naming
// collision" анхааруулга өгөх, эсвэл буруу файл resolve хийх эрсдэлтэй.
// Тиймээс тэр модулиудыг resolver-оос бүрмөсөн хасна.
const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const excludedRoot = new RegExp(`^${escapeForRegExp(path.resolve(__dirname, '_to_delete'))}\\${path.sep}.*$`);
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previousBlockList) ? previousBlockList : previousBlockList ? [previousBlockList] : []),
  excludedRoot,
];

module.exports = withNativeWind(config, { input: './global.css' });
