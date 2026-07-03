const RAW_HTML_WARNING = '<!-- WARNING: raw slide.html block emitted by renderer escape hatch -->';
const { renderCustomLayout, slideStyle } = require('./custom');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function text(value, fallback = '') {
  if (value && typeof value === 'object') return value.en ?? value.pl ?? fallback;
  return value ?? fallback;
}

function attrs(slide, extra = []) {
  const classes = ['slide', ...extra, ...(slide.classes || [])].filter(Boolean).join(' ');
  const style = slideStyle(slide);
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';
  return `class="${escapeHtml(classes)}" data-label="${escapeHtml(slide.ordinalLabel)}"${styleAttr}`;
}

function ordinal(n) { return String(n).padStart(2, '0'); }
function counter(slide) { return `${ordinal(slide.ordinal)} / ${ordinal(slide.total)}`; }
function shortTitle(slide) { return text(slide.shortTitle ?? slide.kicker ?? slide.title, ''); }

function splitBreadcrumb(value) {
  const label = text(value, '').trim();
  if (!label) return { section: '', detail: '' };
  const parts = label.split(/\s*(?:·|—|–)\s*/).filter(Boolean);
  if (parts.length < 2) return { section: label, detail: '' };
  return { section: parts[0], detail: parts.slice(1).join(' · ') };
}

function headerLeft(slide) {
  if (slide.headerLeft === false) return '';
  const explicit = text(slide.headerLeft ?? slide.headerSection ?? slide.section, '').trim();
  if (explicit) return explicit;
  const { section } = splitBreadcrumb(slide.eyebrow);
  if (!section) return '';
  if (slide.pattern === 'agenda' && /^outline$/i.test(section)) return 'Overview';
  if (slide.pattern === 'acknowledgements') return 'Closing';
  if (slide.pattern === 'references') return 'Sources';
  return section;
}

function headerRight(slide) {
  if (slide.headerRight === false) return '';
  const explicit = text(slide.headerRight ?? slide.headerTopic, '').trim();
  if (explicit) return explicit;
  const { detail } = splitBreadcrumb(slide.eyebrow);
  if (detail) return detail;
  return shortTitle(slide);
}

function renderHeader(slide) {
  const left = headerLeft(slide);
  const right = headerRight(slide);
  if (!left && !right) return '';
  return `<div class="slide-header"><span class="eyebrow">${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>`;
}

function contentEyebrow(slide) {
  return text(slide.contentEyebrow ?? slide.titleEyebrow ?? '', '').trim();
}

function titleBlock(slide) {
  const action = slide.actionTitle || slide.titleAction || slide.title;
  const eyebrow = contentEyebrow(slide);
  return `<div class="stack-tight">
    ${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
    <h2 class="title"><span class="title-topic">${escapeHtml(text(slide.title))}</span><span class="title-action">${escapeHtml(text(action))}</span></h2>
    ${slide.subtitle ? `<p class="subtitle">${escapeHtml(text(slide.subtitle))}</p>` : ''}
  </div>`;
}

function regular(slide, metadata, content, options = {}) {
  if (slide.html) return `<section ${attrs(slide)}>${RAW_HTML_WARNING}\n${slide.html}</section>`;
  const footer = escapeHtml(text(metadata.footer ?? metadata.speaker ?? ''));
  const header = options.header !== false ? renderHeader(slide) : '';
  const fit = slide.fitFooter ? ' fit-footer' : '';
  const contentClasses = [fit.trim(), ...(options.contentClasses || [])].filter(Boolean).join(' ');
  return `<section ${attrs(slide, options.classes || [])}>
    ${header}
    <div class="content${contentClasses ? ` ${escapeHtml(contentClasses)}` : ''}"${slide.contentStyle ? ` style="${escapeHtml(slide.contentStyle)}"` : ''}>${content}</div>
    <div class="slide-footer"><span>${footer}</span><span>${counter(slide)}</span></div>
  </section>`;
}

