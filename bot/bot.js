require("dotenv").config();
const { Bot, InputFile, InlineKeyboard } = require("grammy");
const path = require("path");
const fs = require("fs");
const { supabase } = require("../Supabaseclient");

// ============================================================================
// CONFIGURATION
// ============================================================================
if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing in .env file");
}

const SUPPORT_URL = process.env.SUPPORT_URL || "https://t.me/Moneta_Funded";

const CONFIG = {
  botToken: process.env.BOT_TOKEN,
  timeout: {
    seconds: 60,
    maxRetries: 5,
  },
  accountUrls: {
    "1STEP":
      process.env.URL_1STEP ||
      "https://go.monetafunded.com/visit/?bta=35180&brand=monetafunded",
    "2STEP":
      process.env.URL_2STEP ||
      "https://go.monetafunded.com/visit/?bta=35180&brand=monetafunded",
    PHOENIX:
      process.env.URL_PHOENIX ||
      "https://go.monetafunded.com/visit/?bta=35180&brand=monetafunded",
    INSTANT:
      process.env.URL_INSTANT ||
      "https://go.monetafunded.com/visit/?bta=35180&brand=monetafunded",
    INSTANT_PRO:
      process.env.URL_INSTANT_PRO ||
      "https://go.monetafunded.com/visit/?bta=35180&brand=monetafunded",
  },
};

// ============================================================================
// BOT INITIALIZATION
// ============================================================================
const bot = new Bot(CONFIG.botToken, {
  client: {
    timeoutSeconds: CONFIG.timeout.seconds,
    maxRetries: CONFIG.timeout.maxRetries,
  },
});

// ============================================================================
// STATE
// ============================================================================
const state = {
  buyAccountSessions: new Map(),
};

// ============================================================================
// ASSETS - Case-insensitive loading for Linux
// ============================================================================
function findFileIgnoreCase(folder, filename) {
  const files = fs.readdirSync(folder);
  const file = files.find((f) => f.toLowerCase() === filename.toLowerCase());
  if (!file) throw new Error(`File "${filename}" not found in ${folder}`);
  return path.resolve(folder, file);
}

const ASSETS_FOLDER = path.resolve(__dirname, "assets");

const ASSETS_PATH = {
  logo: findFileIgnoreCase(ASSETS_FOLDER, "moneta.PNG"),
  termsPdf: findFileIgnoreCase(ASSETS_FOLDER, "Moneta Funded Terms.pdf"),
};

const ASSETS = {
  logoExists: fs.existsSync(ASSETS_PATH.logo),
  termsPdfExists: fs.existsSync(ASSETS_PATH.termsPdf),
  logo: null,
  termsPdf: null,
};

if (ASSETS.logoExists) ASSETS.logo = new InputFile(ASSETS_PATH.logo);
if (ASSETS.termsPdfExists)
  ASSETS.termsPdf = new InputFile(ASSETS_PATH.termsPdf);

// ============================================================================
// VALIDATION HELPERS
// ============================================================================
const validate = {
  phone: (text) => {
    const cleaned = text.replace(/[\s\-().]/g, "");
    return /^\+?[0-9]{7,15}$/.test(cleaned);
  },
  gmail: (text) => {
    return /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(text.trim());
  },
};

