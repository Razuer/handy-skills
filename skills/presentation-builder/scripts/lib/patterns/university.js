const seminar = require('./seminar');
const { escapeHtml, ordinal, RAW_HTML_WARNING } = seminar;

function valueFor(value, lang = 'en') {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value[lang] ?? value.en ?? value.pl ?? '';
  return value ?? '';
}

function i18n(value, lang = 'en') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const en = escapeHtml(value.en ?? value.pl ?? '');
    const pl = escapeHtml(value.pl ?? value.en ?? '');
    const visible = escapeHtml(value[lang] ?? value.en ?? value.pl ?? '');
    return `<span class="i18n" data-en="${en}" data-pl="${pl}">${visible}</span>`;
  }
  return escapeHtml(value ?? '');
}

const FIELD_LABELS = {
  Speaker: { en: 'Speaker', pl: 'Prelegent' },
  Date: { en: 'Date', pl: 'Data' },
  Advisor: { en: 'Advisor', pl: 'Promotor' },
  Programme: { en: 'Programme', pl: 'Program' },
  Program: { en: 'Programme', pl: 'Program' },
  Unit: { en: 'Unit', pl: 'Jednostka' },
  'Date · Venue': { en: 'Date · Venue', pl: 'Data · Miejsce' },
};

function fieldLabel(label, lang = 'en') {
  return i18n(FIELD_LABELS[label] || label, lang);
}

function counter(slide) { return `${ordinal(slide.ordinal)} / ${ordinal(slide.total)}`; }

function attrs(slide, extra = []) {
  const classes = ['slide', ...extra, ...(slide.classes || [])].filter(Boolean).join(' ');
  const style = slide.style ? ` style="${escapeHtml(slide.style)}"` : '';
  return `class="${escapeHtml(classes)}" data-label="${escapeHtml(slide.ordinalLabel)}"${style}`;
}

function lang(deck) {
  return deck.language?.default || deck.metadata?.language?.default || 'en';
}

function rail(slide, deck, title) {
  const l = lang(deck);
  return `<div class="rail"><div class="lockup"><img class="lang-en" src="assets/uni/pwr-en-horiz-white.png" alt="Wrocław University of Science and Technology" /><img class="lang-pl" src="assets/uni/pwr-pl-horiz-white.png" alt="Politechnika Wrocławska" /></div><div class="title-mid">${i18n(title ?? slide.railTitle ?? slide.title, l)}</div><div class="meta">${counter(slide)}</div></div>`;
}

function partners() {
  return `<div class="partners"><img src="assets/uni/hr-excellence.png" alt="" /><img src="assets/uni/unite.png" alt="" /></div>`;
}

function coverPartners() {
  return `<div class="partners"><img src="assets/uni/hr-excellence.png" alt="HR Excellence in Research" /><span class="sep"></span><img src="assets/uni/unite.png" alt="Unite! — University Network for Innovation, Technology and Engineering" /><span class="sep"></span><img src="assets/uni/iep-evaluated.png" alt="Evaluated by IEP — Institutional Evaluation Programme" /></div>`;
}

function footer(deck) {
  return `<div class="footer"><span class="speaker">${i18n(deck.metadata?.speaker ?? '', lang(deck))}</span>${partners()}</div>`;
}

function titleBlock(slide, deck) {
  const l = lang(deck);
  return `<div class="stack-tight">${slide.eyebrow ? `<div class="eyebrow">${i18n(slide.eyebrow, l)}</div>` : ''}<h2 class="title">${i18n(slide.title, l)}</h2><div class="title-rule"></div>${slide.subtitle ? `<p class="subtitle">${i18n(slide.subtitle, l)}</p>` : ''}</div>`;
}