function itemList(items = [], cls = 'bullets') {
  return `<ul class="${cls}">${items.map((item, i) => `<li><span class="idx">${escapeHtml(item.idx ?? ['i.','ii.','iii.','iv.','v.','vi.'][i] ?? `${i+1}.`)}</span><div><span class="li-title">${escapeHtml(text(item.title ?? item.label ?? item))}</span>${item.body || item.desc ? `<span class="li-desc">${escapeHtml(text(item.body ?? item.desc))}</span>` : ''}</div></li>`).join('')}</ul>`;
}

function renderCover(slide) {
  const fields = slide.fields || { Speaker: slide.speaker, Date: slide.date, Advisor: slide.advisor, Duration: slide.duration };
  return `<section ${attrs(slide, ['cover'])}>
    <div class="cover-top"><span><span class="dot">●</span> ${escapeHtml(text(slide.label ?? slide.event ?? 'SEMINAR'))}</span><span>${escapeHtml(text(slide.context ?? slide.course ?? ''))}</span></div>
    <div class="cover-mid"><div class="cover-eyebrow">${escapeHtml(text(slide.eyebrow ?? 'Student Seminar'))}</div><h1 class="cover-title">${escapeHtml(text(slide.title))}</h1>${slide.subtitle ? `<p class="cover-sub">${escapeHtml(text(slide.subtitle))}</p>` : ''}</div>
    <dl class="cover-bottom">${Object.entries(fields).filter(([,v]) => v != null).slice(0,4).map(([k,v]) => `<div><dt>${escapeHtml(text(k))}</dt><dd>${escapeHtml(text(v))}</dd></div>`).join('')}</dl>
  </section>`;
}

function renderAgenda(slide, metadata) {
  const items = slide.items || [];
  const body = `${titleBlock(slide)}<ol class="numbered agenda-list">${items.map((item, i) => `<li><span class="idx">${ordinal(item.idx ?? i+1)}</span><span class="li-title">${escapeHtml(text(item.title ?? item.label ?? item))}</span><span class="li-meta">${escapeHtml(text(item.meta ?? item.duration ?? ''))}</span></li>`).join('')}</ol>`;
  return regular(slide, metadata, body);
}

function renderDivider(slide) {
  const dark = slide.pattern === 'appendix-divider' || slide.dark;
  return `<section ${attrs(slide, ['divider', dark && 'divider-dark'])}>
    <div class="divider-num">${escapeHtml(text(slide.number ?? slide.sectionNumber ?? ordinal(slide.ordinal)))}</div>
    <h2 class="divider-title">${escapeHtml(text(slide.title))}</h2>
    <div class="divider-meta"><span>${escapeHtml(text(slide.meta ?? `Section ${ordinal(slide.ordinal)} of ${ordinal(slide.total)}`))}</span><span>${escapeHtml(text(slide.duration ?? slide.caption ?? ''))}</span></div>
  </section>`;
}

function renderDefinition(slide, metadata) {
  const side = slide.items ? `<div><div class="def-side-h">${escapeHtml(text(slide.sideTitle ?? 'In practice'))}</div>${itemList(slide.items)}</div>` : '';
  return regular(slide, metadata, `${titleBlock(slide)}<div class="def-grid"><div class="def-card"><div class="def-tag">${escapeHtml(text(slide.tag ?? 'Definition'))}</div><h3 class="def-term">${escapeHtml(text(slide.term ?? slide.title))}</h3>${slide.notation ? `<p class="def-notation">${slide.notation}</p>` : ''}<p class="def-body">${escapeHtml(text(slide.body ?? slide.definition ?? slide.subtitle))}</p></div>${side}</div>`);
}

