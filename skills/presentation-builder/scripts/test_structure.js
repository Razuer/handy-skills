const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadDeck } = require("./lib/load-deck");
const { KNOWN_PATTERNS } = require("./lib/schema");

const scriptsDir = __dirname;
const fixturesDir = path.join(scriptsDir, "fixtures");
const fixtures = [
  "seminar-minimal.deck.yaml",
  "seminar-aiot.deck.yaml",
  "keynote-minimal.deck.yaml",
  "university-bilingual.deck.yaml",
  "seminar-all-patterns.deck.yaml",
  "university-all-patterns-bilingual.deck.yaml",
];

const allPatternFixtures = new Set([
  "seminar-all-patterns.deck.yaml",
  "university-all-patterns-bilingual.deck.yaml",
]);

const universityAssetFiles = [
  "pwr-en-horiz.png",
  "pwr-en-horiz-white.png",
  "pwr-en-vert.png",
  "pwr-en-vert-white.png",
  "pwr-pl-horiz.png",
  "pwr-pl-horiz-white.png",
  "pwr-pl-vert.png",
  "pwr-pl-vert-white.png",
  "hr-excellence.png",
  "unite.png",
  "iep-evaluated.png",
];

function hasRenderer() {
  const rendererPath = path.join(scriptsDir, "lib", "render-html.js");
  if (!fs.existsSync(rendererPath)) return false;
  const renderer = require(rendererPath);
  return renderer && typeof renderer.renderHtml === "function";
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertNoPlaceholders(filePath) {
  const content = read(filePath);
  assert(!/\{\{[A-Z0-9_]+\}\}|TODO_RENDER|UNRESOLVED_PLACEHOLDER/.test(content), `${filePath} has unresolved placeholder text`);
}

function countSpeakerNotes(html) {
  const match = html.match(/<script[^>]+id=["']speaker-notes["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && Array.isArray(parsed.slides)) return parsed.slides.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
  } catch (error) {
    throw new Error(`speaker-notes JSON is invalid: ${error.message}`);
  }
  return null;
}

function assertPageCounters(html, total) {
  const padded = String(total).padStart(2, "0");
  const counter = new RegExp(`\\b(?:${total}|${padded})\\s*/\\s*(?:${total}|${padded})\\b`);
  assert(counter.test(html), `deck.html does not include a final page counter ending in ${padded} / ${padded}`);
}

function countGeneratedSections(html) {
  return (html.match(/<section\b/g) || []).length;
}

function dataLabelOrdinals(html) {
  return Array.from(html.matchAll(/\bdata-label=["'](\d{2})\b/g), (match) => match[1]);
}

function assertAllPatternDeckShape(fixtureName, deck) {
  assert.strictEqual(deck.slideCount, 25, `${fixtureName} should have exactly 25 slides`);
  assert.strictEqual(deck.slides.filter((slide) => slide.notes).length, deck.slideCount, `${fixtureName} should have one notes block per slide`);
  assert.strictEqual(deck.slides.filter((slide) => slide.script).length, deck.slideCount, `${fixtureName} should have one script block per slide`);

  const usedPatterns = new Set(deck.slides.map((slide) => slide.pattern));
  for (const pattern of KNOWN_PATTERNS) {
    assert(usedPatterns.has(pattern), `${fixtureName} should include known pattern '${pattern}'`);
  }
}

function assertAllPatternHtml(fixtureName, deck, html) {
  assert.strictEqual(countGeneratedSections(html), deck.slideCount, `${fixtureName} generated section count should equal slide count`);

  const ordinals = new Set(dataLabelOrdinals(html));
  for (let i = 1; i <= deck.slideCount; i += 1) {
    const ordinal = String(i).padStart(2, "0");
    assert(ordinals.has(ordinal), `${fixtureName} should include data-label ordinal ${ordinal}`);
  }
}

function assertUniversityAssets(outDir, fixtureName) {
  for (const file of universityAssetFiles) {
    assert(fs.existsSync(path.join(outDir, "assets", "uni", file)), `${fixtureName} missing university asset assets/uni/${file}`);
  }
}

function assertUniversityI18nHtml(html, fixtureName) {
  assert(/<span\b[^>]*\bdata-en=/.test(html) && /<span\b[^>]*\bdata-pl=/.test(html), `${fixtureName} should include i18n spans with data-en/data-pl`);
  assert(/<img\b[^>]*\bclass=["'][^"']*\blang-en\b/.test(html), `${fixtureName} should include lang-en logo variants`);
  assert(/<img\b[^>]*\bclass=["'][^"']*\blang-pl\b/.test(html), `${fixtureName} should include lang-pl logo variants`);
}

function assertSeminarAllPatternHtml(html, fixtureName) {
  assert(!/<div class="slide-header"><span class="eyebrow">Outline<\/span><span>Outline<\/span><\/div>/.test(html), `${fixtureName} should not duplicate the agenda eyebrow in seminar chrome`);
  assert(/<div class="slide-header"><span class="eyebrow">Overview<\/span><span>Agenda<\/span><\/div>/.test(html), `${fixtureName} should use seminar header chrome for section + topic`);
  assert(!/<div class="eyebrow">Outline<\/div>/.test(html), `${fixtureName} should keep seminar content eyebrows out of the slide body by default`);
  assert(/<div class="timeline" style="--timeline-cols:4">/.test(html), `${fixtureName} timeline should adapt columns to item count`);
}

function writeTempDeck(name, yaml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pb-${name}-`));
  const filePath = path.join(dir, `${name}.deck.yaml`);
  fs.writeFileSync(filePath, `${yaml.trim()}\n`, "utf8");
  return { dir, filePath };
}

function runGenerator(args) {
  return spawnSync(process.execPath, [path.join(scriptsDir, "generate_deck.js"), ...args], {
    cwd: scriptsDir,
    encoding: "utf8",
  });
}

function assertInvalidDeck(name, yaml, expectedSnippet) {
  const { filePath } = writeTempDeck(name, yaml);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `pb-${name}-out-`));
  const result = runGenerator([filePath, "--out", outDir, "--check"]);
  assert.notStrictEqual(result.status, 0, `${name} should fail structural validation`);
  const output = `${result.stderr}\n${result.stdout}`;
  assert(output.includes(expectedSnippet), `${name} should mention '${expectedSnippet}', got:\n${output}`);
}

function runNegativeValidationTests() {
  const validSlide = [
    "  - id: cover",
    "    pattern: cover",
    "    title: \"Cover\"",
    "    notes: \"Notes\"",
    "    script:",
    "      text: \"Script\"",
  ].join("\n");
  assertInvalidDeck("missing-metadata", [
    "schemaVersion: 1",
    "template: seminar",
    "metadata:",
    "  title: \"Bad\"",
    "  date: \"Today\"",
    "slides:",
    validSlide,
  ].join("\n"), "metadata.speaker is required");
  assertInvalidDeck("duplicate-id", [
    "schemaVersion: 1",
    "template: seminar",
    "metadata:",
    "  title: \"Bad\"",
    "  speaker: \"Ada\"",
    "  date: \"Today\"",
    "slides:",
    validSlide,
    validSlide,
  ].join("\n"), "duplicate slide id");
  assertInvalidDeck("invalid-theme", [
    "schemaVersion: 1",
    "template: seminar",
    "metadata:",
    "  title: \"Bad\"",
    "  speaker: \"Ada\"",
    "  date: \"Today\"",
    "theme:",
    "  density: tiny",
    "slides:",
    validSlide,
  ].join("\n"), "theme.density must be compact");
  assertInvalidDeck("missing-locale", [
    "schemaVersion: 1",
    "template: university",
    "metadata:",
    "  title:",
    "    en: \"Bad\"",
    "    pl: \"Zła\"",
    "  speaker:",
    "    en: \"Ada\"",
    "    pl: \"Ada\"",
    "  date:",
    "    en: \"Today\"",
    "    pl: \"Dzisiaj\"",
    "  language:",
    "    default: en",
    "    available: [en, pl]",
    "slides:",
    "  - id: agenda",
    "    pattern: agenda",
    "    title: \"Agenda\"",
    "    items:",
    "      - en: \"Context\"",
    "        pl: \"Kontekst\"",
    "    notes: \"Notes\"",
    "    script:",
    "      text:",
    "        en: \"Text\"",
    "        pl: \"Tekst\"",
  ].join("\n"), "must be a localized object");
}

function runTableObjectRowTest() {
  const { filePath } = writeTempDeck("table-object-row", [
    "schemaVersion: 1",
    "template: seminar",
    "metadata:",
    "  title: \"Table rows\"",
    "  speaker: \"Ada\"",
    "  date: \"Today\"",
    "slides:",
    "  - id: cover",
    "    pattern: cover",
    "    title: \"Table rows\"",
    "    notes: \"Notes\"",
    "    script:",
    "      text: \"Intro\"",
    "  - id: table",
    "    pattern: table",
    "    title: \"Object rows use column ids\"",
    "    columns:",
    "      - id: layer",
    "        label: \"Layer\"",
    "      - id: latency",
    "        label: \"Latency\"",
    "        numeric: true",
    "        align: right",
    "    rows:",
    "      - layer: \"Edge\"",
    "        latency: 10",
    "      - layer: \"Cloud\"",
    "        latency: 250",
    "    notes: \"Notes\"",
    "    script:",
    "      text: \"Read the table\"",
  ].join("\n"));
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-table-object-out-"));
  const result = runGenerator([filePath, "--out", outDir]);
  assert.strictEqual(result.status, 0, `table object row generation failed: ${result.stderr || result.stdout}`);
  const html = read(path.join(outDir, "deck.html"));
  assert(html.includes("Edge") && html.includes("10") && html.includes("Cloud") && html.includes("250"), "object row values keyed by column id should render into table cells");
  assert(/<th class="num">Latency<\/th>/.test(html) && /<td class="num">10<\/td>/.test(html), "numeric class should appear on matching table header/body cells");
}

function runFixture(fixtureName, rendererAvailable) {
  const fixturePath = path.join(fixturesDir, fixtureName);
  const deck = loadDeck(fixturePath);
  const isAllPatternFixture = allPatternFixtures.has(fixtureName);
  assert(deck.slideCount > 0, `${fixtureName} should have slides`);
  assert.strictEqual(deck.slides.filter((slide) => slide.notes).length, deck.slideCount, `${fixtureName} should have one notes block per slide`);
  if (isAllPatternFixture) assertAllPatternDeckShape(fixtureName, deck);

  const check = spawnSync(process.execPath, [path.join(scriptsDir, "generate_deck.js"), fixturePath, "--out", path.join(os.tmpdir(), `pb-check-${path.basename(fixtureName, ".deck.yaml")}`), "--check"], {
    cwd: scriptsDir,
    encoding: "utf8",
  });
  assert.strictEqual(check.status, 0, `--check failed for ${fixtureName}: ${check.stderr || check.stdout}`);

  if (!rendererAvailable) return;
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `pb-${path.basename(fixtureName, ".deck.yaml")}-`));
  const build = spawnSync(process.execPath, [path.join(scriptsDir, "generate_deck.js"), fixturePath, "--out", outDir, "--normalized"], {
    cwd: scriptsDir,
    encoding: "utf8",
  });
  assert.strictEqual(build.status, 0, `generate failed for ${fixtureName}: ${build.stderr || build.stdout}`);

  for (const file of ["deck.html", "script.md", "README.md", "deck.yaml", "deck.normalized.json", "deck-stage.js", "image-slot.js", "tweaks-panel.jsx"]) {
    assert(fs.existsSync(path.join(outDir, file)), `${fixtureName} missing output ${file}`);
  }
  for (const file of ["deck.html", "script.md", "README.md", "deck.yaml", "deck.normalized.json"]) {
    assertNoPlaceholders(path.join(outDir, file));
  }
  const html = read(path.join(outDir, "deck.html"));
  const notesCount = countSpeakerNotes(html);
  assert.strictEqual(notesCount, deck.slideCount, `${fixtureName} speaker notes count should equal slide count`);
  assertPageCounters(html, deck.slideCount);
  if (isAllPatternFixture) assertAllPatternHtml(fixtureName, deck, html);
  if (deck.template === "university") {
    assert(fs.existsSync(path.join(outDir, "assets", "uni", "pwr-en-horiz.png")), "university assets/uni tree was not copied");
    if (isAllPatternFixture) {
      assertUniversityAssets(outDir, fixtureName);
      assertUniversityI18nHtml(html, fixtureName);
    }
  }
  if (deck.template === "seminar" && isAllPatternFixture) {
    assert(!fs.existsSync(path.join(outDir, "assets", "uni")), `${fixtureName} should not generate assets/uni`);
    assertSeminarAllPatternHtml(html, fixtureName);
  }
}

function main() {
  const rendererAvailable = hasRenderer();
  for (const fixture of fixtures) runFixture(fixture, rendererAvailable);
  runNegativeValidationTests();
  if (rendererAvailable) runTableObjectRowTest();
  if (!rendererAvailable) console.warn("HTML renderer not found; full generation assertions skipped until scripts/lib/render-html.js exports renderHtml(deck, options).");
  console.log(`✓ Structure tests passed for ${fixtures.length} fixtures${rendererAvailable ? "" : " (renderer-dependent assertions skipped)"}.`);
}

main();
