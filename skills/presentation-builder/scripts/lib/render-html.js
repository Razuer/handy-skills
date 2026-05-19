const fs = require('fs');
const path = require('path');
const seminar = require('./patterns/seminar');
const university = require('./patterns/university');
const keynote = require('./patterns/keynote');

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE_ROOT = path.resolve(SKILL_ROOT, 'assets', 'templates');

function escapeHtml(value) {
  return seminar.escapeHtml(value);
}

function scalar(value, fallback = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.en ?? value.pl ?? fallback;
  return value ?? fallback;
}

function labelText(value, fallback = '') {
  return String(scalar(value, fallback)).replace(/\*/g, '');
}

function normalize(deck) {
  const slides = deck.slides || [];
  const total = slides.length;
  return {
    ...deck,
    template: deck.template || 'seminar',
    metadata: deck.metadata || {},
    theme: deck.theme || {},
    language: deck.language || deck.metadata?.language || {},
    slides: slides.map((slide, index) => {
      const ordinal = slide.ordinal || index + 1;
      const short = labelText(slide.shortTitle ?? slide.title ?? slide.pattern, slide.pattern);
      return {
        ...slide,
        ordinal,
        total,
        id: slide.id || `slide-${ordinal}`,
        pattern: slide.pattern || 'bullets',
        ordinalLabel: slide.ordinalLabel || slide.dataLabel || `${String(ordinal).padStart(2, '0')} ${short}`,
      };
    }),
  };
}

function readShell(template) {
  const shell = path.join(TEMPLATE_ROOT, template, `${template}-shell.html`);
  if (fs.existsSync(shell)) return fs.readFileSync(shell, 'utf8');
  const fallback = path.join(TEMPLATE_ROOT, template, `${template}-template.html`);
  if (!fs.existsSync(fallback)) throw new Error(`Unknown presentation template: ${template}`);
  return materializeShellFromTemplate(fs.readFileSync(fallback, 'utf8'), template);
}

