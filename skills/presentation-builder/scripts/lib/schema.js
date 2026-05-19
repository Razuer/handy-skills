const KNOWN_TEMPLATES = new Set(["seminar", "university", "keynote"]);

const KNOWN_PATTERNS = new Set([
  "cover",
  "agenda",
  "section-divider",
  "definition",
  "bullets",
  "quote",
  "full-bleed",
  "pipeline",
  "comparison",
  "comparison-3col",
  "equation",
  "code",
  "big-number",
  "bar-chart",
  "table",
  "image-led",
  "image-grid",
  "contributions",
  "limitations",
  "timeline",
  "acknowledgements",
  "references",
  "qa",
  "appendix-divider",
]);

const CAPACITY_HINTS = {
  agenda: { items: 6 },
  bullets: { items: 6 },
  pipeline: { items: 5, steps: 5 },
  contributions: { items: 3 },
  limitations: { items: 4 },
  references: { items: 8 },
  comparison: { columns: 2, items: 2 },
  "comparison-3col": { columns: 3, items: 3 },
  table: { rows: 8, columns: 6 },
  "image-grid": { images: 6 },
};

const PATTERN_REQUIREMENTS = {
  cover: [],
  agenda: ["items"],
  "section-divider": ["title"],
  definition: ["body"],
  bullets: ["items"],
  table: ["columns", "rows"],
  contributions: ["items"],
  limitations: ["items"],
  references: ["items"],
  qa: [],
  "image-led": ["image"],
  "image-grid": ["images"],
};

class DeckValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`Deck validation failed:\n${list.map((e) => `- ${e}`).join("\n")}`);
    this.name = "DeckValidationError";
    this.errors = list;
  }
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isLocalizedString(value) {
  return isObject(value) && (Object.prototype.hasOwnProperty.call(value, "en") || Object.prototype.hasOwnProperty.call(value, "pl"));
}

function present(value) {
  return value !== undefined && value !== null && value !== "";
}

function textFor(value, fallbackLocale = "pl") {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (isLocalizedString(value)) return String(value[fallbackLocale] || value.en || value.pl || "");
  return "";
}

function addError(errors, sourcePath, slide, message) {
  const where = [`source: ${sourcePath || "<deck>"}`];
  if (slide && slide.id) where.push(`slide: ${slide.id}`);
  errors.push(`${where.join(", ")} - ${message}`);
}

function assertLocalizedCompleteness(errors, sourcePath, slide, value, fieldName, requiredLocales) {
  if (!isLocalizedString(value)) return;
  for (const locale of requiredLocales) {
    if (!present(value[locale])) addError(errors, sourcePath, slide, `${fieldName} is missing locale '${locale}'. Add ${fieldName}.${locale}.`);
  }
}

function validateCapacity(errors, sourcePath, slide, key, count, max) {
  if (slide.allowOverflowRisk) return;
  if (count > max) addError(errors, sourcePath, slide, `${slide.pattern}.${key} has ${count} entries; capacity hint is ${max}. Split the slide or set allowOverflowRisk: true.`);
}

function normalizeScript(script) {
  if (typeof script === "string") return { text: script };
  if (isObject(script)) return { ...script };
  return script;
}

function normalizeTheme(theme = {}) {
  const out = { ...theme };
  if (out.density === "normal") out.density = "regular";
  return out;
}

function validateTheme(errors, sourcePath, deck) {
  const theme = deck.theme || {};
  const densityValues = new Set([undefined, "compact", "regular", "spacious"]);
  const codeThemeValues = new Set([undefined, "dark", "light"]);
  if (!densityValues.has(theme.density)) addError(errors, sourcePath, null, `theme.density must be compact, regular, or spacious (got '${theme.density}').`);
  if (!codeThemeValues.has(theme.codeTheme)) addError(errors, sourcePath, null, `theme.codeTheme must be dark or light (got '${theme.codeTheme}').`);
  if (deck.template === "seminar") {
    const titleStyleValues = new Set([undefined, "topic", "action"]);
    const fontPairValues = new Set([undefined, "plex", "grotesk", "dm", "serif"]);
    if (!titleStyleValues.has(theme.titleStyle)) addError(errors, sourcePath, null, `theme.titleStyle must be topic or action (got '${theme.titleStyle}').`);
    if (!fontPairValues.has(theme.fontPair)) addError(errors, sourcePath, null, `theme.fontPair must be plex, grotesk, dm, or serif (got '${theme.fontPair}').`);
  }
  if (deck.template === "university") {
    const bulletValues = new Set([undefined, "diamond", "square", "dash"]);
    if (!bulletValues.has(theme.bullets)) addError(errors, sourcePath, null, `theme.bullets must be diamond, square, or dash (got '${theme.bullets}').`);
  }
}

const LOCALIZATION_EXEMPT_KEYS = new Set([
  "id", "pattern", "ordinal", "total", "slotId", "src", "shape", "classes",
  "style", "contentStyle", "tableStyle", "align", "key", "numeric", "num",
  "best", "win", "allowOverflowRisk", "skipNotes", "skipScript", "fitFooter",
  "notes", "script", "code", "equation", "notation", "language", "class",
  "classes", "metaClass", "alt", "noTitle", "titleBlock", "value",
]);