function renderBullets(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}${itemList(slide.items || slide.bullets || [])}`); }

function renderTable(slide, metadata) {
  const columns = slide.columns || [];
  const columnKey = (column) => column.key ?? column.id ?? column.label ?? column.title;
  const numeric = new Set(columns.map((c, i) => (c.num || c.numeric || c.align === 'right') ? i : -1).filter(i => i >= 0));
  const header = `<thead><tr>${columns.map((c, i) => `<th${numeric.has(i) ? ' class="num"' : ''}>${escapeHtml(text(c.title ?? c.label ?? c))}</th>`).join('')}</tr></thead>`;
  const rows = (slide.rows || []).map(row => {
    const cells = Array.isArray(row) ? row : (row.cells || columns.map(c => row[columnKey(c)]));
    const cls = row.best ? ' class="best"' : '';
    return `<tr${cls}>${cells.map((cell, i) => tableCell(cell, numeric.has(i))).join('')}</tr>`;
  }).join('');
  return regular(slide, metadata, `${titleBlock(slide)}<table class="data"${slide.tableStyle ? ` style="${escapeHtml(slide.tableStyle)}"` : ''}>${header}<tbody>${rows}</tbody></table>${slide.caption ? `<div class="table-cap">${escapeHtml(text(slide.caption))}</div>` : ''}`);
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
  return `<td${cls ? ` class="${escapeHtml(cls)}"` : ''}>${escapeHtml(text(value))}</td>`;
}

function compareCol(item, alt) {
  return `<div class="compare-col${alt ? ' alt' : ''}"><div class="compare-tag">${escapeHtml(text(item.tag ?? ''))}</div><h3 class="compare-h">${escapeHtml(text(item.title ?? item.label))}</h3>${item.body ? `<p class="compare-body">${escapeHtml(text(item.body))}</p>` : ''}<ul class="compare-list">${(item.items || item.points || []).map(p => `<li>${escapeHtml(text(p))}</li>`).join('')}</ul></div>`;
}
function renderComparison(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="cols-2">${(slide.items || slide.columns || []).slice(0,2).map((it,i)=>compareCol(it,i===1)).join('')}</div>`); }
function renderComparison3(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="cols-3">${(slide.items || slide.columns || []).slice(0,3).map((it,i)=>compareCol(it,i>0)).join('')}</div>`); }

function renderContributions(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<ol class="claims${slide.fitFooter ? ' fit-footer' : ''}">${(slide.items || []).map((it,i)=>`<li><div class="idx">${ordinal(i+1)}</div><h3 class="claim-h">${escapeHtml(text(it.title ?? it.label))}</h3><p class="claim-d">${escapeHtml(text(it.body ?? it.desc ?? ''))}</p>${it.tag ? `<div class="claim-tag">${escapeHtml(text(it.tag))}</div>`:''}</li>`).join('')}</ol>`); }
function renderLimitations(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<ul class="limits">${(slide.items || []).map(it=>`<li><div class="lim-sign">${escapeHtml(text(it.sign ?? '×'))}</div><div><h3 class="lim-h">${escapeHtml(text(it.title ?? it.label))}</h3><p class="lim-d">${escapeHtml(text(it.body ?? it.desc ?? ''))}</p></div><div class="lim-fix"><b>${escapeHtml(text(it.fixLabel ?? 'Mitigation'))}</b>${escapeHtml(text(it.fix ?? ''))}</div></li>`).join('')}</ul>`); }
function renderReferences(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<ol class="refs">${(slide.items || slide.references || []).map((r,i)=>{ const objectRef = r && typeof r === 'object' && !Array.isArray(r); return `<li><span class="ref-idx">[${i+1}]</span><span class="ref-body"><span class="ref-authors">${escapeHtml(text(objectRef ? (r.authors ?? r.title) : r))}</span>${objectRef && r.authors && r.title ? `<span class="ref-title"> ${escapeHtml(text(r.title))}</span>`:''}${objectRef && r.venue ? `<span class="ref-venue"> ${escapeHtml(text(r.venue))}</span>`:''}${objectRef && r.doi ? `<span class="ref-doi">${escapeHtml(text(r.doi))}</span>`:''}</span></li>`; }).join('')}</ol>`); }

