const seminar = require('./seminar');
const { escapeHtml, text, ordinal, RAW_HTML_WARNING, imageObject, renderImageSlot } = seminar;
const { renderCustomLayout, slideStyle } = require('./custom');

const ROMAN = ['i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.'];

function counter(slide) { return `${ordinal(slide.ordinal)} / ${ordinal(slide.total)}`; }
function idx(i) { return ROMAN[i] || `${i + 1}.`; }

function rich(value, html) {
  if (html != null) return String(html);
  return escapeHtml(text(value ?? '')).replace(/\*([^*]+)\*/g, '<span class="serif-em">$1</span>');
}

function attrs(slide, extra = []) {
  const classes = ['slide', ...extra, ...(slide.classes || [])].filter(Boolean).join(' ');
  const style = slideStyle(slide);
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';
  return `class="${escapeHtml(classes)}" data-label="${escapeHtml(slide.ordinalLabel)}"${styleAttr}`;
}

function mark(deck) { return escapeHtml(text(deck.metadata?.mark ?? deck.theme?.mark ?? 'K')); }
function brandText(deck) { return escapeHtml(text(deck.metadata?.brand ?? deck.metadata?.event ?? 'KEYNOTE')); }
function brand(deck) { return `<span class="brand"><span class="mark">${mark(deck)}</span>${brandText(deck)}</span>`; }
function footerText(deck) { return escapeHtml(text(deck.metadata?.footer ?? deck.metadata?.speaker ?? '')); }

function chromeTop(slide, deck) { return `<div class="chrome-top">${brand(deck)}<span>${counter(slide)}</span></div>`; }
function chromeBot(slide, deck) { return `<div class="chrome-bot"><span>${footerText(deck)}</span><span>${counter(slide)}</span></div>`; }

function titleBlock(slide) {
  const title = rich(slide.title, slide.titleHtml);
  return `<div class="stack-tight">${slide.eyebrow ? `<span class="eyebrow">${rich(slide.eyebrow, slide.eyebrowHtml)}</span>` : ''}<h2 class="title">${title}</h2>${slide.subtitle ? `<p class="subtitle">${rich(slide.subtitle, slide.subtitleHtml)}</p>` : ''}</div>`;
}

function regular(slide, deck, content, options = {}) {
  if (slide.html) return `<section ${attrs(slide)}>${RAW_HTML_WARNING}\n${slide.html}</section>`;
  const contentClasses = ['content', ...(options.contentClasses || [])].join(' ');
  return `<section ${attrs(slide, options.classes || [])}>${chromeTop(slide, deck)}<div class="${escapeHtml(contentClasses)}"${slide.contentStyle ? ` style="${escapeHtml(slide.contentStyle)}"` : ''}>${content}</div>${chromeBot(slide, deck)}</section>`;
}

function itemList(items = [], cls = 'bullets') {
  return `<ul class="${cls}">${items.map((item, i) => `<li><span class="b-num">${escapeHtml(item.idx ?? idx(i))}</span><div><span class="b-title">${rich(item.title ?? item.label ?? item, item.titleHtml)}</span>${item.body || item.desc ? `<span class="b-desc">${rich(item.body ?? item.desc, item.bodyHtml)}</span>` : ''}</div></li>`).join('')}</ul>`;
}

function renderCover(slide, deck) {
  const fields = slide.fields || { Speaker: deck.metadata?.speaker, Venue: deck.metadata?.venue, Date: deck.metadata?.date, Hashtag: deck.metadata?.hashtag };
  return `<section ${attrs(slide, ['cover'])}><div class="cover-top">${brand(deck)}<span></span><span>${escapeHtml(text(slide.context ?? deck.metadata?.context ?? deck.metadata?.duration ?? ''))}</span></div><div class="cover-mid">${slide.eyebrow ? `<span class="eyebrow cover-eyebrow">${rich(slide.eyebrow, slide.eyebrowHtml)}</span>` : ''}<h1 class="cover-title">${rich(slide.title ?? deck.metadata?.title, slide.titleHtml)}</h1>${slide.subtitle || deck.metadata?.subtitle ? `<p class="cover-sub">${rich(slide.subtitle ?? deck.metadata?.subtitle, slide.subtitleHtml)}</p>` : ''}</div><dl class="cover-bot">${Object.entries(fields).filter(([, v]) => v != null).slice(0, 4).map(([k, v]) => `<div><dt>${escapeHtml(text(k))}</dt><dd>${rich(v)}</dd></div>`).join('')}</dl></section>`;
}

