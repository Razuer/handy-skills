const { textFor } = require("./schema");

function renderReadme(deck, options = {}) {
  const locale = ((deck.metadata.language || {}).default) || "pl";
  const sourceFile = options.sourceFile || "deck.yaml";
  const scriptsDir = options.scriptsDir || "/home/razuer/.config/opencode/skills/presentation-builder/scripts";
  const wordCount = options.wordCount || 0;
  const buildSummary = options.buildSummary || "Structural validation passed; HTML generated.";
  const generatedAt = options.generatedAt || new Date().toISOString();
  const outputs = ["deck.html", "script.md", "README.md", "deck.yaml", "deck.normalized.json", "deck-stage.js", "image-slot.js", "tweaks-panel.jsx"];
  if (deck.template === "university") outputs.push("assets/uni/");

  return [
    `# ${textFor(deck.metadata.title, locale)}`,
    "",
    "Generated presentation package.",
    "",
    "## Build summary",
    "",
    `- Template: ${deck.template}`,
    `- Source file: ${sourceFile}`,
    `- Slides: ${deck.slideCount}`,
    `- Script word count: ${wordCount}`,
    `- Timing note: estimate ${Math.max(1, Math.round(wordCount / 130))} minutes at ~130 words/minute.`,
    `- Latest build/check: ${buildSummary}`,
    `- Generated at: ${generatedAt}`,
    "",
    "## Theme/customization",
    "",
    "```json",
    JSON.stringify(deck.theme || {}, null, 2),
    "```",
    "",
    "## Outputs",
    "",
    ...outputs.map((file) => `- ${file}`),
    "",
    "## Open",
    "",
    "```bash",
    "xdg-open deck.html",
    "```",
    "",
    "## Verification",
    "",
    "```bash",
    `node ${scriptsDir}/generate_deck.js ${sourceFile} --out . --check`,
    `node ${scriptsDir}/check_overflow.js deck.html`,
    `node ${scriptsDir}/render_slides.js deck.html --contact-sheet --width=960`,
    "```",
    "",
  ].join("\n");
}

module.exports = { renderReadme };