function regular(slide, deck, content, options = {}) {
  if (slide.html) return `<section ${attrs(slide)}>${RAW_HTML_WARNING}\n${slide.html}</section>`;
  const fit = slide.fitFooter ? ' fit-footer' : '';
  const contentClasses = [fit.trim(), ...(options.contentClasses || [])].filter(Boolean).join(' ');
  return `<section ${attrs(slide, options.classes || [])}>${rail(slide, deck, options.railTitle)}<div class="content${contentClasses ? ` ${escapeHtml(contentClasses)}` : ''}"${slide.contentStyle ? ` style="${escapeHtml(slide.contentStyle)}"` : ''}>${content}</div>${footer(deck)}</section>`;
}

function itemList(items = [], deck) {
  const l = lang(deck);
  return `<ul class="bullets">${items.map((item) => `<li><div><span class="b-title">${i18n(item.title ?? item.label ?? item, l)}</span>${item.body || item.desc ? `<span class="b-desc">${i18n(item.body ?? item.desc, l)}</span>` : ''}</div></li>`).join('')}</ul>`;
}

function renderCover(slide, deck) {
  const l = lang(deck);
  const fields = slide.fields || {
    Speaker: deck.metadata?.speaker,
    Advisor: deck.metadata?.advisor,
    'Date · Venue': deck.metadata?.date || deck.metadata?.venue,
    Programme: deck.metadata?.programme || deck.metadata?.course,
  };
  return `<section ${attrs(slide, ['cover'])}>
    <div class="cover-left"><div class="cover-brand"><div class="pwr-mark"><img class="lang-en" src="assets/uni/pwr-en-horiz.png" alt="Wrocław University of Science and Technology" /><img class="lang-pl" src="assets/uni/pwr-pl-horiz.png" alt="Politechnika Wrocławska" /></div><div class="unit-line">${i18n(slide.unit ?? deck.metadata?.unit ?? {en:'Faculty of Information & Communication Technology', pl:'Wydział Informatyki i Telekomunikacji'}, l)}</div></div><div class="cover-title-block"><h1 class="cover-title">${i18n(slide.title ?? deck.metadata?.title, l)}</h1>${slide.subtitle || deck.metadata?.subtitle ? `<p class="cover-sub">${i18n(slide.subtitle ?? deck.metadata?.subtitle, l)}</p>` : ''}</div></div>
    <div class="cover-right"><div class="pwr-eagle"><img class="lang-en" src="assets/uni/pwr-en-vert-white.png" alt="Wrocław University of Science and Technology" /><img class="lang-pl" src="assets/uni/pwr-pl-vert-white.png" alt="Politechnika Wrocławska" /></div><dl class="meta-block">${Object.entries(fields).filter(([,v])=>v != null).slice(0,4).map(([k,v])=>`<div><dt>${fieldLabel(k, l)}</dt><dd>${i18n(v, l)}</dd></div>`).join('')}</dl></div>
    <div class="cover-strip"><div class="copy">© 2026 ${i18n({en:'Wrocław University of Science and Technology', pl:'Politechnika Wrocławska'}, l)} · pwr.edu.pl</div>${coverPartners()}</div>
  </section>`;
}

function renderAgenda(slide, deck) {
  const l = lang(deck);
  const body = `${titleBlock(slide, deck)}<ol class="agenda">${(slide.items || []).map((item,i)=>`<li><span class="idx">${ordinal(item.idx ?? i+1)}</span><span class="label">${i18n(item.title ?? item.label ?? item, l)}</span><span class="dur">${i18n(item.meta ?? item.duration ?? '', l)}</span></li>`).join('')}</ol>`;
  return regular(slide, deck, body);
}

function renderDivider(slide, deck) {
  const l = lang(deck);
  return `<section ${attrs(slide, ['divider', (slide.pattern === 'appendix-divider' || slide.dark) && 'divider-dark'])}>${rail(slide, deck, slide.railTitle ?? {en:`Section ${ordinal(slide.ordinal)}`, pl:`Sekcja ${ordinal(slide.ordinal)}`})}<div class="body-area"><div class="divider-num">${i18n(slide.number ?? slide.sectionNumber ?? ordinal(slide.ordinal), l)}</div><div class="divider-block"><div class="divider-eyebrow">${i18n(slide.eyebrow ?? {en:'Section', pl:'Sekcja'}, l)}</div><h2 class="divider-title">${i18n(slide.title, l)}</h2><div class="divider-rule"></div>${slide.subtitle ? `<p class="divider-lede">${i18n(slide.subtitle, l)}</p>` : ''}</div></div><div class="divider-foot"><span>${i18n(slide.meta ?? '', l)}</span><span>${i18n(slide.duration ?? slide.caption ?? '', l)}</span></div></section>`;
}