function materializeShellFromTemplate(html, template) {
  let out = html.replace(/<html lang="[^"]*">/, '<html lang="{{HTML_LANG}}">');
  out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>{{DOCUMENT_TITLE}}</title>');
  out = out.replace(/<script type="application\/json" id="speaker-notes">[\s\S]*?<\/script>/, '<script type="application/json" id="speaker-notes">\n{{SPEAKER_NOTES_JSON}}\n</script>');
  out = out.replace(/<deck-stage width="1920" height="1080">[\s\S]*?<\/deck-stage>/, '<deck-stage width="1920" height="1080">\n{{SLIDES_HTML}}\n</deck-stage>');
  if (template === 'university') {
    out = out.replace(/<body class="[^"]*">/, '<body class="{{BODY_CLASSES}}">');
    out = out.replace(/applyLang\('(?:en|pl)'\); \/\/ default; tweak panel will override/, "applyLang('{{INITIAL_LANG}}'); // default; tweak panel will override");
    out = out.replace(/const UNI_TWEAK_DEFAULTS = \/\*EDITMODE-BEGIN\*\/[\s\S]*?\/\*EDITMODE-END\*\//, 'const UNI_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{{TWEAK_DEFAULTS_JSON}}/*EDITMODE-END*/');
  } else if (template === 'keynote') {
    out = out.replace(/<body(?: class="[^"]*")?>/, '<body class="{{BODY_CLASSES}}">');
    out = out.replace(/const KEYNOTE_TWEAK_DEFAULTS = \/\*EDITMODE-BEGIN\*\/[\s\S]*?\/\*EDITMODE-END\*\//, 'const KEYNOTE_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{{TWEAK_DEFAULTS_JSON}}/*EDITMODE-END*/');
  } else {
    out = out.replace(/<body(?: class="[^"]*")?>/, '<body class="{{BODY_CLASSES}}">');
    out = out.replace(/const TWEAK_DEFAULTS = \/\*EDITMODE-BEGIN\*\/[\s\S]*?\/\*EDITMODE-END\*\//, 'const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{{TWEAK_DEFAULTS_JSON}}/*EDITMODE-END*/');
  }
  return out;
}

function seminarBodyClasses(theme) {
  return [theme.dark && 'dark', theme.density === 'compact' && 'compact', theme.density === 'spacious' && 'spacious', theme.titleStyle === 'action' && 'action-titles', theme.footer === false && 'no-footer', theme.codeTheme === 'light' && 'code-light', ...(theme.classes || [])].filter(Boolean).join(' ');
}

function universityBodyClasses(deck) {
  const theme = deck.theme || {};
  const language = deck.language?.default || deck.metadata?.language?.default || theme.lang || 'en';
  const showPartners = theme.partners === true || theme.showPartners === true;
  return [`lang-${language === 'pl' ? 'pl' : 'en'}`, theme.dark && 'dark', theme.density === 'compact' && 'compact', theme.density === 'spacious' && 'spacious', theme.footer === false && 'no-footer', !showPartners && 'no-partners', theme.bullets === 'square' && 'bullets-square', theme.bullets === 'dash' && 'bullets-dash', theme.codeTheme === 'light' && 'code-light', ...(theme.classes || [])].filter(Boolean).join(' ');
}

function keynoteBodyClasses(deck) {
  const theme = deck.theme || {};
  return [
    (theme.paper === true || theme.dark === false || theme.mode === 'paper' || theme.mode === 'light') && 'paper',
    theme.density === 'compact' && 'compact',
    theme.density === 'spacious' && 'spacious',
    theme.footer === false && 'no-footer',
    theme.italics === false && 'no-italics',
    ...(theme.classes || []),
  ].filter(Boolean).join(' ');
}

function tweakDefaults(deck) {
  const theme = deck.theme || {};
  if (deck.template === 'university') {
    const lang = deck.language?.default || deck.metadata?.language?.default || theme.lang || 'en';
    return {
      lang: lang === 'pl' ? 'pl' : 'en',
      red: theme.red || theme.pwrRed || '#9A342D',
      density: theme.density || 'regular',
      dark: !!theme.dark,
      footer: theme.footer !== false,
      showPartners: theme.partners === true || theme.showPartners === true,
      bullets: theme.bullets || 'diamond',
      codeTheme: theme.codeTheme || 'dark',
    };
  }
  if (deck.template === 'keynote') {
    return {
      accent: theme.accent || '#ff5836',
      paper: theme.paper === true || theme.dark === false || theme.mode === 'paper' || theme.mode === 'light',
      density: theme.density || 'regular',
      footer: theme.footer !== false,
      italics: theme.italics !== false,
    };
  }
  return {
    accent: theme.accent || '#2a5d8a',
    fontPair: theme.fontPair || 'plex',
    dark: !!theme.dark,
    density: theme.density || 'regular',
    footer: theme.footer !== false,
    titleStyle: theme.titleStyle || 'topic',
    codeTheme: theme.codeTheme || 'dark',
  };
}

const FONT_PAIR_CSS = {
  plex: {
    sans: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
    display: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  },
  grotesk: {
    sans: '"Space Grotesk", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    display: '"Space Grotesk", system-ui, sans-serif',
  },
  dm: {
    sans: '"DM Sans", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, Menlo, monospace',
    display: '"DM Sans", system-ui, sans-serif',
  },
  serif: {
    sans: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
    display: '"IBM Plex Serif", Georgia, serif',
  },
};

function safeColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '';
}

function staticThemeCss(deck, defaults) {
  const lines = [];
  if (deck.template === 'university') {
    const red = safeColor(defaults.red);
    if (red) lines.push(`--pwr-red: ${red};`);
  } else if (deck.template === 'keynote') {
    const accent = safeColor(defaults.accent);
    if (accent) lines.push(`--accent: ${accent};`);
  } else {
    const accent = safeColor(defaults.accent);
    if (accent) lines.push(`--accent: ${accent};`);
    const fonts = FONT_PAIR_CSS[defaults.fontPair] || FONT_PAIR_CSS.plex;
    lines.push(`--font-sans: ${fonts.sans};`);
    lines.push(`--font-mono: ${fonts.mono};`);
    lines.push(`--font-display: ${fonts.display};`);
  }
  const extra = [];
  if (deck.template === 'keynote') {
    extra.push('.pipeline { grid-template-columns: repeat(var(--pipeline-cols, 5), minmax(0, 1fr)); }');
    extra.push('.bars-row, .bar-labels { grid-template-columns: repeat(var(--bar-cols, 6), minmax(0, 1fr)); }');
    extra.push('.timeline { grid-template-columns: repeat(var(--timeline-cols, 6), minmax(0, 1fr)); }');
    extra.push('section.slide.qa .serif-em { color: #0f0e0c; }');
  }
  if (!lines.length && !extra.length) return '';
  const root = lines.length ? `\n  :root { ${lines.join(' ')} }` : '';
  return `<style id="generated-theme">${root}${extra.length ? `\n  ${extra.join('\n  ')}` : ''}\n</style>\n`;
}

function renderSlides(deck) {
  const mod = deck.template === 'university' ? university : (deck.template === 'keynote' ? keynote : seminar);
  return deck.slides.map((slide) => mod.renderSlide(slide, deck)).join('\n\n');
}

function fill(shell, replacements) {
  return Object.entries(replacements).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), shell);
}

function renderHtml(deck, options = {}) {
  const normalized = normalize(deck);
  const shell = options.shell || readShell(normalized.template);
  const defaults = tweakDefaults(normalized);
  const notes = normalized.slides.map((slide) => slide.notes ?? '');
  const notesJson = JSON.stringify(notes, null, 2).replace(/<\//g, '<\\/');
  const lang = normalized.template === 'university' ? defaults.lang : (normalized.language?.default || normalized.metadata?.language?.default || 'en');
  let html = fill(shell, {
    DOCUMENT_TITLE: escapeHtml(scalar(normalized.metadata.title ?? normalized.title, 'Presentation')),
    HTML_LANG: escapeHtml(lang),
    BODY_CLASSES: escapeHtml(normalized.template === 'university' ? universityBodyClasses(normalized) : (normalized.template === 'keynote' ? keynoteBodyClasses(normalized) : seminarBodyClasses(normalized.theme))),
    SPEAKER_NOTES_JSON: notesJson,
    SLIDES_HTML: renderSlides(normalized),
    TWEAK_DEFAULTS_JSON: JSON.stringify(defaults, null, 4),
    INITIAL_LANG: escapeHtml(lang),
  });
  const css = staticThemeCss(normalized, defaults);
  if (css) html = html.replace('</head>', `${css}</head>`);
  if (/{{[A-Z_]+}}/.test(html)) throw new Error('Generated HTML contains unresolved shell placeholders.');
  if (options.outFile) fs.writeFileSync(options.outFile, html);
  return html;
}

module.exports = { renderHtml, normalize, readShell, materializeShellFromTemplate, tweakDefaults };