// ============================================================================
// ACCOUNT INFO TEXTS
// ============================================================================
const ACCOUNT_INFO = {
  "1STEP": `🥇 *1-Step Challenge*

لاڤریج: 1:30
کاتی بڕینی Challenge: Unlimited
هەڵگرتنی مامەڵەکان: شەوان و کۆتایی هەفتە ✅
پلاتفۆرم: MT5 و Match Trader
سپرید: لە 0.0 pip دەست پێدەکات

📊 *ڕێژەکان:*
✅ ڕێژەی قازانجی داواکراو: %12
⛔ ڕێژەی زەرەری ڕۆژانە: %3
⛔ ڕێژەی زەرەری گشتی: %6
📅 کەمترین ڕۆژی قازانج: 3 ڕۆژ
💰 ڕێژەی دابەشبوونی قازانج (دوای بوونی بە هەژماری فەرمی): %88
🗓 بەرواری راکێشانی پارە: 14 ڕۆژ جارێک

⚠️ *ئاگادارییەکان:*
❌ مامەڵەکردن لە کاتی هەواڵ ڕێگەپێنەدراوە
❌ Swap Free نیە
❌ Refund ناکرێیتەوە دوای بڕینی هەژمار
❌ Copy Trading، Bot، Robot، Martingale ڕێگاپێدراو نیە`,

  "2STEP": `🥈 *2-Step Challenge*

لەم جۆرە هەژمارەدا ترەیدەر بە دوو قۆناغ تاقیکردنەوە دەکات، لەگەڵ بڕینی هەردوو قۆناغەکە بە سەرکەوتووی هەژماری فەرمی وەردەگرێت.
لاڤرەیج: 1:100

📊 *ڕێژەکان:*
✅ قۆناغی یەکەم: %5 قازانج
✅ قۆناغی دووەم: %10 قازانج
⛔ ڕێژەی زەرەری ڕۆژانە: %5
⛔ ڕێژەی زەرەری گشتی: %10
📅 کەمترین ڕۆژی قازانج: 3 ڕۆژ بۆ هەر قۆناغێک
⏳ کاتی بڕینی قۆناغەکان: دیاریکراو نیە
💰 ڕێژەی بەشکردنی قازانج (دوای بوونی بە هەژماری ڕاستەقینە): %88
🗓 بەرواری راکێشانی پارە: 14 ڕۆژ جارێک

⚠️ *ئاگادارییەکان:*
❌ مامەڵەکردن لە کاتی هەواڵ ڕێگەپێنەدراوە
❌ Swap Fee نیە
❌ Refund ناکرێیتەوە دوای بڕینی هەژمار
❌ Copy Trading، Bot، Robot، Martingale ڕێگاپێدراو نیە`,

  PHOENIX: `🔥 *Phoenix Challenge*

لەم جۆرە هەژمارەدا ترەیدەر یەکێک لەم لێڤڵێانە هەڵدەبژێرێت، چ قەبارەیەک هەڵدەبژێری لە Accounts ەکەی چوار جۆر لیڤڵ بەردەستە:

🎯 *لێڤڵەکان:*
• Level 1: $2,500
• Level 2: $5,000
• Level 3: $10,000
• Level 4: $20,000
• Level 5: $40,000
• Level 6: $80,000

دوای کرینی هەژمار و دیاری کردنی لیڤڵ، پێویستە KYC بکەیت پاشان Sign in contract بکەیت لە پاش ئەم هەنگاوانە هەژمارەکە چالاک دەبێت دەتوانی مامەڵە بکات.

🌟 *سوودی تایبەت:*
لەم جۆرە هەژمارەدا ترەیدەر سودێکی بێوێنە دەبینێت لە بەکارهێنانی سەرمایەی زۆر گەورە و بەدەستهێنانی قازانجێکی زۆر گەورەتر!
دوای گەشتن بە ڕێژەی قازانجی دیاریکراو بەپێی قەبارەی ئەکاونتەکە، ڕاستەوخۆ هەژمارەکەی بۆ دووقات دەکرێتەوە و قازانجەکەشی ڕادەکێشێتەوە (ڕێژەی قازانج %88).

پلاتفۆرم: MT5، Match Trader
لاڤرەیج: 1:30
ماوەی چالاک بوون: Unlimited

📊 *ڕێژەکان:*
✅ قازانجی داواکراو: %10
⛔ ڕێژەی زەرەری ڕۆژانە: %3
⛔ ڕێژەی زەرەری گشتی: %6
📅 کەمترین ڕۆژی قازانج: زیاتر لە 3 ڕۆژ بە %0.5 (کەمترین قازانجی ڕۆژانە)
💰 ڕێژەی دابەشبوونی قازانج: %88
🗓 پارە ڕاکێشان: 14 ڕۆژ جارێک

📌 *نموونە - Level 1 ($2,500):*
قازانجی داواکراو: %10 واتە $250 | کەمترین قازانجی ڕۆژانە: $12.5
1st Day: +$15 ✅ | 2nd Day: +$10 | 3rd Day: +$50 ✅ | 4th Day: -$20
5th Day: +$80 ✅ | 6th Day: +$100 | 7th Day: +$20
_دوای بەدەستهێنانی %10 قازانج، هەژمارێکی نوێ دەکرێتەوە!_

📌 *نموونە - Level 2 ($5,000):*
قازانجی داواکراو: %10 واتە $500 | کەمترین قازانجی ڕۆژانە: $25
1st Day: +$70 ✅ | 2nd Day: +$100 | 3rd Day: +$55 ✅ | 4th Day: -$80
5th Day: +$30 ✅ | 6th Day: +$150 | 7th Day: +$130 | 8th Day: +$110
_دوای بەدەستهێنانی %10 قازانج، هەژماری Level 3 چالاک دەکرێت!_

⚠️ *ئاگادارییەکان:*
❌ مامەڵە لە کاتی هەواڵ ڕێگەپێنەدراوە
❌ Swap Free نیە
❌ Copy Trading، Bot، Robot، Martingale ڕێگاپێدراو نیە`,

  INSTANT: `⚡️ *Instant Funding*

ئەم هەژمارە هەژماری ڕاستەقینە و فەرمییە، واتا ترەیدەر ناچێتە تاقیکردنەوە، بەڵکو ڕاستەوخۆ لەسەر هەژماری فەرمی کاردەکات.

دوای کرین، ئەکاونتەکەت بە ئیمەیڵ دەگەڕێتەوە. پێویستە KYC بکەیت دواتر Sign-in Contract بکەیت تا مامەڵەکردن چالاک بێت.

پلاتفۆرم: MT5 و Match Trader  
لاڤرەیج: 1:30  
ماوەی چالاک بوون: Unlimited  
هەڵگرتنی مامەڵەکان: شەوان و کۆتای هەفتە ✅  
سپرید: لە 0.0 pipەوە دەست پێدەکات  

📊 *ڕێژەکان:*  
⚖️ Consistency Rule: %20  
⛔ ڕێژەی زەرەری ڕۆژانە: %3  
⛔ ڕێژەی زەرەری گشتی: %6   
💰 ڕێژەی قازانج دابەشکردن: %88  
🗓 پارە ڕاکێشان: 14 ڕۆژ جارێک  

⚠️ *ئاگادارییەکان:*  
❌ مامەڵە لە کاتی هەواڵ ڕێگەپێنەدراوە  
❌ Swap Free نیە  
❌ Copy Trading، Martingale، Bot، Robot ڕێگاپێدراو نیە  

📌 *Consistency Rule چییە؟*  
یاسایەکی هاوسەنگییە بۆ ڕێژەی قازانجکردن کە لەلایەن مۆنێتافەندد دانراوە لەسەر هەژماری Instant، بۆ ئەوەی قازانجی ترەیدەر بەردەوام بێت و لەسەر بنەمایەکی دروست و ڕاستەقینە بێت.  

لە یەک ڕۆژی کارکردندا نابێت ڕێژەی قازانجەکەت زیاتر بێت لە:  
%20 ی کۆی گشتی قازانجی بەدەستهاتوو  
یان  
%20 ی قەبارەی ئەکاونتەکەت  

زۆربەی قازانجەکەت دەبێت لە ماوەی چەند ڕۆژێکدا بێت و ئەدای بەردەوامی کارکردنێکی دروست و قازانج پشان بدات بە ڕیسک مەنەیجمێنتێکی گونجاو.  

🎯 *سوودی Consistency Rule:*  
✅ پەیڕەوکردنی ڕیسک مەنەیجمێنتێکی گونجاو  
✅ بازرگانی کردن بە شێوازێکی دادپەروەرانە  
✅ دوورکەوتنەوە لە قومار کردن و شێوازی نایاسایی  

📐 *چۆنیەتی پەیڕەوکردنی یاسا (دوو شێواز):*  
1️⃣ شێوازی یەکەم: باشترین ڕۆژی قازانج ÷ کۆی گشتی قازانج × 100 → نابێت لە %20 زیاتر بێت  
2️⃣ شێوازی دووەم: باشترین قازانجی ڕۆژانە ÷ قەبارەی ئەکاونتەکە × 100 → نابێت لە %20 زیاتر بێت  

📘 *نموونە (1) – پابەندبوون بە یاسا ✅*  
هەژماری 100K - Instant  
ڕۆژی یەکەم: +510$  
ڕۆژی دووەم: +410$  
ڕۆژی سێیەم: -300$  
ڕۆژی چوارەم: +550$  
ڕۆژی پێنجەم: +470$  
ڕۆژی شەشەم: +530$  
ڕۆژی حەوتەم: +560$  
ڕۆژی هەشتەم: +600$  

کۆی گشتی قازانج: 3,330$  
باشترین ڕۆژ: 600$  

600 ÷ 3,330 × 100 = 18% ✅  
600 ÷ 100,000 × 100 = 0.6% ✅  

📕 *نموونە (2) – تێکشکانی یاسا ❌*  
هەژماری 100K - Instant  
ڕۆژی یەکەم: +510$  
ڕۆژی دووەم: +410$  
ڕۆژی سێیەم: -300$  
ڕۆژی چوارەم: +550$  
ڕۆژی پێنجەم: +470$  
ڕۆژی شەشەم: +530$  
ڕۆژی حەوتەم: +21,000$  
ڕۆژی هەشتەم: +600$  

کۆی گشتی قازانج: 23,770$  
باشترین ڕۆژ: 21,000$  

21,000 ÷ 23,770 × 100 = 88% ❌  
21,000 ÷ 100,000 × 100 = 21% ❌  

📗 *نموونە (3) – تێکشکانی یاسای هاوسەنگی ❌*  
هەژماری 100K - Instant  
ڕۆژی یەکەم: +1,200$  
ڕۆژی دووەم: +1,400$  
ڕۆژی سێیەم: -1,000$  
ڕۆژی چوارەم: +1,550$  
ڕۆژی پێنجەم: +1,300$  
ڕۆژی شەشەم: +1,250$  
ڕۆژی حەوتەم: +3,000$  
ڕۆژی هەشتەم: +900$  

کۆی گشتی قازانج: 9,600$  
باشترین ڕۆژ: 3,000$  

3,000 ÷ 9,600 × 100 = 31% ❌  

ئەو ترەیدەرە یاسای کەمترین ڕۆژی قازانج پەیڕەو کردووە،  
بەڵام یاسای هاوسەنگی نەپاراستووە،  
بۆیە ناتوانێت قازانجەکەی ڕابکێشێت هەتا ڕێژەکە بگەڕێتەوە خوار %20.
`,

  INSTANT_PRO: `⚡️✨ *Instant Pro Funding*

هەژماری Instant Pro هەژمارێکی نوێی فەندە کە ڕاستەقینەیە و پاسکراوە، واتە پێویست بە تاقیکردنەوە ناکات. ڕاستەوخۆ ترەیدەر دەتوانێت مامەڵە بکات و قازانجەکانی ڕابکێشێتەوە لە یەکەم ڕۆژیەوە.

📦 *قەبارەی هەژمارەکان:*
- $5,000
- $10,000
- $25,000
- $50,000
- $100,000

پلاتفۆرم: MT5 و Match Trader
لاڤرەیج: 1:30
ماوەی چالاک بوون: Unlimited

📊 *تایبەتمەندی و یاساکان:*
✅ مامەڵەکردن لە کاتی هەواڵ: ڕێگەپێدراوە
⛔ زەرەری ڕۆژانە: %4
⛔ کۆی گشتی زەرەر: %8
📈 ڕێژەی قازانجی ڕێگەپێدراوی ڕۆژانە: %4
💰 ڕێژەی قازانج دابەشکردن: %88

🗓 *پارە ڕاکێشانەوەی قازانج:*
بۆ یەکەم جار: لە هەر کاتێکدا دەتوانیت داوای ڕاکێشانەوە بکەیت (کەمترین $100)
دوای یەکەم پارەدان: هەر 14 ڕۆژ جارێک

❌ *یاسای هاوسەنگی %20 و کەمترین ڕۆژی قازانج لەم هەژمارەدا بەرکار نیە*

📌 *زۆرترین قازانجی ڕۆژانە:*
نابێت زۆرترین قازانجی ڕۆژانە لە %4ی باڵانسی سەرەکی تێپەڕبێت.
نموونە: ئەکاونتی $100K → زۆرترین قازانجی ڕۆژانە $4,000

کاتێک گەیشتە سنووری %4:
- هەموو مامەڵە کراوەکان بە ئۆتۆماتیکی دادەخرێن
- ئەکاونتەکە بۆ ماوەی کاتی لە بازرگانی دەوەستێت
- تا ڕێستکردنی ڕۆژانەی داهاتوو مامەڵەکان لە کارکەوتووی دەمێنن

⚠️ *ڕێنماییەکان بۆ سوودمەند بوون:*
١) بەپێی هەموو یاساکانی پلاتفۆرم و سنوورەکانی مەترسی بازرگانی بکە
٢) لە هەموو کاتێکدا ئاگاداری سنووری زەرەری ڕۆژانە و زۆرترین سنووری زەرەر بە`,
};

