#!/usr/bin/env node
/*
 * Pawlock SEO build (çok dilli).
 *
 * index.html EN kaynak sayfadır. Bu script:
 *  1. EN sözlük değerlerini index.html'e geri basar (sözlük tek doğruluk kaynağı).
 *  2. Her dil için (tr, es, de, fr, pt) statik /{dil}/index.html üretir:
 *     metinler + alt'lar gömülü, dil başına anahtar-kelimeli title/description,
 *     canonical/og/locale, JSON-LD (uygulama + FAQPage), dil menüsünde aktiflik.
 *  3. sitemap.xml üretir.
 *
 * Kullanım: node website/build-i18n-pages.js
 * index.html veya js/i18n.js değiştikten sonra tekrar çalıştır.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE = "https://pawlock.app";

/* Dil başına SEO meta: Astro anahtar kelime araştırmasından
   (us: app blocker/screen time/app lock; de: app blocker/bildschirmzeit/app sperre;
    br: bloqueador/tempo de tela/foco; es-tr-fr: pazar karşılıkları). */
const META = {
  en: {
    title: "Pawlock — App Blocker & Screen Time Control for iPhone & Android",
    ogDesc: "Lock distracting apps and websites with Apple's Screen Time technology. Stop relying on willpower: build a system that actually holds.",
    ogLocale: "en_US", ogImage: "og.png",
    appDesc: "App blocker for iPhone and Android that locks distracting apps and websites with your phone's own system controls, with instant locks, automatic schedules and real usage statistics.",
  },
  tr: {
    title: "Pawlock — Uygulama Kilitleme ve Ekran Süresi Kontrolü | iPhone & Android",
    ogDesc: "Dikkat dağıtan uygulama ve siteleri Apple'ın Ekran Süresi teknolojisiyle kilitle. İradeye bel bağlama: gerçekten tutan bir sistem kur.",
    ogLocale: "tr_TR", ogImage: "og-tr.png",
    appDesc: "Dikkat dağıtan uygulama ve web sitelerini telefonunun kendi sistem denetimleriyle kilitleyen iPhone ve Android uygulaması: anında kilit, otomatik programlar ve gerçek kullanım istatistikleri.",
  },
  es: {
    title: "Pawlock — Bloqueador de Aplicaciones y Tiempo de Pantalla | iPhone & Android",
    ogDesc: "Bloquea las apps y sitios que te distraen con la tecnología Tiempo de uso de Apple. Deja de depender de la fuerza de voluntad: construye un sistema que aguanta.",
    ogLocale: "es_ES", ogImage: "og-es.png",
    appDesc: "Bloqueador de aplicaciones para iPhone y Android que bloquea apps y sitios web que distraen con los controles del propio sistema: bloqueos instantáneos, horarios automáticos y estadísticas reales.",
  },
  de: {
    title: "Pawlock — App Blocker & Bildschirmzeit-Kontrolle | iPhone & Android",
    ogDesc: "Sperre ablenkende Apps und Websites mit Apples Bildschirmzeit-Technologie. Verlass dich nicht auf Willenskraft: Bau ein System, das wirklich hält.",
    ogLocale: "de_DE", ogImage: "og-de.png",
    appDesc: "App Blocker für iPhone und Android, der ablenkende Apps und Websites mit den Systemfunktionen deines Telefons sperrt: Sofort-Sperren, automatische Zeitpläne und echte Nutzungsstatistiken.",
  },
  fr: {
    title: "Pawlock — Bloqueur d'Applications et Temps d'Écran | iPhone & Android",
    ogDesc: "Verrouille les apps et sites qui te distraient avec la technologie Temps d'écran d'Apple. Ne compte plus sur ta volonté : construis un système qui tient.",
    ogLocale: "fr_FR", ogImage: "og-fr.png",
    appDesc: "Bloqueur d'applications pour iPhone et Android qui verrouille les apps et sites distrayants avec les contrôles système du téléphone : verrouillages instantanés, horaires automatiques et vraies statistiques.",
  },
  pt: {
    title: "Pawlock — Bloqueador de Aplicativos e Tempo de Tela | iPhone & Android",
    ogDesc: "Bloqueie apps e sites que roubam sua atenção com a tecnologia Tempo de Uso da Apple. Pare de depender da força de vontade: monte um sistema que segura.",
    ogLocale: "pt_BR", ogImage: "og-pt.png",
    appDesc: "Bloqueador de aplicativos para iPhone e Android que bloqueia apps e sites que distraem com os controles do próprio sistema: bloqueios instantâneos, horários automáticos e estatísticas reais.",
  },
  ja: {
    title: "Pawlock — iPhone・Android のアプリブロッカー＆スクリーンタイム管理",
    ogDesc: "気を散らすアプリやサイトをAppleのスクリーンタイム技術でロック。意志の力に頼るのはもう終わり。ちゃんと続く仕組みを作ろう。",
    ogLocale: "ja_JP", ogImage: "og-ja.png",
    appDesc: "気を散らすアプリやウェブサイトを端末自身のシステム機能でロックする iPhone・Android 向けアプリブロッカー。即時ロック、自動スケジュール、実際の使用状況の統計。",
  },
  // For the languages below, ogDesc/appDesc fall back to the translated
  // meta.description / hero.sub in setHead(), so only the SEO title is bespoke.
  zh: { title: "Pawlock — iPhone 与 Android 应用锁与屏幕使用时间控制", ogLocale: "zh_CN", ogImage: "og-zh.png" },
  ko: { title: "Pawlock — iPhone·Android 앱 차단 및 스크린 타임 관리", ogLocale: "ko_KR", ogImage: "og-ko.png" },
  it: { title: "Pawlock — Blocco App e Controllo Tempo di Utilizzo | iPhone & Android", ogLocale: "it_IT", ogImage: "og-it.png" },
  ru: { title: "Pawlock — Блокировка приложений и контроль экранного времени | iPhone & Android", ogLocale: "ru_RU", ogImage: "og-ru.png" },
  ar: { title: "Pawlock — حظر التطبيقات والتحكم في وقت الشاشة | iPhone & Android", ogLocale: "ar_SA", ogImage: "og-ar.png" },
  nl: { title: "Pawlock — App Blocker & Schermtijd-beheer | iPhone & Android", ogLocale: "nl_NL", ogImage: "og-nl.png" },
  pl: { title: "Pawlock — Blokada aplikacji i kontrola czasu przed ekranem | iPhone & Android", ogLocale: "pl_PL", ogImage: "og-pl.png" },
  id: { title: "Pawlock — Pemblokir Aplikasi & Kontrol Waktu Layar | iPhone & Android", ogLocale: "id_ID", ogImage: "og-id.png" },
  th: { title: "Pawlock — แอปบล็อกแอปและควบคุมเวลาหน้าจอ | iPhone & Android", ogLocale: "th_TH", ogImage: "og-th.png" },
  vi: { title: "Pawlock — Chặn ứng dụng & Kiểm soát thời gian sử dụng | iPhone & Android", ogLocale: "vi_VN", ogImage: "og-vi.png" },
  sv: { title: "Pawlock — Appblockerare & Skärmtidskontroll | iPhone & Android", ogLocale: "sv_SE", ogImage: "og-sv.png" },
  da: { title: "Pawlock — App-blokering & Skærmtidsstyring | iPhone & Android", ogLocale: "da_DK", ogImage: "og-da.png" },
  nb: { title: "Pawlock — Appblokkering & Skjermtidskontroll | iPhone & Android", ogLocale: "nb_NO", ogImage: "og-nb.png" },
  fi: { title: "Pawlock — Sovellusten esto & Ruutuajan hallinta | iPhone & Android", ogLocale: "fi_FI", ogImage: "og-fi.png" },
  uk: { title: "Pawlock — Блокування додатків і контроль екранного часу | iPhone & Android", ogLocale: "uk_UA", ogImage: "og-uk.png" },
  el: { title: "Pawlock — Αποκλεισμός εφαρμογών & Έλεγχος χρόνου οθόνης | iPhone & Android", ogLocale: "el_GR", ogImage: "og-el.png" },
  cs: { title: "Pawlock — Blokování aplikací a správa času u obrazovky | iPhone & Android", ogLocale: "cs_CZ", ogImage: "og-cs.png" },
  ro: { title: "Pawlock — Blocare aplicații și control timp pe ecran | iPhone & Android", ogLocale: "ro_RO", ogImage: "og-ro.png" },
  hu: { title: "Pawlock — Appblokkoló és képernyőidő-kezelés | iPhone & Android", ogLocale: "hu_HU", ogImage: "og-hu.png" },
  sk: { title: "Pawlock — Blokovanie aplikácií a správa času pri obrazovke | iPhone & Android", ogLocale: "sk_SK", ogImage: "og-sk.png" },
  bg: { title: "Pawlock — Блокиране на приложения и контрол на екранното време | iPhone & Android", ogLocale: "bg_BG", ogImage: "og-bg.png" },
  hr: { title: "Pawlock — Blokiranje aplikacija i kontrola vremena pred ekranom | iPhone & Android", ogLocale: "hr_HR", ogImage: "og-hr.png" },
};
const RTL_LANGS = ["ar"];