function renderAgenda(slide, deck) {
  const items = slide.items || [];
  return regular(slide, deck, `${titleBlock(slide)}<ol class="agenda">${items.map((item, i) => `<li><span class="idx">${escapeHtml(item.idx ?? idx(i))}</span><span class="label">${rich(item.title ?? item.label ?? item, item.titleHtml)}</span><span class="dur">${escapeHtml(text(item.meta ?? item.duration ?? ''))}</span></li>`).join('')}</ol>`, { contentClasses: [], classes: [] });
}

function renderDivider(slide, deck) {
  const inv = slide.pattern === 'appendix-divider' || slide.inverted || slide.dark;
  return `<section ${attrs(slide, ['divider', inv && 'divider-inv'])}><div class="div-top"><span>${escapeHtml(text(slide.meta ?? slide.eyebrow ?? `Act ${ordinal(slide.ordinal)}`))}</span><span>${escapeHtml(text(slide.duration ?? slide.caption ?? ''))}</span></div><div class="div-mid"><div class="div-num">${escapeHtml(text(slide.number ?? slide.sectionNumber ?? idx(slide.ordinal - 1)))}</div><div class="div-block">${slide.eyebrow ? `<div class="div-eye">${rich(slide.eyebrow, slide.eyebrowHtml)}</div>` : ''}<h2 class="div-title">${rich(slide.title, slide.titleHtml)}</h2><div class="div-rule"></div>${slide.subtitle ? `<p class="div-lede">${rich(slide.subtitle, slide.subtitleHtml)}</p>` : ''}</div></div><div class="div-bot"><span>${escapeHtml(text(slide.footerLabel ?? slide.title ?? ''))}</span><span>${counter(slide)}</span></div></section>`;
}

function renderDefinition(slide, deck) {
  const side = slide.items ? `<div class="def-side"><div class="def-side-h">${rich(slide.sideTitle ?? 'In practice', slide.sideTitleHtml)}</div>${itemList(slide.items)}</div>` : '';
  return regular(slide, deck, `${titleBlock(slide)}<div class="def-grid"><div class="def-card"><div class="def-tag">${escapeHtml(text(slide.tag ?? 'Definition'))}</div><h3 class="def-term">${rich(slide.term ?? slide.title, slide.termHtml)}</h3>${slide.notation ? `<p class="def-notation">${slide.notation}</p>` : ''}<p class="def-body">${rich(slide.body ?? slide.definition ?? slide.subtitle, slide.bodyHtml)}</p></div>${side}</div>`);
}