// ============================================================================
// TERMS TEXT
// ============================================================================

const TERMS_TEXT = `📋 *یاسا و مەرجەکانی هەژماری فەند*

پێش کڕینی هەژمار، تکایە ئەم مەرجانە بخوێنەرەوە:

📌 *١ - پابەند بوون بە یاساکان*
دەبێت تەواوەتی پابەند بیت بە هەموو یاسا و ڕێنمایی کۆمپانیا لە کاتی مامەڵەکردندا.

📌 *٢ - زەرەری ڕۆژانە (Daily Drawdown)*
نابێت زەرەری ڕۆژانەت لە ٪٣ تا ٪٤ تیپەڕێت بەپێی جۆری هەژمار.

📌 *٣ - زەرەری گشتی (Max Drawdown)*
نابێت کۆی گشتی زەرەرەکەت لە ٪٦ تا ٪١٠ تیپەڕێت.

📌 *٤ - News Trading*
٥ دەقە پێش و ٥ دەقە دوای هەواڵی بەهێز مامەڵە ڕێگەپێنەدراوە.

📌 *٥ - چالاک بوون*
ئەگەر ٣٠ ڕۆژ مامەڵە نەکەیت ئەکاونتەکەت دادەخرێت.

📌 *٦ - دابەش کردنی قازانج*
٪٨٨ قازانج بۆ ترەیدەر، ٪١٢ بۆ کۆمپانیا.

📌 *٧ - کێشانەوەی قازانج*
هەر ١٤ ڕۆژ جارێک دەتوانیت قازانج بکێشیتەوە.

📌 *٨ - یاسای مەترسی لە هەر مامه‌ڵه‌یه‌كدا (Risk per Trade)*

بۆ هەژماری 1 Step Challenge & 2 Step Challenge:
- لە قۆناغی چاڵێنجەکاندا هیچ یاسای مەترسی بۆ تریەدکردن نییە، مامه‌ڵەکان بە ئازادی ئەنجام دەدرێن.

بۆ قۆناغی فاندد:
- بۆ هەژماری 2 Step Challenge: نابێت کۆی گشتی مامه‌ڵەکانت لە یەک کاتدا زیاتر لە ٪٣ بگات بە زیان.

- بۆ هەژماری 1 Step Challenge، Instant Standard، Instant Pro و Phoenix:
  نابێت کۆی گشتی مامه‌ڵەکانت لە یەک کاتدا زیاتر لە ٪٢ بگات بە مەترسی.

ئەگەر ئەم یاسایە شکاند:
- بۆ جاری یەکەم: هەموو مامه‌ڵەکان دادەخرێنەوە، هەژمارەکە بۆ ئەو ڕۆژە دەوەستێت و تا ڕۆژی داهاتوو ناتوانیت مامه‌ڵە بکەیت.
- بۆ جاری دووەم: نابێت زیاتر لە ٪١.٥ مەترسی هەبێت لە کۆی مامه‌ڵەکان، ئەگەر پێشێل بکرێت هەژمارەکەت دەدەیت.

⚠️ *ئایا ڕازیت بە سەرجەم مەرج و یاساکان؟*`;
// ============================================================================
// MENUS
// ============================================================================