function shouldRequireLocalized(pathName, value, requireLocalized) {
  if (!requireLocalized || typeof value !== "string" || value.trim() === "") return false;
  const key = pathName.split(".").pop().replace(/\[\d+\]$/, "");
  if (LOCALIZATION_EXEMPT_KEYS.has(key)) return false;
  return true;
}

function validateLocalizedTree(errors, sourcePath, slide, value, pathName, requiredLocales, options = {}) {
  if (!requiredLocales.length || value == null) return;
  if (isLocalizedString(value)) {
    assertLocalizedCompleteness(errors, sourcePath, slide, value, pathName, requiredLocales);
    return;
  }
  if (shouldRequireLocalized(pathName, value, options.requireLocalized)) {
    addError(errors, sourcePath, slide, `${pathName} must be a localized object with locales [${requiredLocales.join(", ")}] for bilingual university decks.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateLocalizedTree(errors, sourcePath, slide, item, `${pathName}[${index}]`, requiredLocales, options));
    return;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (["html", "style", "contentStyle", "code", "equation", "notation"].includes(key)) continue;
      if (LOCALIZATION_EXEMPT_KEYS.has(key)) continue;
      validateLocalizedTree(errors, sourcePath, slide, child, `${pathName}.${key}`, requiredLocales, options);
    }
  }
}

function normalizeDeck(input, options = {}) {
  const sourcePath = options.sourcePath || "<deck>";
  const errors = [];
  if (!isObject(input)) throw new DeckValidationError([`source: ${sourcePath} - deck root must be a mapping/object.`]);

  const deck = {
    schemaVersion: input.schemaVersion,
    template: options.template || input.template,
    metadata: { ...(input.metadata || {}) },
    theme: normalizeTheme(input.theme || {}),
    language: { ...((input.metadata || {}).language || {}), ...(input.language || {}) },
    slides: Array.isArray(input.slides) ? input.slides.map((slide) => ({ ...slide })) : input.slides,
  };

  if (deck.schemaVersion !== 1) addError(errors, sourcePath, null, "schemaVersion must be 1.");
  if (!KNOWN_TEMPLATES.has(deck.template)) addError(errors, sourcePath, null, "template must be one of: seminar, university, keynote.");
  for (const field of ["title", "speaker", "date"]) {
    if (!present(deck.metadata[field])) addError(errors, sourcePath, null, `metadata.${field} is required.`);
  }
  if (deck.template === "university" && !present(deck.metadata.language && deck.metadata.language.default)) {
    addError(errors, sourcePath, null, "metadata.language.default is required for university decks.");
  }
  validateTheme(errors, sourcePath, deck);
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) addError(errors, sourcePath, null, "slides must be a non-empty array.");

  const language = deck.language || deck.metadata.language || {};
  const requiredLocales = deck.template === "university" ? Array.from(new Set([language.default, ...((language.available) || [])].filter(Boolean))) : [];
  if (deck.template === "university") {
    if (language.default && !["en", "pl"].includes(language.default)) addError(errors, sourcePath, null, "metadata.language.default must be 'en' or 'pl' for university decks.");
    if (Array.isArray(language.available) && language.default && !language.available.includes(language.default)) addError(errors, sourcePath, null, "metadata.language.available must include metadata.language.default.");
  }
  const requireLocalized = deck.template === "university" && requiredLocales.length > 1;
  validateLocalizedTree(errors, sourcePath, null, deck.metadata, "metadata", requiredLocales, { requireLocalized });
  const ids = new Set();
  if (Array.isArray(deck.slides)) {
    deck.slides = deck.slides.map((slide, index) => {
      const normalized = { ...slide, ordinal: index + 1, total: deck.slides.length };
      if (!present(normalized.id)) normalized.id = `slide-${index + 1}`;
      if (ids.has(normalized.id)) addError(errors, sourcePath, normalized, `duplicate slide id '${normalized.id}'. Use stable unique IDs.`);
      ids.add(normalized.id);
      if (!KNOWN_PATTERNS.has(normalized.pattern)) addError(errors, sourcePath, normalized, `unknown pattern '${normalized.pattern}'. Use a known pattern catalog entry.`);

      validateLocalizedTree(errors, sourcePath, normalized, normalized, "slides[]", requiredLocales, { requireLocalized });

      if (!normalized.skipNotes && !present(normalized.notes)) addError(errors, sourcePath, normalized, "notes is required unless skipNotes: true.");
      if (!normalized.skipScript && !present(normalized.script)) addError(errors, sourcePath, normalized, "script is required unless skipScript: true.");
      normalized.script = normalizeScript(normalized.script);

      for (const field of PATTERN_REQUIREMENTS[normalized.pattern] || []) {
        if (!present(normalized[field])) addError(errors, sourcePath, normalized, `${normalized.pattern} requires '${field}'.`);
      }
      if (["comparison", "comparison-3col"].includes(normalized.pattern) && !present(normalized.columns) && !present(normalized.items)) {
        addError(errors, sourcePath, normalized, `${normalized.pattern} requires 'columns' or 'items'.`);
      }
      if (normalized.pattern === "pipeline" && !present(normalized.steps) && !present(normalized.items)) {
        addError(errors, sourcePath, normalized, "pipeline requires 'steps' or 'items'.");
      }

      const hint = CAPACITY_HINTS[normalized.pattern];
      if (hint) {
        if (Array.isArray(normalized.items) && hint.items) validateCapacity(errors, sourcePath, normalized, "items", normalized.items.length, hint.items);
        if (Array.isArray(normalized.steps) && hint.steps) validateCapacity(errors, sourcePath, normalized, "steps", normalized.steps.length, hint.steps);
        if (Array.isArray(normalized.columns) && hint.columns) validateCapacity(errors, sourcePath, normalized, "columns", normalized.columns.length, hint.columns);
        if (Array.isArray(normalized.rows) && hint.rows) validateCapacity(errors, sourcePath, normalized, "rows", normalized.rows.length, hint.rows);
        if (Array.isArray(normalized.images) && hint.images) validateCapacity(errors, sourcePath, normalized, "images", normalized.images.length, hint.images);
      }

      if (normalized.pattern === "table") validateTable(errors, sourcePath, normalized);
      if (normalized.pattern === "image-led") validateImage(errors, sourcePath, normalized, normalized.image, 0);
      if (normalized.pattern === "image-grid" && Array.isArray(normalized.images)) normalized.images.forEach((img, i) => validateImage(errors, sourcePath, normalized, img, i));
      return normalized;
    });
  }

  deck.slideCount = Array.isArray(deck.slides) ? deck.slides.length : 0;
  if (errors.length) throw new DeckValidationError(errors);
  return deck;
}

function validateTable(errors, sourcePath, slide) {
  const numericColumns = (slide.columns || []).filter((column) => column && (column.numeric || column.align === "right" || column.align === "numeric"));
  for (const column of numericColumns) {
    if (!present(column.id)) addError(errors, sourcePath, slide, "numeric/right-aligned table columns must define stable column.id for header/body alignment.");
    if (!present(column.align)) addError(errors, sourcePath, slide, `numeric table column '${column.id || column.label || "<unnamed>"}' must set align: right or align: numeric.`);
  }
  if (Array.isArray(slide.rows)) {
    slide.rows.forEach((row, rowIndex) => {
      if (Array.isArray(row) && row.length !== (slide.columns || []).length) addError(errors, sourcePath, slide, `table row ${rowIndex + 1} has ${row.length} cells but columns has ${(slide.columns || []).length}.`);
      if (Array.isArray(row)) row.forEach((cell, cellIndex) => validateTableCell(errors, sourcePath, slide, cell, rowIndex, cellIndex));
      if (isObject(row) && Array.isArray(row.cells)) {
        if (row.cells.length !== (slide.columns || []).length) addError(errors, sourcePath, slide, `table row ${rowIndex + 1} has ${row.cells.length} cells but columns has ${(slide.columns || []).length}.`);
        row.cells.forEach((cell, cellIndex) => validateTableCell(errors, sourcePath, slide, cell, rowIndex, cellIndex));
      }
      if (isObject(row) && !Array.isArray(row.cells)) {
        (slide.columns || []).forEach((column) => {
          const key = column && (column.key || column.id || column.label || column.title);
          if (!present(key)) addError(errors, sourcePath, slide, `object table row ${rowIndex + 1} requires each column to define key or id.`);
          else if (!Object.prototype.hasOwnProperty.call(row, key)) addError(errors, sourcePath, slide, `object table row ${rowIndex + 1} is missing value for column '${key}'.`);
          else validateTableCell(errors, sourcePath, slide, row[key], rowIndex, (slide.columns || []).indexOf(column));
        });
      }
    });
  }
}

function validateTableCell(errors, sourcePath, slide, cell, rowIndex, cellIndex) {
  if (!isObject(cell) || isLocalizedString(cell)) return;
  if (!present(cell.text) && !present(cell.value) && !present(cell.label)) {
    addError(errors, sourcePath, slide, `table cell ${rowIndex + 1}.${cellIndex + 1} object must define text, value, or label.`);
  }
  if (present(cell.class) && typeof cell.class !== "string") addError(errors, sourcePath, slide, `table cell ${rowIndex + 1}.${cellIndex + 1} class must be a string.`);
  if (present(cell.classes) && !Array.isArray(cell.classes)) addError(errors, sourcePath, slide, `table cell ${rowIndex + 1}.${cellIndex + 1} classes must be an array.`);
}

function validateImage(errors, sourcePath, slide, image, index) {
  if (!isObject(image)) return;
  if (!present(image.slotId)) image.slotId = `${slide.id}-image-${index + 1}`;
}

module.exports = {
  DeckValidationError,
  KNOWN_PATTERNS,
  KNOWN_TEMPLATES,
  normalizeDeck,
  textFor,
};