function renderBullets(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}${itemList(slide.items || slide.bullets || [])}`); }

function compareCol(item, alt) {
  return `<div class="compare${alt ? ' alt' : ''}"><div class="compare-tag">${rich(item.tag ?? '', item.tagHtml)}</div><h3 class="compare-h">${rich(item.title ?? item.label, item.titleHtml)}</h3>${item.body ? `<p class="compare-body">${rich(item.body, item.bodyHtml)}</p>` : ''}<ul class="compare-list">${(item.items || item.points || []).map((p) => `<li>${rich(p)}</li>`).join('')}</ul></div>`;
}
function renderComparison(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<div class="cols-2">${(slide.items || slide.columns || []).slice(0, 2).map((it, i) => compareCol(it, i === 1)).join('')}</div>`); }
function renderComparison3(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<div class="cols-3">${(slide.items || slide.columns || []).slice(0, 3).map((it, i) => compareCol(it, i === 1)).join('')}</div>`); }

function renderQuote(slide, deck) {
  return regular(slide, deck, `<div class="quote"><div class="mark">“</div><div><p class="body-q">${rich(slide.quote ?? slide.body ?? slide.title, slide.quoteHtml ?? slide.bodyHtml)}</p><div class="attr"><span class="name">${rich(slide.author ?? '', slide.authorHtml)}</span>${slide.source ? `<span>·</span><span class="ref">${rich(slide.source, slide.sourceHtml)}</span>` : ''}${slide.year ? `<span>·</span><span>${escapeHtml(text(slide.year))}</span>` : ''}</div></div></div>`);
}

function renderFullBleed(slide, deck) {
  const image = imageObject(slide.image);
  return `<section ${attrs(slide, ['bleed'])}><div class="bleed-img">${renderImageSlot(slide, image, 0)}</div><div class="bleed-shade"></div><div class="bleed-chrome">${brand(deck)}<span>${counter(slide)}</span></div><div class="bleed-content">${slide.eyebrow ? `<span class="bleed-eye">${rich(slide.eyebrow, slide.eyebrowHtml)}</span>` : ''}<h2 class="bleed-title">${rich(slide.title, slide.titleHtml)}</h2>${slide.subtitle ? `<p class="bleed-sub">${rich(slide.subtitle, slide.subtitleHtml)}</p>` : ''}</div>${slide.credit || image.credit ? `<div class="bleed-cred">${rich(slide.credit ?? image.credit)}</div>` : ''}</section>`;
}

function renderPipeline(slide, deck) {
  const steps = slide.steps || slide.items || [];
  const style = steps.length ? ` style="--pipeline-cols:${escapeHtml(steps.length)}"` : '';
  return regular(slide, deck, `${titleBlock(slide)}<div class="pipeline"${style}>${steps.map((s, i) => `<div class="step"><div class="step-idx">${escapeHtml(s.idx ?? idx(i))}</div><h3 class="step-h">${rich(s.title ?? s.label, s.titleHtml)}</h3><p class="step-d">${rich(s.body ?? s.desc ?? '', s.bodyHtml)}</p>${s.tag ? `<div class="step-tag">${rich(s.tag, s.tagHtml)}</div>` : ''}</div>`).join('')}</div>`);
}

function renderEquation(slide, deck) {
  return regular(slide, deck, `${titleBlock(slide)}<div class="eq-grid"><div class="eq-display"><p class="eq">${slide.equation ?? rich(slide.body ?? '')}</p>${slide.caption ? `<p class="eq-cap">${rich(slide.caption, slide.captionHtml)}</p>` : ''}</div><dl class="eq-vars">${(slide.variables || []).map((v) => `<div><dt>${v.symbol ?? rich(v.term ?? '')}</dt><dd>${rich(v.desc ?? v.body ?? '', v.descHtml ?? v.bodyHtml)}</dd></div>`).join('')}</dl></div>`);
}

function renderCode(slide, deck) {
  const lines = String(text(slide.code || '')).split('\n');
  return regular(slide, deck, `${titleBlock(slide)}<div class="code-grid"><div class="code-block"><div class="filename"><span>${escapeHtml(text(slide.filename ?? 'example'))}</span><span>${escapeHtml(text(slide.language ?? ''))}</span></div>${lines.map((line, i) => `<div class="line${line ? '' : ' blank'}"><span class="ln">${i + 1}</span><span>${escapeHtml(line) || '&nbsp;'}</span></div>`).join('')}</div><div class="code-notes">${(slide.items || slide.notesList || []).map((n) => `<div class="code-note"><h4>${rich(n.title ?? n.label, n.titleHtml)}</h4><p>${rich(n.body ?? n.desc ?? '', n.bodyHtml)}</p></div>`).join('')}</div></div>`);
}

function renderBigNumber(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<div class="stat-row"><p class="big-num">${escapeHtml(text(slide.value ?? slide.number ?? ''))}${slide.unit ? `<span class="unit">${escapeHtml(text(slide.unit))}</span>` : ''}</p><div class="stat-side"><span class="stat-label">${rich(slide.label ?? '', slide.labelHtml)}</span><p class="stat-desc">${rich(slide.body ?? slide.description ?? '', slide.bodyHtml)}</p>${slide.footnote ? `<p class="stat-foot">${rich(slide.footnote, slide.footnoteHtml)}</p>` : ''}</div></div>`); }

function renderBarChart(slide, deck) {
  const bars = slide.bars || slide.items || [];
  const notes = slide.chartNotes || slide.callouts || [];
  const style = bars.length ? ` style="--bar-cols:${escapeHtml(bars.length)}"` : '';
  return regular(slide, deck, `${titleBlock(slide)}<div class="chart-wrap"><div class="bar-chart"><div class="bars-row"${style}>${bars.map((b) => `<div class="bar${b.win ? ' win' : ''}" style="height:${escapeHtml(b.height ?? b.value ?? 50)}%"><span class="bar-val">${escapeHtml(text(b.value ?? ''))}</span></div>`).join('')}</div><div class="bar-labels"${style}>${bars.map((b) => `<span class="bar-label">${escapeHtml(text(b.label ?? ''))}</span>`).join('')}</div></div><div class="chart-side"><p class="chart-callout-num">${rich(slide.calloutValue ?? '', slide.calloutValueHtml)}</p><p class="chart-callout-lbl">${rich(slide.callout ?? '', slide.calloutHtml)}</p><ul>${notes.map((n) => `<li>${rich(n)}</li>`).join('')}</ul></div></div>`);
}