const MENUS = {
  main: {
    inline_keyboard: [
      [{ text: "مۆنیتا فەندد چییە ؟", callback_data: "MENU_ABOUT_Fund" }],
      [
        { text: "هەژماری فەند چیە ؟", callback_data: "MENU_FUND_SERVICES" },
        {
          text: "سوودی هەژماری فەند چیە ؟",
          callback_data: "MENU_FUND_ADVANTAGE",
        },
      ],
      [
        {
          text: "مەرجەکانی سوودمەند بوون لە هەژماری فەند چیە ؟",
          callback_data: "MENU_FUND_RULS",
        },
        {
          text: "جیاوازی هەژماری فەندو ئەکاونتی ڕاستەقینە چیە؟",
          callback_data: "MENU_FUND_DIFFRENT",
        },
      ],
      [
        { text: "یاسا گشتیەکان", callback_data: "MENU_FUND_LAWS" },
        { text: "مەرج و ڕێنماییەکان", callback_data: "MENU_FUND_TERMS" },
      ],
      [
        { text: "فێرکاری ڤیدیۆ", callback_data: "MENU_VIDEO_COURSE" },
        { text: "جۆرەکانی هەژمار", callback_data: "MENU_ACCOUNTS_LIST" },
      ],
      [{ text: "کڕینی هەژمار", callback_data: "MENU_BUY_ACCOUNT" }],
      [{ text: " بەشی سەپۆڕت", callback_data: "MENU_SUPPORT" }],
    ],
  },

  accountsList: {
    inline_keyboard: [
      [
        { text: "🥇 1-Step Challenge", callback_data: "INFO_1STEP" },
        { text: "🥈 2-Step Challenge", callback_data: "INFO_2STEP" },
      ],
      [
        { text: "🔥 Phoenix Challenge", callback_data: "INFO_PHOENIX" },
        { text: "⚡ Instant Funding", callback_data: "INFO_INSTANT" },
      ],
      [{ text: "⚡✨ Instant Pro", callback_data: "INFO_INSTANT_PRO" }],
      [{ text: "⬅️ گەڕانەوە بۆ سەرەکی", callback_data: "BACK_MAIN" }],
    ],
  },

  backToAccountsList: {
    inline_keyboard: [
      [
        {
          text: "⬅️ گەڕانەوە بۆ لیستی هەژمارەکان",
          callback_data: "MENU_ACCOUNTS_LIST",
        },
      ],
      [{ text: "🏠 سەرەکی", callback_data: "BACK_MAIN" }],
    ],
  },

  buyAccountTypes: {
    inline_keyboard: [
      [
        { text: "🥇 1-Step Challenge", callback_data: "BUY_1STEP" },
        { text: "🥈 2-Step Challenge", callback_data: "BUY_2STEP" },
      ],
      [
        { text: "🔥 Phoenix Challenge", callback_data: "BUY_PHOENIX" },
        { text: "⚡ Instant Funding", callback_data: "BUY_INSTANT" },
      ],
      [{ text: "⚡✨ Instant Pro", callback_data: "BUY_INSTANT_PRO" }],
      [{ text: "⬅️ گەڕانەوە بۆ سەرەکی", callback_data: "BACK_MAIN" }],
    ],
  },

  proceedToTerms: Object.fromEntries(
    ["1STEP", "2STEP", "PHOENIX", "INSTANT", "INSTANT_PRO"].map((t) => [
      t,
      {
        inline_keyboard: [
          [
            { text: "کڕینی ئەم هەژمارە", callback_data: `TERMS_${t}` },
            { text: "⬅️ گەڕانەوە", callback_data: "MENU_BUY_ACCOUNT" },
          ],
        ],
      },
    ]),
  ),

  termsAgree: Object.fromEntries(
    ["1STEP", "2STEP", "PHOENIX", "INSTANT", "INSTANT_PRO"].map((t) => [
      t,
      {
        inline_keyboard: [
          [
            { text: "✅ ڕازیم - بەردەوام بە", callback_data: `AGREE_${t}` },
            { text: "❌ ناڕازیم - گەڕانەوە", callback_data: "DISAGREE" },
          ],
        ],
      },
    ]),
  ),

  // Back to main only (used by info pages & error messages)
  backToMain: {
    inline_keyboard: [
      [{ text: "⬅️ گەڕانەوە بۆ سەرەکی", callback_data: "BACK_MAIN" }],
    ],
  },

  // Back to main + open account link (used after successful purchase)
  purchaseSuccess: (accountType, url) => ({
    inline_keyboard: [
      [{ text: `🔗 کردنەوەی هەژماری ${accountType}`, url }],
      [{ text: "⬅️ گەڕانەوە بۆ سەرەکی", callback_data: "BACK_MAIN" }],
    ],
  }),
};

// ============================================================================
// SUPABASE HELPERS
// ============================================================================
const db = {
  getUserInfo: async (telegramId) => {
    const { data, error } = await supabase
      .from("account_purchases")
      .select("name, phone, email")
      .eq("telegram_id", telegramId)
      .limit(1)
      .single();
    return error || !data ? null : data;
  },

  getUserInfoAndDuplicate: async (
    telegramId,
    accountType,
    newUserInfo = null,
  ) => {
    const { data, error } = await supabase
      .from("account_purchases")
      .select("id, name, phone, email, account_type")
      .eq("telegram_id", telegramId);

    if (error || !data || data.length === 0) {
      return { exactDuplicate: false, existingInfo: null, existingRow: null };
    }

    const sameTypeRow = data.find((row) => row.account_type === accountType);
    const existingInfo = data[0];

    if (sameTypeRow && newUserInfo) {
      const isExactMatch =
        sameTypeRow.name.toLowerCase() === newUserInfo.name.toLowerCase() &&
        sameTypeRow.phone.replace(/[\s\-().]/g, "") ===
          newUserInfo.phone.replace(/[\s\-().]/g, "") &&
        sameTypeRow.email.toLowerCase() === newUserInfo.email.toLowerCase();

      if (isExactMatch) {
        return { exactDuplicate: true, existingInfo, existingRow: sameTypeRow };
      }
    }

    return { exactDuplicate: false, existingInfo, existingRow: sameTypeRow };
  },

  updateCreatedAt: async (rowId) => {
    const { error } = await supabase
      .from("account_purchases")
      .update({ created_at: new Date().toISOString() })
      .eq("id", rowId);
    return !error;
  },

  savePurchase: async ({ telegramId, name, phone, email, accountType }) => {
    const { error } = await supabase.from("account_purchases").insert([
      {
        telegram_id: telegramId,
        name,
        phone,
        email,
        account_type: accountType,
        created_at: new Date().toISOString(),
      },
    ]);
    return !error;
  },
};

