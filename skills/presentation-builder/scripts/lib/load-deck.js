const fs = require("fs");
const YAML = require("yaml");
const { DeckValidationError, normalizeDeck } = require("./schema");

function loadDeck(sourcePath, options = {}) {
  let raw;
  try {
    raw = fs.readFileSync(sourcePath, "utf8");
  } catch (error) {
    throw new DeckValidationError([`source: ${sourcePath} - cannot read deck YAML: ${error.message}`]);
  }

  let parsed;
  try {
    parsed = YAML.parse(raw, { prettyErrors: true });
  } catch (error) {
    throw new DeckValidationError([`source: ${sourcePath} - YAML parse error: ${error.message}`]);
  }

  return normalizeDeck(parsed, { ...options, sourcePath });
}

module.exports = { loadDeck, DeckValidationError };