/* i18n sözlüğünü yükle */
const i18nSrc = fs.readFileSync(path.join(ROOT, "js/i18n.js"), "utf8");
const sandbox = {};
new Function("exports", i18nSrc + "; exports.I18N = I18N; exports.LANGS = LANGS;")(sandbox);
const { I18N, LANGS } = sandbox;

/* Native (endonym) name + country flag for each language, used to render the
   language dropdown. The menu is sorted alphabetically by native name. */
const LANG_NATIVE = {
  en: "English", tr: "Türkçe", es: "Español", de: "Deutsch", fr: "Français",
  pt: "Português", ja: "日本語", zh: "简体中文", ko: "한국어", it: "Italiano",
  ru: "Русский", ar: "العربية", nl: "Nederlands", pl: "Polski",
  id: "Bahasa Indonesia", th: "ไทย", vi: "Tiếng Việt", sv: "Svenska",
  da: "Dansk", nb: "Norsk", fi: "Suomi", uk: "Українська", el: "Ελληνικά",
  cs: "Čeština", ro: "Română", hu: "Magyar", sk: "Slovenčina", bg: "Български",
  hr: "Hrvatski",
};
const LANG_FLAG = {
  en: "🇬🇧", tr: "🇹🇷", es: "🇪🇸", de: "🇩🇪", fr: "🇫🇷", pt: "🇵🇹", ja: "🇯🇵",
  zh: "🇨🇳", ko: "🇰🇷", it: "🇮🇹", ru: "🇷🇺", ar: "🇸🇦", nl: "🇳🇱", pl: "🇵🇱",
  id: "🇮🇩", th: "🇹🇭", vi: "🇻🇳", sv: "🇸🇪", da: "🇩🇰", nb: "🇳🇴", fi: "🇫🇮",
  uk: "🇺🇦", el: "🇬🇷", cs: "🇨🇿", ro: "🇷🇴", hu: "🇭🇺", sk: "🇸🇰", bg: "🇧🇬",
  hr: "🇭🇷",
};
const langHref = (l) => (l === "en" ? "/" : `/${l}/`);
// English name of each language, used only as the sort key so every language
// falls into a single A–Z list (native-name sorting would push non-Latin
// scripts like Bulgarian/Greek to the end).
const LANG_EN = {
  en: "English", tr: "Turkish", es: "Spanish", de: "German", fr: "French",
  pt: "Portuguese", ja: "Japanese", zh: "Chinese", ko: "Korean", it: "Italian",
  ru: "Russian", ar: "Arabic", nl: "Dutch", pl: "Polish", id: "Indonesian",
  th: "Thai", vi: "Vietnamese", sv: "Swedish", da: "Danish", nb: "Norwegian",
  fi: "Finnish", uk: "Ukrainian", el: "Greek", cs: "Czech", ro: "Romanian",
  hu: "Hungarian", sk: "Slovak", bg: "Bulgarian", hr: "Croatian",
};
const SORTED_LANGS = [...LANGS].sort((a, b) =>
  LANG_EN[a].localeCompare(LANG_EN[b], "en", { sensitivity: "base" })
);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