// ============================================================================
// HELPERS
// ============================================================================
const sendTermsPdf = async (ctx) => {
  if (ASSETS.termsPdfExists) {
    try {
      await ctx.replyWithDocument(new InputFile(ASSETS_PATH.termsPdf), {
        caption: "📄 یاسا و مەرجەکانی هەژماری فەند",
      });
    } catch (err) {
      console.error("Error sending terms PDF:", err);
    }
  }
};

let cachedLogoFileId = null;

// ============================================================================
// CORE: Send moneta.png as cover photo with text as caption (or fallback)
// ============================================================================
const sendPhotoWithText = async (
  ctx,
  text,
  parseMode = "Markdown",
  replyMarkup = null,
) => {
  const MAX_CAPTION = 1024;
  const options = { parse_mode: parseMode };
  if (replyMarkup) options.reply_markup = replyMarkup;

  const sendPhoto = async (extraOpts = {}) => {
    if (cachedLogoFileId) {
      return await ctx.replyWithPhoto(cachedLogoFileId, extraOpts);
    } else {
      const msg = await ctx.replyWithPhoto(
        new InputFile(ASSETS_PATH.logo),
        extraOpts,
      );
      const photos = msg.photo;
      if (photos && photos.length > 0) {
        cachedLogoFileId = photos[photos.length - 1].file_id;
      }
      return msg;
    }
  };

  if (!ASSETS.logoExists) {
    await ctx.reply(text, options).catch(() => {});
    return;
  }

  if (text.length <= MAX_CAPTION) {
    try {
      await sendPhoto({ caption: text, ...options });
    } catch (err) {
      console.error("sendPhotoWithText (caption) failed:", err);
      try {
        await sendPhoto();
        await ctx.reply(text, options);
      } catch (e) {
        console.error("sendPhotoWithText fallback failed:", e);
        await ctx.reply(text, options).catch(() => {});
      }
    }
  } else {
    try {
      await sendPhoto();
      await ctx.reply(text, options);
    } catch (err) {
      console.error("sendPhotoWithText (long text) failed:", err);
      await ctx.reply(text, options).catch(() => {});
    }
  }
};

const sendMainMenu = async (ctx) => {
  try {
    if (ASSETS.logoExists) {
      if (cachedLogoFileId) {
        await ctx.replyWithPhoto(cachedLogoFileId, {
          parse_mode: "Markdown",
          reply_markup: MENUS.main,
        });
      } else {
        const msg = await ctx.replyWithPhoto(new InputFile(ASSETS_PATH.logo), {
          parse_mode: "Markdown",
          reply_markup: MENUS.main,
        });
        const photos = msg.photo;
        if (photos && photos.length > 0) {
          cachedLogoFileId = photos[photos.length - 1].file_id;
        }
      }
    } else {
      await ctx.reply("🏠 *مەنیوی سەرەکی*", {
        parse_mode: "Markdown",
        reply_markup: MENUS.main,
      });
    }
  } catch (error) {
    console.error("Error in sendMainMenu:", error);
    try {
      await ctx.reply("🏠 *مەنیوی سەرەکی*", {
        parse_mode: "Markdown",
        reply_markup: MENUS.main,
      });
    } catch (fallbackError) {
      console.error("Fallback menu also failed:", fallbackError);
    }
  }
};

// Helper: show photo+text with a back-to-main button — does NOT send main menu automatically
const replyWithBackButton = async (ctx, text, parseMode = "Markdown") => {
  await sendPhotoWithText(ctx, text, parseMode, MENUS.backToMain);
};