function renderQa(slide) {
  const fields = slide.fields || { Contact: slide.contact, Slides: slide.slides, Code: slide.code };
  return `<section ${attrs(slide, ['qa'])}><div class="cover-top"><span><span class="dot">●</span> ${counter(slide)}</span><span>${escapeHtml(text(slide.context ?? 'End of talk'))}</span></div><div class="qa-mid"><div class="qa-eyebrow">${escapeHtml(text(slide.eyebrow ?? 'Thank you'))}</div><h2 class="qa-h">${escapeHtml(text(slide.title ?? 'Q&A'))}</h2>${slide.subtitle ? `<p class="qa-sub">${escapeHtml(text(slide.subtitle))}</p>` : ''}</div><dl class="qa-bottom">${Object.entries(fields).filter(([,v])=>v).slice(0,3).map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(text(v))}</dd></div>`).join('')}</dl></section>`;
}

function imageObject(item) {
  if (item && typeof item === 'object' && !Array.isArray(item)) return item;
  if (typeof item === 'string') return { src: item };
  return {};
}

function slotId(slide, item, i) {
  const image = imageObject(item);
  return image.id || image.slotId || `${slide.id || `slide-${slide.ordinal}`}-${i+1}`;
}

function attrString(entries) {
  return entries
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');
}

function renderImageSlot(slide, item, i, options = {}) {
  const image = imageObject(item);
  const resolveText = options.text || text;
  const fallback = options.placeholder || 'Drop image here';
  const attrs = [
    ['id', slotId(slide, image, i)],
    ['shape', image.shape ?? 'rect'],
    ['placeholder', resolveText(image.placeholder ?? slide.placeholder ?? fallback)],
    ['src', resolveText(image.src)],
    ['fit', image.fit],
    ['position', image.position],
    ['radius', image.radius],
    ['mask', image.mask],
    ['role', image.alt || slide.alt ? 'img' : undefined],
    ['aria-label', resolveText(image.alt ?? slide.alt)],
  ];
  return `<image-slot ${attrString(attrs)}></image-slot>`;
}
function renderQuote(slide, metadata) { return regular(slide, metadata, `<div class="quote-wrap"><div class="quote-mark">“</div><div><p class="quote-body">${escapeHtml(text(slide.quote ?? slide.body ?? slide.title))}</p><div class="quote-attr"><span class="name">${escapeHtml(text(slide.author ?? ''))}</span>${slide.source ? `<span>·</span><span>${escapeHtml(text(slide.source))}</span>`:''}${slide.year ? `<span>·</span><span>${escapeHtml(text(slide.year))}</span>`:''}</div></div></div>`, { header: slide.header === false || slide.hideHeader ? false : undefined }); }
function renderFullBleed(slide) { const image=slide.image||{}; const eye=contentEyebrow(slide); return `<section ${attrs(slide, ['bleed'])}><div class="bleed-img">${renderImageSlot(slide, image, 0)}</div><div class="bleed-shade"></div><div class="bleed-chrome"><span>${escapeHtml(text(slide.eyebrow ?? ''))}</span><span>${counter(slide)}</span></div><div class="bleed-content">${eye ? `<div class="bleed-eye">${escapeHtml(eye)}</div>` : ''}<h2 class="bleed-title">${escapeHtml(text(slide.title))}</h2>${slide.subtitle ? `<p class="bleed-sub">${escapeHtml(text(slide.subtitle))}</p>`:''}</div>${slide.credit || image.credit ? `<div class="bleed-cred">${escapeHtml(text(slide.credit ?? image.credit))}</div>`:''}</section>`; }
function renderPipeline(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="pipeline">${(slide.steps || slide.items || []).map((s,i)=>`<div class="step"><div class="step-idx">${ordinal(i+1)}</div><h3 class="step-h">${escapeHtml(text(s.title ?? s.label))}</h3><p class="step-d">${escapeHtml(text(s.body ?? s.desc ?? ''))}</p>${s.tag ? `<div class="step-tag">${escapeHtml(text(s.tag))}</div>`:''}</div>`).join('')}</div>`); }
function renderEquation(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="eq-grid"><div class="eq-display"><p class="eq">${slide.equation ?? escapeHtml(text(slide.body ?? ''))}</p>${slide.caption ? `<p class="eq-cap">${escapeHtml(text(slide.caption))}</p>`:''}</div><dl class="eq-vars">${(slide.variables || []).map(v=>`<div><dt>${v.symbol ?? escapeHtml(text(v.term ?? ''))}</dt><dd>${escapeHtml(text(v.desc ?? v.body ?? ''))}</dd></div>`).join('')}</dl></div>`); }
function renderCode(slide, metadata) { const lines = String(slide.code || '').split('\n'); return regular(slide, metadata, `${titleBlock(slide)}<div class="code-grid"><div class="code-block"><div class="filename"><span>${escapeHtml(text(slide.filename ?? 'example'))}</span><span>${escapeHtml(text(slide.language ?? ''))}</span></div>${lines.map((l,i)=>`<div class="line${l ? '' : ' blank'}"><span class="ln">${i+1}</span><span>${escapeHtml(l)}</span></div>`).join('')}</div><div class="code-notes">${(slide.items || slide.notesList || []).map(n=>`<div class="code-note"><h4>${escapeHtml(text(n.title ?? n.label))}</h4><p>${escapeHtml(text(n.body ?? n.desc ?? ''))}</p></div>`).join('')}</div></div>`); }
function renderBigNumber(slide, metadata) { const heading = slide.noTitle || slide.titleBlock === false ? '' : titleBlock(slide); return regular(slide, metadata, `${heading}<div class="stat-grid"><div><p class="big-num">${escapeHtml(text(slide.value ?? slide.number ?? ''))}${slide.unit ? `<span class="unit">${escapeHtml(text(slide.unit))}</span>`:''}</p></div><div class="stat-side"><div class="stat-label">${escapeHtml(text(slide.label ?? ''))}</div><p class="stat-desc">${escapeHtml(text(slide.body ?? slide.description ?? ''))}</p>${slide.footnote ? `<div class="stat-foot">${escapeHtml(text(slide.footnote))}</div>`:''}</div></div>`); }
function renderBarChart(slide, metadata) { const bars=slide.bars||slide.items||[]; const notes=slide.chartNotes||slide.callouts||[]; return regular(slide, metadata, `${titleBlock(slide)}<div class="chart-wrap"><div class="bar-chart"><div class="bars-row">${bars.map(b=>`<div class="bar${b.win?' win':''}" style="height:${escapeHtml(b.height ?? b.value ?? 50)}%"><span class="bar-val">${escapeHtml(text(b.value ?? ''))}</span></div>`).join('')}</div><div class="bar-labels">${bars.map(b=>`<div class="bar-label">${escapeHtml(text(b.label ?? ''))}</div>`).join('')}</div></div><div class="chart-side"><p class="chart-callout-num">${escapeHtml(text(slide.calloutValue ?? ''))}</p><p class="chart-callout-lbl">${escapeHtml(text(slide.callout ?? ''))}</p><ul>${notes.map(n=>`<li>${escapeHtml(text(n))}</li>`).join('')}</ul></div></div>`); }
function renderImageLed(slide, metadata) { const image=slide.image||{}; const caption = slide.captionRow || slide.caption; const action = slide.actionTitle || slide.titleAction || slide.title; const eyebrow = contentEyebrow(slide); const heading = `${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ''}<h2 class="title"><span class="title-topic">${escapeHtml(text(slide.title))}</span><span class="title-action">${escapeHtml(text(action))}</span></h2>${slide.subtitle ? `<p class="subtitle">${escapeHtml(text(slide.subtitle))}</p>` : ''}`; const side = `<div class="image-side stack-tight">${heading}${caption ? `<div class="caption-row">${Array.isArray(caption) ? caption.map(c=>`<span>${escapeHtml(text(c))}</span>`).join('') : `<span>${escapeHtml(text(caption))}</span>`}</div>`:''}${slide.items ? itemList(slide.items) : ''}</div>`; return regular(slide, metadata, `${side}<div class="image-frame">${renderImageSlot(slide, image, 0)}</div>`, { contentClasses: ['image-led'] }); }
function renderImageGrid(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="img-grid">${(slide.images || slide.items || []).map((img,i)=>`<div class="img-tile"><div class="img-tile-frame">${renderImageSlot(slide, img, i, { placeholder: `Image ${i+1}` })}</div><div class="img-tile-cap"><span>${escapeHtml(text(img.caption ?? img.title ?? ''))}</span>${img.meta ? `<span class="${escapeHtml(img.metaClass ?? 'pos')}">${escapeHtml(text(img.meta))}</span>`:''}</div></div>`).join('')}</div>`); }
function renderTimeline(slide, metadata) { const items = slide.items || []; const style = items.length ? ` style="--timeline-cols:${escapeHtml(items.length)}"` : ''; return regular(slide, metadata, `${titleBlock(slide)}<div class="timeline"${style}>${items.map((it,i)=>{ const alt = it.alt === true; return `<div class="tl-col${alt?' alt':''}"><div class="tl-month">${escapeHtml(text(it.date ?? it.month ?? it.label))}</div><div class="tl-pill${(alt || i%2)?' alt':''}">${escapeHtml(text(it.title ?? ''))}</div><p class="tl-note">${escapeHtml(text(it.body ?? it.note ?? ''))}</p></div>`; }).join('')}</div>`); }
function renderAcknowledgements(slide, metadata) { return regular(slide, metadata, `${titleBlock(slide)}<div class="ack-grid">${(slide.groups || slide.items || []).map(g=>`<div class="ack-col"><div class="ack-tag">${escapeHtml(text(g.title ?? g.label))}</div><ul>${(g.items || []).map(it=>`<li>${escapeHtml(text(it.name ?? it.title ?? it))}${it.role ? `<span class="role">${escapeHtml(text(it.role))}</span>`:''}${it.grant ? `<span class="grant">${escapeHtml(text(it.grant))}</span>`:''}</li>`).join('')}</ul></div>`).join('')}</div>`); }