function renderDefinition(slide, deck) {
  const l = lang(deck);
  const side = slide.items ? `<div><div class="def-side-h">${i18n(slide.sideTitle ?? {en:'In practice', pl:'W praktyce'}, l)}</div>${itemList(slide.items, deck)}</div>` : '';
  return regular(slide, deck, `${titleBlock(slide, deck)}<div class="def-grid"><div class="def-card"><div class="def-tag">${i18n(slide.tag ?? {en:'Definition', pl:'Definicja'}, l)}</div><h3 class="def-term">${i18n(slide.term ?? slide.title, l)}</h3>${slide.notation ? `<p class="def-notation">${slide.notation}</p>` : ''}<p class="def-body">${i18n(slide.body ?? slide.definition ?? slide.subtitle, l)}</p></div>${side}</div>`);
}

function renderBullets(slide, deck) { return regular(slide, deck, `${titleBlock(slide, deck)}${itemList(slide.items || slide.bullets || [], deck)}`); }

function renderTable(slide, deck) {
  const l = lang(deck);
  const cols = slide.columns || [];
  const columnKey = (column) => column.key ?? column.id ?? column.label ?? column.title;
  const numeric = new Set(cols.map((c,i)=>(c.num||c.numeric||c.align==='right')?i:-1).filter(i=>i>=0));
  const head = `<thead><tr>${cols.map((c,i)=>`<th${numeric.has(i)?' class="num"':''}>${i18n(c.title ?? c.label ?? c, l)}</th>`).join('')}</tr></thead>`;
  const rows = (slide.rows || []).map(row => { const cells = Array.isArray(row) ? row : (row.cells || cols.map(c=>row[columnKey(c)])); return `<tr${row.best?' class="best"':''}>${cells.map((cell,i)=>tableCell(cell, numeric.has(i), l)).join('')}</tr>`; }).join('');
  return regular(slide, deck, `${titleBlock(slide, deck)}<table class="data"${slide.tableStyle ? ` style="${escapeHtml(slide.tableStyle)}"` : ''}>${head}<tbody>${rows}</tbody></table>${slide.caption ? `<div class="table-cap">${i18n(slide.caption, l)}</div>`:''}`);
}

function tableCell(cell, numeric, l) {
  const isCellObject = cell && typeof cell === 'object' && !Array.isArray(cell) && !('en' in cell) && !('pl' in cell);
  const classes = [numeric && 'num'];
  let value = cell;
  if (isCellObject) {
    value = cell.text ?? cell.value ?? cell.label ?? '';
    if (cell.class) classes.push(cell.class);
    if (Array.isArray(cell.classes)) classes.push(...cell.classes);
  }
  const cls = classes.filter(Boolean).join(' ');
  return `<td${cls ? ` class="${escapeHtml(cls)}"` : ''}>${i18n(value, l)}</td>`;
}