// ============================================================================
// BUY ACCOUNT FLOW
// ============================================================================
const buyAccount = {
  showTypes: async (ctx) => {
    try {
      await sendPhotoWithText(
        ctx,
        "🛒 *کڕینی هەژمار*\n\nجۆری هەژمارەکەت هەڵبژێرە:",
        "Markdown",
        MENUS.buyAccountTypes,
      );
    } catch (error) {
      console.error("Error in showTypes:", error);
      await ctx
        .reply("🛒 *کڕینی هەژمار*\n\nجۆری هەژمارەکەت هەڵبژێرە:", {
          parse_mode: "Markdown",
          reply_markup: MENUS.buyAccountTypes,
        })
        .catch(() => {});
    }
  },

  showAccountInfo: async (ctx, accountType) => {
    const infoText = ACCOUNT_INFO[accountType];
    if (!infoText) return;
    await sendPhotoWithText(
      ctx,
      infoText,
      "Markdown",
      MENUS.proceedToTerms[accountType],
    );
  },

  showTerms: async (ctx, accountType) => {
    await sendTermsPdf(ctx);
    await sendPhotoWithText(
      ctx,
      TERMS_TEXT,
      "Markdown",
      MENUS.termsAgree[accountType],
    );
  },

  handleDisagreed: async (ctx) => {
    await sendPhotoWithText(
      ctx,
      "❌ ناڕازی بوویت بە مەرجەکان.\n\nئەگەر دواتر بیرت گەڕایەوە، دەتوانیت دووبارە هەوڵ بدەیت.",
      "Markdown",
      MENUS.backToMain,
    );
  },

  handleAgreed: async (ctx, accountType) => {
    const userId = ctx.from.id;

    const { data: existingRows, error } = await supabase
      .from("account_purchases")
      .select("id, name, phone, email, account_type")
      .eq("telegram_id", userId);

    const allRows = !error && existingRows ? existingRows : [];
    const sameTypeRow = allRows.find((r) => r.account_type === accountType);
    const anyRow = allRows[0] || null;

    if (anyRow) {
      state.buyAccountSessions.set(userId, {
        step: "CONFIRMED",
        accountType,
        prefilled: {
          name: anyRow.name,
          phone: anyRow.phone,
          email: anyRow.email,
        },
        sameTypeRow: sameTypeRow || null,
      });
      await buyAccount.processOrder(ctx, accountType, {
        name: anyRow.name,
        phone: anyRow.phone,
        email: anyRow.email,
      });
      return;
    }

    state.buyAccountSessions.set(userId, {
      step: "NAME",
      accountType,
      sameTypeRow: null,
    });
    await ctx.reply(
      `✅ هەژماری *${accountType}* هەڵبژاردیت.\n\n📝 تکایە ناوی تەواوت بنووسە:`,
      { parse_mode: "Markdown" },
    );
  },

  handleTextInput: async (ctx) => {
    const userId = ctx.from.id;
    const session = state.buyAccountSessions.get(userId);
    if (!session) return false;

    const text = ctx.message.text.trim();

    if (session.step === "NAME") {
      if (!text || text.length < 2) {
        await ctx.reply("⚠️ تکایە ناوێکی دروست بنووسە (کەمەکەم 2 پیت):");
        return true;
      }
      if (/\d/.test(text)) {
        await ctx.reply(
          "⚠️ ناو نابێت ژمارە تێدا بێت. تکایە ناوی دروست بنووسە:",
        );
        return true;
      }
      session.name = text;
      session.step = "PHONE";
      await ctx.reply(
        "📞 ژمارە تەلەفۆنەکەت بنووسە:\n_(تەنها ژمارەی تەلەفۆن قبوول دەکرێت، نموونە: +9647701234567)_",
        { parse_mode: "Markdown" },
      );
      return true;
    }

    if (session.step === "PHONE") {
      if (!validate.phone(text)) {
        await ctx.reply(
          "⚠️ ژمارەی تەلەفۆن دروست نیە. تکایە ژمارەیەکی دروست بنووسە:\n_(نموونە: +9647701234567 یان 07701234567)_",
          { parse_mode: "Markdown" },
        );
        return true;
      }
      session.phone = text;
      session.step = "EMAIL";
      await ctx.reply(
        "📧 ئیمەیڵەکەت بنووسە (Gmail):\n_(تەنها ئادرەسی @gmail.com قبوول دەکرێت)_",
        { parse_mode: "Markdown" },
      );
      return true;
    }

    if (session.step === "EMAIL") {
      if (!validate.gmail(text)) {
        await ctx.reply(
          "⚠️ ئیمەیڵەکەت دروست نیە. تکایە ئادرەسێکی Gmail بنووسە:\n_(نموونە: yourname@gmail.com)_",
          { parse_mode: "Markdown" },
        );
        return true;
      }
      session.email = text;
      const { accountType, sameTypeRow } = session;
      state.buyAccountSessions.delete(userId);
      await buyAccount.processOrder(
        ctx,
        accountType,
        { name: session.name, phone: session.phone, email: session.email },
        sameTypeRow,
      );
      return true;
    }

    return false;
  },
  processOrder: async (ctx, accountType, userInfo, sameTypeRow = null) => {
    const userId = ctx.from.id;

    if (!sameTypeRow) {
      const session = state.buyAccountSessions.get(userId);
      sameTypeRow = session?.sameTypeRow || null;
      if (session?.step === "CONFIRMED") {
        state.buyAccountSessions.delete(userId);
      }
    }

    const url = CONFIG.accountUrls[accountType] || "#";
    const keyboard = MENUS.purchaseSuccess(accountType, url);

    if (sameTypeRow) {
      const isExactMatch =
        sameTypeRow.name.toLowerCase().trim() ===
          userInfo.name.toLowerCase().trim() &&
        sameTypeRow.phone.replace(/[\s\-().]/g, "") ===
          userInfo.phone.replace(/[\s\-().]/g, "") &&
        sameTypeRow.email.toLowerCase().trim() ===
          userInfo.email.toLowerCase().trim();

      if (isExactMatch) {
        await db.updateCreatedAt(sameTypeRow.id);
        await sendPhotoWithText(
          ctx,
          `🔄 *زانیاریەکانت پێشتر تۆمار کراون!*\n\n` +
            `👤 ناو: ${userInfo.name}\n` +
            `📞 تەلەفۆن: ${userInfo.phone}\n` +
            `📧 ئیمەیڵ: ${userInfo.email}\n` +
            `💼 جۆری هەژمار: *${accountType}*\n\n` +
            `⏱ بەرواری کڕین نوێکرایەوە.\n\n` +
            `کرتە لە دوگمەی خوارەوە بکە بۆ کردنەوەی هەژمارەکەت:`,
          "Markdown",
          keyboard,
        );
        return;
      }
    }

    const saved = await db.savePurchase({
      telegramId: userId,
      name: userInfo.name,
      phone: userInfo.phone,
      email: userInfo.email,
      accountType,
    });

    if (!saved) {
      await sendPhotoWithText(
        ctx,
        "❌ هەڵە ڕووی دا لە کاتی هەڵگرتنی زانیاری. تکایە دواتر هەوڵ بدەرەوە.",
        "Markdown",
        MENUS.backToMain,
      );
      return;
    }

    await sendPhotoWithText(
      ctx,
      `🎉 *زانیاریەکانت تۆمار کران!*\n\n` +
        `👤 ناو: ${userInfo.name}\n` +
        `📞 تەلەفۆن: ${userInfo.phone}\n` +
        `📧 ئیمەیڵ: ${userInfo.email}\n` +
        `💼 جۆری هەژمار: *${accountType}*\n\n` +
        `کرتە لە دوگمەی خوارەوە بکە بۆ کردنەوەی هەژمارەکەت:`,
      "Markdown",
      keyboard,
    );
  },
};

// ============================================================================
// BOT COMMANDS
// ============================================================================
bot.api.setMyCommands([{ command: "start", description: "Start the bot" }]);
bot.command("start", sendMainMenu);