function tableCell(cell, numeric) {
  const isCellObject = cell && typeof cell === 'object' && !Array.isArray(cell) && !('en' in cell) && !('pl' in cell);
  const classes = [numeric && 'num'];
  let value = cell;
  if (isCellObject) {
    value = cell.text ?? cell.value ?? cell.label ?? '';
    if (cell.class) classes.push(cell.class);
    if (Array.isArray(cell.classes)) classes.push(...cell.classes);
  }
  const cls = classes.filter(Boolean).join(' ');
  return `<td${cls ? ` class="${escapeHtml(cls)}"` : ''}>${rich(value)}</td>`;
}

function renderTable(slide, deck) {
  const cols = slide.columns || [];
  const columnKey = (column) => column.key ?? column.id ?? column.label ?? column.title;
  const numeric = new Set(cols.map((c, i) => (c.num || c.numeric || c.align === 'right') ? i : -1).filter((i) => i >= 0));
  const head = `<thead><tr>${cols.map((c, i) => `<th${numeric.has(i) ? ' class="num"' : ''}>${rich(c.title ?? c.label ?? c, c.titleHtml)}</th>`).join('')}</tr></thead>`;
  const rows = (slide.rows || []).map((row) => {
    const cells = Array.isArray(row) ? row : (row.cells || cols.map((c) => row[columnKey(c)]));
    return `<tr${row.best ? ' class="best"' : ''}>${cells.map((cell, i) => tableCell(cell, numeric.has(i))).join('')}</tr>`;
  }).join('');
  return regular(slide, deck, `${titleBlock(slide)}<table class="data"${slide.tableStyle ? ` style="${escapeHtml(slide.tableStyle)}"` : ''}>${head}<tbody>${rows}</tbody></table>${slide.caption ? `<p class="table-cap">${rich(slide.caption, slide.captionHtml)}</p>` : ''}`);
}

function renderImageLed(slide, deck) {
  const image = imageObject(slide.image);
  const caption = slide.captionRow || slide.caption;
  const left = `<div><div class="stack-tight">${slide.eyebrow ? `<span class="eyebrow">${rich(slide.eyebrow, slide.eyebrowHtml)}</span>` : ''}<h2 class="title">${rich(slide.title, slide.titleHtml)}</h2>${slide.subtitle ? `<p class="subtitle">${rich(slide.subtitle, slide.subtitleHtml)}</p>` : ''}</div>${slide.body ? `<p class="body" style="margin-top: 32px;">${rich(slide.body, slide.bodyHtml)}</p>` : ''}${caption ? `<div class="caption-row">${Array.isArray(caption) ? caption.map((c) => `<span>${rich(c)}</span>`).join('') : `<span>${rich(caption)}</span>`}</div>` : ''}${slide.items ? itemList(slide.items) : ''}</div>`;
  return regular(slide, deck, `<div class="image-led">${left}<div class="image-frame">${renderImageSlot(slide, image, 0)}</div></div>`);
}

function renderImageGrid(slide, deck) {
  return regular(slide, deck, `${titleBlock(slide)}<div class="img-grid">${(slide.images || slide.items || []).map((img, i) => `<div class="img-tile"><div class="img-tile-frame">${renderImageSlot(slide, img, i, { placeholder: `Image ${i + 1}` })}</div><div class="img-tile-cap"><span>${rich(img.caption ?? img.title ?? idx(i), img.captionHtml ?? img.titleHtml)}</span>${img.meta ? `<span class="${escapeHtml(img.metaClass ?? 'pos')}">${rich(img.meta, img.metaHtml)}</span>` : ''}</div></div>`).join('')}</div>`);
}