function renderCustom(slide, metadata, deck) {
  return regular(slide, metadata, renderCustomLayout(slide, deck, {
    escapeHtml,
    format: (value) => escapeHtml(text(value)),
    titleBlock: () => titleBlock(slide),
    renderImage: (owner, image, index) => renderImageSlot(owner, image, index, { placeholder: `Image ${index + 1}` }),
  }), { contentClasses: ['custom-content'] });
}

const renderers = { cover: renderCover, agenda: renderAgenda, 'section-divider': renderDivider, definition: renderDefinition, bullets: renderBullets, table: renderTable, comparison: renderComparison, 'comparison-3col': renderComparison3, contributions: renderContributions, limitations: renderLimitations, references: renderReferences, qa: renderQa, quote: renderQuote, 'full-bleed': renderFullBleed, pipeline: renderPipeline, equation: renderEquation, code: renderCode, 'big-number': renderBigNumber, 'bar-chart': renderBarChart, 'image-led': renderImageLed, 'image-grid': renderImageGrid, custom: renderCustom, timeline: renderTimeline, acknowledgements: renderAcknowledgements, 'appendix-divider': renderDivider };

function renderSlide(slide, deck) {
  const renderer = renderers[slide.pattern] || renderBullets;
  return renderer(slide, deck.metadata || {}, deck);
}

module.exports = { renderSlide, renderers, escapeHtml, text, ordinal, RAW_HTML_WARNING, imageObject, renderImageSlot };