// ============================================================================
// CALLBACK QUERY HANDLER
// ============================================================================
const callbackHandlers = {
  BACK_MAIN: sendMainMenu,

  MENU_ACCOUNTS_LIST: async (ctx) => {
    await sendPhotoWithText(
      ctx,
      "📋 *هەژماری فەند*\n\nجۆری هەژمارەکەت هەڵبژێرە بۆ زانیاری زیاتر:",
      "Markdown",
      MENUS.accountsList,
    );
  },

  MENU_BUY_ACCOUNT: buyAccount.showTypes,

  BUY_1STEP: (ctx) => buyAccount.showAccountInfo(ctx, "1STEP"),
  BUY_2STEP: (ctx) => buyAccount.showAccountInfo(ctx, "2STEP"),
  BUY_PHOENIX: (ctx) => buyAccount.showAccountInfo(ctx, "PHOENIX"),
  BUY_INSTANT: (ctx) => buyAccount.showAccountInfo(ctx, "INSTANT"),
  BUY_INSTANT_PRO: (ctx) => buyAccount.showAccountInfo(ctx, "INSTANT_PRO"),

  MENU_SUPPORT: async (ctx) => {
    const keyboard = new InlineKeyboard()
      .url("📞 پەیوەندی بە پشتگیری", SUPPORT_URL)
      .row()
      .text("⬅️ گەڕانەوە بۆ سەرەکی", "BACK_MAIN");

    await sendPhotoWithText(
      ctx,
      `🤝 *پشتگیری مۆنیتا فەندد*\n\n` +
        `ئەگەر پرسیارت هەیە یان کێشەیەکت هەیە، تیمی پشتگیریمان ئامادەیە یارمەتیت بدات.\n\n` +
        `⏰ کاتی کار: ٢٤/٧\n\n` +
        `کرتە لە دوگمەی خوارەوە بکە بۆ پەیوەندی کردن:`,
      "Markdown",
      keyboard,
    );
  },

  MENU_ABOUT_Fund: (ctx) =>
    replyWithBackButton(
      ctx,
      "ℹ️ *مۆنیتا فەندد چییە؟*\n\nمۆنیتا فەندد کۆمپانیایەکی بازرگانی تایبەتمەندە کە خاوەنی چەندین خەڵاتی نێودەوڵەتییە لەلایەن مۆنیتا مارکێتەوە پشتگیری دەکرێت کە خاوەنی ئەزموونی زیاتر لە دە ساڵە لە بازاڕە داراییەکان و پێشەنگە.",
    ),

  MENU_FUND_SERVICES: (ctx) =>
    replyWithBackButton(
      ctx,
      `📊 *هەژماری فەند چیە؟*\n\nهەژمارێکی بازرگانیە کە کۆمپانیای مۆنێتافەندد سەرمایەیی خۆیی هاوبەشی پێدەکات لەگەڵ ترەیدەر بۆ ئەوەی لە بازاڕەداراییەکان ترەید بکات، ئەگەر ترەیدەر قانزاج بکات ئەوە قانزاجەکە دابەش دەکرێت لە نێوانیاندا بە ڕێژەیەکی دیاریکراو.\n\n*هەژماری فەند چۆن کار دەکات؟*\n\nکارکردنی هەژماری فەند لە مۆنێتافەندد بە دوو شێوازە:\n\n١) هەژماری (1step & 2step Challenge) تاقیکردنەوە: لەم جۆرە هەژمارەدا ترەیدەر تاقیکردنەوە دەکات لەسەر هەژمارێکی دیاریکراو بەپێی ڕێنمایی و یاساکانی کۆمپانیا.\n\n٢) هەژماری فەرمی (instant & phoenix): لەم جۆرە هەژمارەدا ترەیدەر تاقیکردنەوە ناکات بەڵکو ڕاستەوخۆ لەسەر هەژماری فەرمی مامەڵە دەکات.`,
    ),

  MENU_FUND_ADVANTAGE: (ctx) =>
    replyWithBackButton(
      ctx,
      `💡 *سوودی هەژماری فەند چیە؟*\n\n١) دەتوانیت بە سەرماییەکی گەورەتر و پارەیەکی زۆرتر مامەڵە بکەیت.\n\n٢) مەترسی لە دەست دانی سەرمایە و پارەی خۆت کەمترە.\n\n٣) بە بڕە پارەیەکی کەمتر دەتوانی سوودمەند بیت.`,
    ),

  MENU_FUND_RULS: (ctx) =>
    replyWithBackButton(
      ctx,
      `📜 *مەرجەکانی سوودمەند بوون لە هەژماری فەند چیە؟*\n\nمەرجی سوودمەند بوون لە هەژماری فەند ڕەزامەندی تەواوە لەسەر یاسا و مەرج و ڕێنمایی هەر جۆرە هەژمارێکی فەند. بەژداربوو پێویستە سەرجەم ڕێنمایی و یاساکان بخوێنێتەوە و ڕەزامەندی تەواو بدات.`,
    ),

  MENU_FUND_DIFFRENT: (ctx) =>
    replyWithBackButton(
      ctx,
      `⚖️ *جیاوازی هەژماری فەندو ئەکاونتی ڕاستەقینە چیە؟*\n\n🏦 *هەژماری فەند:*\nپارەو سەرمایەکە هی کۆمپانیاکەیەو تۆ تەنها ترەید دەکەیت و قازانج دابەش دەکرێت ٪٨٨ بۆخۆت و ٪١٢ بۆ کۆمپانیا.\nئازادی تەواوت نیە لە ترەیدکردندا.\nدەتوانیت بەپارەی گەورەتر ترەیدبکەیت بێ ئەوەی پارەی زۆرت هەبێت.\n\n💰 *ئەکاونتی ڕاستەقینە:*\nپارەکە هی خۆتەو هەمووقانزانجەکە ٪١٠٠ بۆخۆتە.\nئازادی تەواو لەمامەڵەکردن.\nمەترسی زۆرە بۆسەرمایەی خۆت.`,
    ),

  MENU_VIDEO_COURSE: async (ctx) => {
    const videoText =
      `🎬 *فێرکاری ڤیدیۆ*\n\n` +
      `📹 فێرکاری: چۆنییەتی دروستکردنی هەژمار لە مۆنێتافەندد\n` +
      `https://youtube.com/shorts/JyZyHvg6hLs?si=o-m05GZtjJZn1uku\n\n` +
      `📹 فێرکاری: چۆنیەتی کڕینی ئەکاونت لە مۆنێتافەندد\n` +
      `https://youtube.com/shorts/G8i5qC75gs8?si=sU2qZeufImgbzbZn\n\n` +
      `📹 فێرکاری: چۆنییەتی کردنەوەی هەژمارەکەمان لە مۆنێتافەندد\n` +
      `https://youtube.com/shorts/PoRdgboJIBI?si=YqEPzPSoDQSYAsvX\n\n` +
      `📹 فێرکاری: چۆنێتی KYC کردن لە مۆنێتا فەندد\n` +
      `https://youtube.com/shorts/hmTbmz4BqCg?si=fa0e9Cpvw24oD4Br`;

    await sendPhotoWithText(ctx, videoText, "Markdown", MENUS.backToMain);
  },

  MENU_FUND_TERMS: async (ctx) => {
    await sendTermsPdf(ctx);
    // PDF is sent, show a back button message instead of re-sending the full main menu
    await sendPhotoWithText(
      ctx,
      "📋 *مەرج و ڕێنماییەکان*\n\nFull PDF سەرەوە نێردراوە. تکایە بیخوێنەرەوە.",
      "Markdown",
      MENUS.backToMain,
    );
  },

  MENU_FUND_LAWS: (ctx) =>
    replyWithBackButton(
      ctx,
      `یاسا گشتیەکان | General Rules

1. یاسای زەرەری ڕۆژانە (Daily Drawdown):
   لەکاتی مامەڵەکردنی ڕۆژانەدا زۆرترین زەرەری ڕۆژانە بە پشت بەستن بە Equity (ئەنجامی مامەڵە داخراوەکان + مامەڵەی ئێستا) هەژمار دەکرێت.

* Instant / Phoenix / 1-Step Challenge: نابێت لە 3% زیاتربێت لەسەر باڵانسی سەرەکی.
* 2-Step Challenge: نابێت لە 4% زیاتربێت لەسەر باڵانسی سەرەکی.

2. یاسای زەرەری گشتی (Max Drawdown):

* Instant / Phoenix / 1-Step: 6% لەسەر باڵانسی سەرەکی.
* 2-Step Challenge: 10% لەسەر باڵانسی سەرەکی.
  گەیشتن بەو ڕێژانە واتە سەرپێچی لە یاساکان.

3. Profit Target (ئامانجی قازانج):

* 1-Step Challenge: 12%
* 2-Step Challenge:
  Phase 1: 5%
  Phase 2: 10%
* Phoenix: 10%

4. Minimum Profit Days (کەمترین ڕۆژی قازانج):
   بۆ سەرجەم هەژمارەکانی Fund (Challenge و Phoenix):

* پێویستە لانیکەم 3 ڕۆژ قازانج بەدەست بهێنرێت.
* لە هەر ڕۆژێکدا دەبێت لانیکەم 0.5% لە قەبارەی ئەکاونتەکە گەشە بکرێت.

5. Inactivity Rule (یاسای ناچالاکی):
   ئەگەر ترەیدەر بۆ ماوەی 30 ڕۆژ هیچ مامەڵەیەک ئەنجام نەدات، کۆمپانیا مافی هەیە ئەکاونتەکەی باند بکات.

6. News Trading:
   5 دەقە پێش هەواڵی بەهێز و 5 دەقە دوای هەواڵی بەهێز مامەڵەکردن ڕێگەپێنەدراوە.

7. Profit Split:
   88% لە قازانج بۆ ترەیدەر دەگەڕێتەوە.

8. Payout:
   هەر 14 ڕۆژ جارێک ترەیدەر دەتوانێت داوای پارە ڕاکێشانەوە بکات.

9. Risk Per Trade (یاسای مەترسی لە هەر مامەڵەیەکدا):

بۆ هەژمارەکانی:

* 1-Step Challenge
* 2-Step Challenge

لە قۆناغی Challenge هیچ یاسایەکی تایبەت بە مەترسی (Risk) بۆ تاکە مامەڵەیەک بوونی نییە و ترەیدەر بە ئازادی دەتوانێت مامەڵە بکات.

بۆ قۆناغی Fund:

* 2-Step Challenge:
  نابێت کۆی گشتی هەموو مامەڵەکانت لە یەک کاتدا زیاتر لە 3% لە مەترسی دابنرێت.

* 1-Step Challenge / Instant Standard / Instant Pro / Phoenix:
  نابێت کۆی گشتی هەموو مامەڵەکانت لە یەک کاتدا زیاتر لە 2% لە مەترسی دابنرێت.

ئەگەر ئەم یاسایە پێشێل بکرێت:

* جاری یەکەم:
  هەموو مامەڵەکانت دادەخرێنەوە و هەژمارەکەت بۆ ئەو ڕۆژە وەستێنراو دەبێت و تا ڕۆژی داهاتوو ناتوانیت مامەڵە بکەیت.

* جاری دووەم:
  نابێت کۆی گشتی مەترسی مامەڵەکانت لە یەک کاتدا زیاتر لە 1.5% بێت، ئەگەرنا هەژمارەکەت لەدەست دەدەیت.

10. Static & Trailing Drawdown:

Static چییە؟
واتە Max Loss جێگیرە و هەر قازانجێک بەدەست بێت لە جێگەی خۆیدا دەمێنێتەوە و Max Loss ناگۆڕدرێت.

Trailing چییە؟
واتە Max Loss جێگیر نییە، لەگەڵ زیادبوونی قازانج بەرز دەبێتەوە، بەڵام ئەگەر قازانجەکان لەدەست بدرێن دواتر دابەزین ناکات.

هەژمارەکانی Static:

* 1-Step Challenge
* 2-Step Challenge
* Phoenix

هەژمارەکانی Trailing:

* Instant Standard
* Instant Pro`,
    ),
};

