const { textFor } = require("./schema");

function countWords(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function renderScript(deck) {
  const locale = ((deck.metadata.language || {}).default) || "pl";
  const lines = [];
  let totalWords = 0;

  lines.push(`# ${textFor(deck.metadata.title, locale)}`);
  lines.push("");
  lines.push(`Speaker: ${textFor(deck.metadata.speaker, locale)}`);
  lines.push(`Date: ${textFor(deck.metadata.date, locale)}`);
  lines.push("");

  for (const slide of deck.slides) {
    const title = textFor(slide.title, locale) || slide.id;
    lines.push(`## Slajd ${slide.ordinal} - ${title}`);
    lines.push("");
    if (slide.skipScript) {
      lines.push("_Script intentionally omitted for this slide._");
      lines.push("");
      continue;
    }
    const script = slide.script || {};
    if (script.cue) {
      lines.push(`Cue: ${textFor(script.cue, locale)}`);
      lines.push("");
    }
    if (script.text) {
      const text = textFor(script.text, locale);
      totalWords += countWords(text);
      lines.push(text);
      lines.push("");
    }
    if (script.transition) {
      const transition = textFor(script.transition, locale);
      totalWords += countWords(transition);
      lines.push(`Transition: ${transition}`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`Word count: ${totalWords}`);
  lines.push(`Estimated speaking time: ${Math.max(1, Math.round(totalWords / 130))} min`);
  return { markdown: lines.join("\n"), wordCount: totalWords };
}

module.exports = { renderScript, countWords };