function renderContributions(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<ol class="claims">${(slide.items || []).map((it, i) => `<li><p class="idx">${escapeHtml(it.idx ?? idx(i))}</p><h3 class="claim-h">${rich(it.title ?? it.label, it.titleHtml)}</h3><p class="claim-d">${rich(it.body ?? it.desc ?? '', it.bodyHtml)}</p>${it.tag ? `<div class="claim-tag">${rich(it.tag, it.tagHtml)}</div>` : ''}</li>`).join('')}</ol>`); }
function renderLimitations(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<ul class="limits">${(slide.items || []).map((it, i) => `<li><span class="lim-sign">${escapeHtml(text(it.sign ?? it.idx ?? idx(i)))}</span><div><p class="lim-h">${rich(it.title ?? it.label, it.titleHtml)}</p><p class="lim-d">${rich(it.body ?? it.desc ?? '', it.bodyHtml)}</p></div><div class="lim-fix"><b>${rich(it.fixLabel ?? 'Fix', it.fixLabelHtml)}</b>${rich(it.fix ?? '', it.fixHtml)}</div></li>`).join('')}</ul>`); }
function renderTimeline(slide, deck) { const items = slide.items || []; const style = items.length ? ` style="--timeline-cols:${escapeHtml(items.length)}"` : ''; return regular(slide, deck, `${titleBlock(slide)}<div class="timeline"${style}>${items.map((it, i) => { const alt = it.alt === true || i % 2 === 1; return `<div class="tl-col${alt ? ' alt' : ''}"><span class="tl-month">${rich(it.date ?? it.month ?? it.label, it.dateHtml ?? it.monthHtml)}</span><span class="tl-pill${alt ? ' alt' : ''}">${rich(it.title ?? '', it.titleHtml)}</span><p class="tl-note">${rich(it.body ?? it.note ?? '', it.bodyHtml)}</p></div>`; }).join('')}</div>`); }
function renderReferences(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<ol class="refs">${(slide.items || slide.references || []).map((r, i) => { const obj = r && typeof r === 'object' && !Array.isArray(r); return `<li><span class="ref-idx">${escapeHtml(r.idx ?? idx(i))}</span><div><div class="ref-authors">${rich(obj ? (r.authors ?? r.title) : r)}</div>${obj && r.title && r.authors ? `<div class="ref-title">${rich(r.title, r.titleHtml)}</div>` : ''}${obj && r.venue ? `<div class="ref-venue">${rich(r.venue, r.venueHtml)}</div>` : ''}${obj && r.doi ? `<div class="ref-doi">${rich(r.doi, r.doiHtml)}</div>` : ''}</div></li>`; }).join('')}</ol>`); }
function renderAcknowledgements(slide, deck) { return regular(slide, deck, `${titleBlock(slide)}<div class="cols-3">${(slide.groups || slide.items || []).slice(0, 3).map((g, i) => compareCol({ tag: g.title ?? g.label, title: g.heading ?? g.title ?? g.label, body: g.body, points: (g.items || []).map((it) => it.name ? `${text(it.name)}${it.role ? ` — ${text(it.role)}` : ''}${it.grant ? ` — ${text(it.grant)}` : ''}` : it) }, i === 1)).join('')}</div>`); }

function renderCustom(slide, deck) {
  return regular(slide, deck, renderCustomLayout(slide, deck, {
    escapeHtml,
    format: (value, html) => rich(value, html),
    titleBlock: () => titleBlock(slide),
    renderImage: (owner, image, index) => renderImageSlot(owner, image, index, { placeholder: `Image ${index + 1}` }),
  }), { contentClasses: ['custom-content'] });
}

function renderQa(slide, deck) {
  const fields = slide.fields || { Email: slide.email ?? slide.contact, Slides: slide.slides, Hashtag: slide.hashtag ?? deck.metadata?.hashtag };
  return `<section ${attrs(slide, ['qa'])}><div class="qa-top">${brand(deck)}<span>${counter(slide)}</span></div><div class="qa-mid"><span class="qa-eye">${rich(slide.eyebrow ?? 'Thank you', slide.eyebrowHtml)}</span><h2 class="qa-h">${rich(slide.title ?? 'Questions?', slide.titleHtml)}</h2>${slide.subtitle ? `<p class="qa-sub">${rich(slide.subtitle, slide.subtitleHtml)}</p>` : ''}</div><dl class="qa-bot">${Object.entries(fields).filter(([, v]) => v).slice(0, 3).map(([k, v]) => `<div><dt>${escapeHtml(text(k))}</dt><dd>${rich(v)}</dd></div>`).join('')}</dl></section>`;
}

const renderers = { cover: renderCover, agenda: renderAgenda, 'section-divider': renderDivider, definition: renderDefinition, bullets: renderBullets, table: renderTable, comparison: renderComparison, 'comparison-3col': renderComparison3, contributions: renderContributions, limitations: renderLimitations, references: renderReferences, qa: renderQa, quote: renderQuote, 'full-bleed': renderFullBleed, pipeline: renderPipeline, equation: renderEquation, code: renderCode, 'big-number': renderBigNumber, 'bar-chart': renderBarChart, 'image-led': renderImageLed, 'image-grid': renderImageGrid, custom: renderCustom, timeline: renderTimeline, acknowledgements: renderAcknowledgements, 'appendix-divider': renderDivider };

function renderSlide(slide, deck) { return (renderers[slide.pattern] || renderBullets)(slide, deck); }

module.exports = { renderSlide, renderers, rich, brand, chromeTop, chromeBot };