// ============================================================================
// CALLBACK QUERY HANDLER
// ============================================================================
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  try {
    await ctx.answerCallbackQuery();
  } catch (e) {
    console.warn(
      "answerCallbackQuery failed (query expired):",
      e.description || e.message,
    );
  }

  try {
    if (data.startsWith("TERMS_")) {
      await buyAccount.showTerms(ctx, data.slice(6));
      return;
    }
    if (data.startsWith("AGREE_")) {
      await buyAccount.handleAgreed(ctx, data.slice(6));
      return;
    }
    if (data.startsWith("INFO_")) {
      const accountType = data.slice(5);
      const infoText = ACCOUNT_INFO[accountType];
      if (infoText) {
        await sendPhotoWithText(
          ctx,
          infoText,
          "Markdown",
          MENUS.backToAccountsList,
        );
        if (ASSETS.termsPdfExists) {
          await ctx.replyWithDocument(new InputFile(ASSETS_PATH.termsPdf), {
            caption: "📄 یاسا و مەرجەکان",
          });
        }
      }
      return;
    }
    if (data.startsWith("BUY_")) {
      const accountType = data.slice(4);
      await buyAccount.showAccountInfo(ctx, accountType);
      return;
    }
    if (data === "DISAGREE") {
      await buyAccount.handleDisagreed(ctx);
      return;
    }

    const handler = callbackHandlers[data];
    if (handler) await handler(ctx);
  } catch (error) {
    console.error("Error handling callback query:", error);
    ctx.reply("حاڵا نەتوانرا. تکایە دواتر هەوڵ بدەرەوە.").catch(() => {});
  }
});

// ============================================================================
// TEXT MESSAGE HANDLER
// ============================================================================
bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  const handled = await buyAccount.handleTextInput(ctx);
  if (!handled) await sendMainMenu(ctx);
});

// ============================================================================
// ERROR HANDLER
// ============================================================================
bot.catch((err) => {
  console.error(
    `Error while handling update ${err.ctx.update.update_id}:`,
    err.error,
  );
});

// ============================================================================
// SHUTDOWN
// ============================================================================
function gracefulShutdown() {
  console.log("🛑 Bot is shutting down...");
  bot.stop();
  console.log("✅ Bot stopped gracefully");
  process.exit(0);
}

process.once("SIGINT", gracefulShutdown);
process.once("SIGTERM", gracefulShutdown);

// ============================================================================
// START BOT
// ============================================================================
function startBot() {
  console.log("🤖 Bot starting...");
  console.log(`BOT_TOKEN: ${CONFIG.botToken ? "✅ Set" : "❌ Missing"}`);
  console.log(
    `SUPABASE_URL: ${process.env.SUPABASE_URL ? "✅ Set" : "❌ Missing"}`,
  );
  bot.start();
  console.log("✅ Bot started successfully");
}

module.exports = { startBot };