function compareCol(item, deck, alt) {
  const l = lang(deck);
  return `<div class="compare${alt?' alt':''}"><div class="compare-tag">${i18n(item.tag ?? '', l)}</div><h3 class="compare-h">${i18n(item.title ?? item.label, l)}</h3>${item.body ? `<p class="compare-body">${i18n(item.body, l)}</p>`:''}<ul class="compare-list">${(item.items||item.points||[]).map(p=>`<li>${i18n(p, l)}</li>`).join('')}</ul></div>`;
}
function renderComparison(slide, deck) { return regular(slide, deck, `${titleBlock(slide, deck)}<div class="cols">${(slide.items||slide.columns||[]).slice(0,2).map((it,i)=>compareCol(it,deck,i===1)).join('')}</div>`); }
function renderComparison3(slide, deck) { return regular(slide, deck, `${titleBlock(slide, deck)}<div class="cols-3">${(slide.items||slide.columns||[]).slice(0,3).map((it,i)=>compareCol(it,deck,i>0)).join('')}</div>`); }
function renderContributions(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide, deck)}<ol class="claims${slide.fitFooter?' fit-footer':''}">${(slide.items||[]).map((it,i)=>`<li><div class="idx">${ordinal(i+1)}</div><h3 class="claim-h">${i18n(it.title??it.label,l)}</h3><p class="claim-d">${i18n(it.body??it.desc??'',l)}</p>${it.tag?`<div class="claim-tag">${i18n(it.tag,l)}</div>`:''}</li>`).join('')}</ol>`); }
function renderLimitations(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide, deck)}<ul class="limits">${(slide.items||[]).map(it=>`<li><div class="lim-sign">${i18n(it.sign??'×',l)}</div><div><h3 class="lim-h">${i18n(it.title??it.label,l)}</h3><p class="lim-d">${i18n(it.body??it.desc??'',l)}</p></div><div class="lim-fix"><b>${i18n(it.fixLabel??{en:'Mitigation',pl:'Mitigacja'},l)}</b>${i18n(it.fix??'',l)}</div></li>`).join('')}</ul>`); }
function renderReferences(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide, deck)}<ol class="refs">${(slide.items||slide.references||[]).map((r,i)=>{ const objectRef = r && typeof r === 'object' && !Array.isArray(r); return `<li><span class="ref-idx">[${i+1}]</span><span class="ref-body"><span class="ref-authors">${i18n(objectRef ? (r.authors??r.title) : r,l)}</span>${objectRef && r.authors && r.title ? `<span class="ref-title"> ${i18n(r.title,l)}</span>`:''}${objectRef && r.venue?`<span class="ref-venue"> ${i18n(r.venue,l)}</span>`:''}${objectRef && r.doi?`<span class="ref-doi">${i18n(r.doi,l)}</span>`:''}</span></li>`; }).join('')}</ol>`); }
function renderQa(slide, deck) { const l=lang(deck); const fields=slide.fields||{Contact:slide.contact,Slides:slide.slides,Code:slide.code}; return `<section ${attrs(slide,['qa'])}>${rail(slide, deck, slide.railTitle ?? {en:'Q&A',pl:'Pytania'})}<div class="qa-mid"><div class="qa-eye">${i18n(slide.eyebrow??{en:'Thank you',pl:'Dziękuję'},l)}</div><h2 class="qa-h">${i18n(slide.title??{en:'Q&A',pl:'Pytania'},l)}</h2>${slide.subtitle?`<p class="qa-sub">${i18n(slide.subtitle,l)}</p>`:''}</div><dl class="qa-bottom">${Object.entries(fields).filter(([,v])=>v).slice(0,3).map(([k,v])=>`<div><dt>${fieldLabel(k,l)}</dt><dd>${i18n(v,l)}</dd></div>`).join('')}</dl></section>`; }

function slotId(slide, item, i) { return item?.id || item?.slotId || `${slide.id || `slide-${slide.ordinal}`}-${i+1}`; }
function renderQuote(slide, deck) { const l=lang(deck); return regular(slide, deck, `<div class="quote"><div class="mark">“</div><p class="body">${i18n(slide.quote??slide.body??slide.title,l)}</p><div class="attr"><span class="name">${i18n(slide.author??'',l)}</span>${slide.source?`<span class="ref">${i18n(slide.source,l)}</span>`:''}</div></div>`); }
function renderFullBleed(slide, deck) { const l=lang(deck); const image=slide.image||{}; return `<section ${attrs(slide,['bleed'])}>${rail(slide,deck,slide.railTitle)}<div class="bleed-img"><image-slot id="${escapeHtml(slotId(slide,image,0))}" shape="rect" placeholder="${escapeHtml(valueFor(image.placeholder??slide.placeholder??'Drop image here',l))}"></image-slot></div><div class="bleed-shade"></div><div class="bleed-content"><div class="bleed-eye">${i18n(slide.eyebrow??'',l)}</div><h2 class="bleed-title">${i18n(slide.title,l)}</h2>${slide.subtitle?`<p class="bleed-sub">${i18n(slide.subtitle,l)}</p>`:''}</div>${slide.credit || image.credit ? `<div class="bleed-cred">${i18n(slide.credit??image.credit,l)}</div>`:''}</section>`; }
function renderPipeline(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide,deck)}<div class="pipeline">${(slide.steps||slide.items||[]).map((s,i)=>`<div class="step"><div class="step-idx">${ordinal(i+1)}</div><h3 class="step-h">${i18n(s.title??s.label,l)}</h3><p class="step-d">${i18n(s.body??s.desc??'',l)}</p>${s.tag?`<div class="step-tag">${i18n(s.tag,l)}</div>`:''}</div>`).join('')}</div>`); }
function renderEquation(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide,deck)}<div class="eq-grid"><div class="eq-display"><p class="eq">${slide.equation ?? i18n(slide.body ?? '', l)}</p>${slide.caption?`<p class="eq-cap">${i18n(slide.caption,l)}</p>`:''}</div><dl class="eq-vars">${(slide.variables||[]).map(v=>`<div><dt>${v.symbol ?? i18n(v.term??'',l)}</dt><dd>${i18n(v.desc??v.body??'',l)}</dd></div>`).join('')}</dl></div>`); }
function renderCode(slide, deck) { const l=lang(deck); const lines=String(valueFor(slide.code||'',l)).split('\n'); return regular(slide, deck, `${titleBlock(slide,deck)}<div class="code-grid"><div class="code-block"><div class="filename"><span>${i18n(slide.filename??'example',l)}</span><span>${i18n(slide.language??'',l)}</span></div>${lines.map((line,i)=>`<div class="line${line?'':' blank'}"><span class="ln">${i+1}</span><span>${escapeHtml(line)}</span></div>`).join('')}</div><div class="code-notes">${(slide.items||slide.notesList||[]).map(n=>`<div class="code-note"><h4>${i18n(n.title??n.label,l)}</h4><p>${i18n(n.body??n.desc??'',l)}</p></div>`).join('')}</div></div>`); }
function renderBigNumber(slide, deck) { const l=lang(deck); const heading = slide.noTitle || slide.titleBlock === false ? '' : titleBlock(slide,deck); return regular(slide, deck, `${heading}<div class="stat-row"><div><p class="big-num">${i18n(slide.value??slide.number??'',l)}${slide.unit?`<span class="unit">${i18n(slide.unit,l)}</span>`:''}</p></div><div class="stat-side"><div class="stat-label">${i18n(slide.label??'',l)}</div><p class="stat-desc">${i18n(slide.body??slide.description??'',l)}</p>${slide.footnote?`<div class="stat-foot">${i18n(slide.footnote,l)}</div>`:''}</div></div>`); }
function renderBarChart(slide, deck) { const l=lang(deck); const bars=slide.bars||slide.items||[]; const notes=slide.chartNotes||slide.callouts||[]; return regular(slide, deck, `${titleBlock(slide,deck)}<div class="chart-wrap"><div class="bar-chart"><div class="bars-row">${bars.map(b=>`<div class="bar${b.win?' win':''}" style="height:${escapeHtml(b.height??b.value??50)}%"><span class="bar-val">${i18n(b.value??'',l)}</span></div>`).join('')}</div><div class="bar-labels">${bars.map(b=>`<div class="bar-label">${i18n(b.label??'',l)}</div>`).join('')}</div></div><div class="chart-side"><p class="chart-callout-num">${i18n(slide.calloutValue??'',l)}</p><p class="chart-callout-lbl">${i18n(slide.callout??'',l)}</p><ul>${notes.map(n=>`<li>${i18n(n,l)}</li>`).join('')}</ul></div></div>`); }
function renderTimeline(slide, deck) { const l=lang(deck); const items=slide.items||[]; const style=items.length ? ` style="--timeline-cols:${escapeHtml(items.length)}"` : ''; return regular(slide, deck, `${titleBlock(slide,deck)}<div class="timeline"${style}>${items.map((it,i)=>{ const alt = it.alt === true; return `<div class="tl-col${alt?' alt':''}"><div class="tl-month">${i18n(it.date??it.month??it.label,l)}</div><div class="tl-pill${(alt || i%2)?' alt':''}">${i18n(it.title??'',l)}</div><p class="tl-note">${i18n(it.body??it.note??'',l)}</p></div>`; }).join('')}</div>`); }
function renderImageLed(slide, deck) { const l=lang(deck); const image=slide.image||{}; const caption=slide.captionRow||slide.caption; const heading = `${slide.eyebrow ? `<div class="eyebrow">${i18n(slide.eyebrow,l)}</div>` : ''}<h2 class="title">${i18n(slide.title,l)}</h2><div class="title-rule"></div>${slide.subtitle ? `<p class="subtitle">${i18n(slide.subtitle,l)}</p>` : ''}`; const side = `<div class="image-side stack-tight">${heading}${caption?`<div class="caption-row">${Array.isArray(caption) ? caption.map(c=>`<span>${i18n(c,l)}</span>`).join('') : `<span>${i18n(caption,l)}</span>`}</div>`:''}${slide.items?itemList(slide.items,deck):''}</div>`; return regular(slide, deck, `${side}<div class="image-frame"><image-slot id="${escapeHtml(slotId(slide,image,0))}" shape="rect" placeholder="${escapeHtml(valueFor(image.placeholder??slide.placeholder??'Drop image here',l))}"></image-slot></div>`, { contentClasses: ['image-led'] }); }
function renderImageGrid(slide, deck) { const l=lang(deck); return regular(slide, deck, `${titleBlock(slide,deck)}<div class="img-grid">${(slide.images||slide.items||[]).map((img,i)=>`<div class="img-tile"><div class="img-tile-frame"><image-slot id="${escapeHtml(slotId(slide,img,i))}" shape="rect" placeholder="${escapeHtml(valueFor(img.placeholder??`Image ${i+1}`,l))}"></image-slot></div><div class="img-tile-cap"><span>${i18n(img.caption??img.title??'',l)}</span>${img.meta?`<span class="${escapeHtml(img.metaClass??'pos')}">${i18n(img.meta,l)}</span>`:''}</div></div>`).join('')}</div>`); }
function renderAcknowledgements(slide, deck) { const l=lang(deck); return regular(slide,deck,`${titleBlock(slide,deck)}<div class="ack-grid">${(slide.groups||slide.items||[]).map(g=>`<div class="ack-col"><div class="ack-tag">${i18n(g.title??g.label,l)}</div><ul>${(g.items||[]).map(it=>`<li>${i18n(it.name??it.title??it,l)}${it.role?`<span class="role">${i18n(it.role,l)}</span>`:''}${it.grant?`<span class="grant">${i18n(it.grant,l)}</span>`:''}</li>`).join('')}</ul></div>`).join('')}</div>`); }

const renderers = { cover: renderCover, agenda: renderAgenda, 'section-divider': renderDivider, definition: renderDefinition, bullets: renderBullets, table: renderTable, comparison: renderComparison, 'comparison-3col': renderComparison3, contributions: renderContributions, limitations: renderLimitations, references: renderReferences, qa: renderQa, quote: renderQuote, 'full-bleed': renderFullBleed, pipeline: renderPipeline, equation: renderEquation, code: renderCode, 'big-number': renderBigNumber, 'bar-chart': renderBarChart, 'image-led': renderImageLed, 'image-grid': renderImageGrid, timeline: renderTimeline, acknowledgements: renderAcknowledgements, 'appendix-divider': renderDivider };

function renderSlide(slide, deck) {
  return (renderers[slide.pattern] || renderBullets)(slide, deck);
}

module.exports = { renderSlide, renderers, i18n, valueFor, rail, footer, fieldLabel };
