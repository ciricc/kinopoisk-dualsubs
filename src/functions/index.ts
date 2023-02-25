export const sleep = (ms:number) => new Promise((r) => setTimeout(() => r(true), ms));
export const isMac = () => (/(macintosh|macintel|macppc|mac68k|macos)/i).test(navigator.userAgent);