function bakeTexts(html, dict) {
  let missing = 0;
  html = html.replace(
    /(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g,
    (m, open, tag, key, _txt, close) => {
      const val = dict[key];
      if (val == null) { missing++; return m; }
      return open + esc(val) + close;
    }
  );
  html = html.replace(/alt="([^"]*)" data-i18n-alt="([^"]+)"/g, (m, _alt, key) => {
    const val = dict[key];
    return val ? `alt="${escAttr(val)}" data-i18n-alt="${key}"` : m;
  });
  if (missing) console.warn(`  UYARI: ${missing} anahtar sözlükte yok`);
  return html;
}

function faqLd(dict) {
  const items = [];
  for (let i = 1; i <= 6; i++) {
    const q = dict[`faq.q${i}`], a = dict[`faq.a${i}`];
    if (q && a) items.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } });
  }
  return `<script type="application/ld+json">\n  ${JSON.stringify(
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items }
  )}\n  </script>`;
}
const injectFaq = (html, dict) =>
  html.replace(/<!-- ld-faq -->[\s\S]*?<!-- \/ld-faq -->/, `<!-- ld-faq -->${faqLd(dict)}<!-- /ld-faq -->`);

function setHead(html, lang) {
  const m = META[lang];
  const url = lang === "en" ? `${SITE}/` : `${SITE}/${lang}/`;
  const others = LANGS.filter((l) => l !== lang).map((l) => META[l].ogLocale);
  const ogDesc = m.ogDesc || I18N[lang]["hero.sub"] || I18N[lang]["meta.description"];
  const htmlTag = `<html lang="${lang}"${RTL_LANGS.includes(lang) ? ' dir="rtl"' : ""} data-baked>`;
  const rep = [
    [/<html lang="[a-z]+"( dir="rtl")? data-baked>/, htmlTag],
    [/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`],
    [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(I18N[lang]["meta.description"])}">`],
    [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`],
    [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`],
    [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(m.title)}">`],
    [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(ogDesc)}">`],
    [/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${SITE}/assets/img/${m.ogImage}">`],
    [/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${m.ogLocale}">`],
    [/(<meta property="og:locale:alternate" content="[^"]*">\s*)+/, others.map((l) => `<meta property="og:locale:alternate" content="${l}">`).join("\n  ") + "\n  "],
  ];
  for (const [re, val] of rep) {
    if (!re.test(html)) { console.error("HEAD DESENİ BULUNAMADI:", re); process.exit(1); }
    html = html.replace(re, val);
  }
  /* JSON-LD uygulama açıklaması + url + inLanguage */
  html = html
    .replace(/"description": "[^"]*",\n    "image"/, `"description": ${JSON.stringify(m.appDesc || I18N[lang]["meta.description"])},\n    "image"`)
    .replace(/"inLanguage": \[[^\]]*\]/, `"inLanguage": ${JSON.stringify(LANGS)}`)
    .replace(/"url": "https:\/\/pawlock\.app\/[a-z]*\/?"\s*\n  \}/, `"url": ${JSON.stringify(url)}\n  }`);
  return html;
}

function setLangMenu(html, lang) {
  /* Rebuild the single-row flag bar, sorted alphabetically by native name,
     marking the active language. The native name is the hover/aria label. */
  const items = SORTED_LANGS.map((l) =>
    `<a href="${langHref(l)}" hreflang="${l}" data-lang-link="${l}"${l === lang ? ' class="active"' : ""} title="${LANG_NATIVE[l]}" aria-label="${LANG_NATIVE[l]}">${LANG_FLAG[l]}</a>`
  ).join("\n        ");
  html = html.replace(/<nav class="lang-bar"[^>]*>[\s\S]*?<\/nav>/,
    `<nav class="lang-bar" aria-label="Language">\n        ${items}\n      </nav>`);
  return html;
}

/* ---------- EN kaynağı: sözlük değerlerini geri bas + FAQ LD ---------- */
const enPath = path.join(ROOT, "index.html");
let en = fs.readFileSync(enPath, "utf8");
en = bakeTexts(en, I18N.en);
en = setHead(en, "en");
en = setLangMenu(en, "en");
en = injectFaq(en, I18N.en);
fs.writeFileSync(enPath, en);
console.log("index.html (en) güncellendi");

/* ---------- Diğer diller ---------- */
for (const lang of LANGS.filter((l) => l !== "en")) {
  let page = en;
  page = bakeTexts(page, I18N[lang]);
  page = setHead(page, lang);
  page = setLangMenu(page, lang);
  page = injectFaq(page, I18N[lang]);
  fs.mkdirSync(path.join(ROOT, lang), { recursive: true });
  fs.writeFileSync(path.join(ROOT, lang, "index.html"), page);
  console.log(`${lang}/index.html üretildi`);
}

/* ---------- sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
const langUrl = (l) => (l === "en" ? `${SITE}/` : `${SITE}/${l}/`);
const altBlock =
  LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${langUrl(l)}"/>`).join("\n") +
  `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`;
const urls = LANGS.map((l) => `  <url>\n    <loc>${langUrl(l)}</loc>\n    <lastmod>${today}</lastmod>\n${altBlock}\n  </url>`);
urls.push(`  <url>\n    <loc>${SITE}/privacy.html</loc>\n    <lastmod>${today}</lastmod>\n  </url>`);
urls.push(`  <url>\n    <loc>${SITE}/terms.html</loc>\n    <lastmod>${today}</lastmod>\n  </url>`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
console.log("sitemap.xml üretildi");
