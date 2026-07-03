const DEFAULT_BLOCK_TYPE = 'text';

const BLOCK_TYPE_ALIASES = {
  stat: 'metric',
  number: 'metric',
  photo: 'image',
  figure: 'image',
  picture: 'image',
  images: 'gallery',
  'image-grid': 'gallery',
  miniGrid: 'gallery',
  'mini-grid': 'gallery',
  panel: 'card',
  callout: 'card',
  row: 'group',
  column: 'group',
  stack: 'group',
};

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanToken(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function blockType(block) {
  const raw = block && typeof block === 'object' ? (block.type || block.kind || DEFAULT_BLOCK_TYPE) : DEFAULT_BLOCK_TYPE;
  return BLOCK_TYPE_ALIASES[raw] || raw || DEFAULT_BLOCK_TYPE;
}

function classList(values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(/\s+/).filter(Boolean);
  }).join(' ');
}

function cssValue(value, numericUnit = '') {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return `${value}${numericUnit}`;
  return String(value);
}

function lengthValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return `${value}px`;
  const raw = String(value).trim();
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
}

function scaleValue(value) {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function percentForScale(value) {
  return `${(100 / value).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}%`;
}

function percentValue(value) {
  return cssValue(value, typeof value === 'number' ? '%' : '');
}

function boxValue(value) {
  if (Array.isArray(value)) return value.map((part) => lengthValue(part)).filter(Boolean).join(' ');
  return lengthValue(value);
}

function alignValue(value) {
  const raw = String(value || '').trim();
  const aliases = {
    start: 'flex-start',
    end: 'flex-end',
    left: 'flex-start',
    right: 'flex-end',
    middle: 'center',
  };
  return aliases[raw] || raw;
}

function isElmMode(mode) {
  return ['elm', 'row', 'column', 'stack', 'wrapped-row', 'wrappedRow'].includes(mode);
}

function elmDirection(layout = {}, mode = 'elm') {
  if (mode === 'row' || mode === 'wrapped-row' || mode === 'wrappedRow') return 'row';
  if (mode === 'column' || mode === 'stack') return 'column';
  return layout.direction || layout.flow || 'column';
}

function layoutChildMode(layout = {}) {
  const mode = layoutMode(layout);
  return isElmMode(mode) ? elmDirection(layout, mode) : mode;
}

function flexPortion(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value > 0 ? value : 0;
  const raw = String(value).trim();
  if (raw === 'fill') return 1;
  const match = raw.match(/^fill(?::|\s+)(\d+(?:\.\d+)?)$/);
  return match ? Number(match[1]) : 0;
}

function isFill(value) {
  return flexPortion(value) > 0;
}

function isShrink(value) {
  return String(value || '').trim() === 'shrink';
}

function joinStyle(parts, raw) {
  const body = parts.filter(Boolean).join('; ');
  return [body, raw].filter(Boolean).join(body && raw ? '; ' : '');
}

function scaleStyle(prefix, value) {
  const scale = scaleValue(value);
  if (!scale || scale === 1) return [];
  return [
    `${prefix}-transform: scale(${scale})`,
    `${prefix}-width: ${percentForScale(scale)}`,
    `${prefix}-height: ${percentForScale(scale)}`,
  ];
}

function slideStyle(slide = {}) {
  const parts = [];
  parts.push(...scaleStyle('--pb-content', slide.contentScale ?? slide.scale));
  if (slide.contentOrigin) parts.push(`--pb-content-origin: ${slide.contentOrigin}`);

  const sizeFields = [
    ['titleSize', '--pb-title-size'],
    ['subtitleSize', '--pb-subtitle-size'],
    ['bodySize', '--pb-body-size'],
    ['smallSize', '--pb-small-size'],
    ['monoSize', '--pb-mono-size'],
    ['captionSize', '--pb-caption-size'],
    ['coverTitleSize', '--pb-cover-title-size'],
    ['dividerTitleSize', '--pb-divider-title-size'],
    ['dividerMetaOffset', '--pb-divider-meta-offset'],
  ];
  for (const [field, cssVar] of sizeFields) {
    const value = lengthValue(slide[field]);
    if (value) parts.push(`${cssVar}: ${value}`);
  }
  return joinStyle(parts, slide.style);
}

function styleAttr(style, escapeHtml) {
  const value = String(style || '').trim();
  return value ? ` style="${escapeHtml(value)}"` : '';
}

function templateTracks(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return `repeat(${value}, minmax(0, 1fr))`;
  if (Array.isArray(value)) return value.join(' ');
  return String(value);
}

function templateAreas(value) {
  if (!Array.isArray(value) || !value.length) return '';
  return value
    .map((row) => `"${Array.isArray(row) ? row.join(' ') : String(row).replace(/"/g, '')}"`)
    .join(' ');
}

function layoutMode(layout = {}) {
  return layout.mode || layout.type || 'grid';
}

function layoutClasses(layout = {}) {
  const mode = layoutMode(layout);
  return classList([
    'custom-layout',
    `layout-${cleanToken(mode) || 'grid'}`,
    layout.class,
    layout.classes,
  ]);
}

function layoutStyle(layout = {}) {
  const mode = layoutMode(layout);
  const parts = [];
  if (mode === 'flex') {
    parts.push('display: flex');
    if (layout.direction) parts.push(`flex-direction: ${layout.direction}`);
    if (layout.wrap) parts.push(`flex-wrap: ${layout.wrap === true ? 'wrap' : layout.wrap}`);
  } else if (isElmMode(mode)) {
    const direction = elmDirection(layout, mode);
    parts.push('display: flex', `flex-direction: ${direction}`, 'min-width: 0', 'min-height: 0');
    const wrap = layout.wrap || mode === 'wrapped-row' || mode === 'wrappedRow';
    if (wrap) parts.push(`flex-wrap: ${wrap === true ? 'wrap' : wrap}`);
    if (layout.fill !== false) parts.push('width: 100%', 'height: 100%');
  } else if (mode === 'freeform') {
    parts.push('display: block', 'position: relative');
  } else {
    parts.push('display: grid');
    const columns = templateTracks(layout.columns ?? layout.cols);
    const rows = templateTracks(layout.rows);
    const areas = templateAreas(layout.areas);
    if (columns) parts.push(`grid-template-columns: ${columns}`);
    if (rows) parts.push(`grid-template-rows: ${rows}`);
    if (areas) parts.push(`grid-template-areas: ${areas}`);
  }

  const gap = cssValue(layout.gap ?? layout.spacing, 'px');
  const rowGap = cssValue(layout.rowGap, 'px');
  const columnGap = cssValue(layout.columnGap, 'px');
  const padding = boxValue(layout.padding ?? layout.pad);
  const padX = lengthValue(layout.padX ?? layout.paddingX);
  const padY = lengthValue(layout.padY ?? layout.paddingY);
  if (gap) parts.push(`gap: ${gap}`);
  if (rowGap) parts.push(`row-gap: ${rowGap}`);
  if (columnGap) parts.push(`column-gap: ${columnGap}`);
  if (padding) parts.push(`padding: ${padding}`, 'box-sizing: border-box');
  if (padX) parts.push(`padding-left: ${padX}`, `padding-right: ${padX}`, 'box-sizing: border-box');
  if (padY) parts.push(`padding-top: ${padY}`, `padding-bottom: ${padY}`, 'box-sizing: border-box');
  if (layout.alignItems || layout.align || layout.crossAlign) parts.push(`align-items: ${alignValue(layout.alignItems || layout.align || layout.crossAlign)}`);
  if (layout.justifyItems) parts.push(`justify-items: ${alignValue(layout.justifyItems)}`);
  if (layout.justify || layout.mainAlign) parts.push(`${isElmMode(mode) || mode === 'flex' ? 'justify-content' : 'justify-items'}: ${alignValue(layout.justify || layout.mainAlign)}`);
  if (layout.alignContent) parts.push(`align-content: ${alignValue(layout.alignContent)}`);
  if (layout.justifyContent) parts.push(`justify-content: ${alignValue(layout.justifyContent)}`);
  return joinStyle(parts, layout.style);
}

function blockStyle(block = {}, mode) {
  const parts = [];
  parts.push(...scaleStyle('--custom-block', block.scale));
  if (block.fontSize) parts.push(`--custom-font-size: ${lengthValue(block.fontSize)}`);
  if (block.titleSize || block.headingSize) parts.push(`--custom-title-size: ${lengthValue(block.titleSize ?? block.headingSize)}`);
  if (block.bodySize || block.textSize) parts.push(`--custom-body-size: ${lengthValue(block.bodySize ?? block.textSize)}`);
  if (block.labelSize) parts.push(`--custom-label-size: ${lengthValue(block.labelSize)}`);
  if (block.valueSize) parts.push(`--custom-value-size: ${lengthValue(block.valueSize)}`);
  if (block.captionSize) parts.push(`--custom-caption-size: ${lengthValue(block.captionSize)}`);
  if (block.kickerSize) parts.push(`--custom-kicker-size: ${lengthValue(block.kickerSize)}`);
  if (block.itemSize) parts.push(`--custom-item-size: ${lengthValue(block.itemSize)}`);
  if (block.padding != null) parts.push(`--custom-padding: ${lengthValue(block.padding)}`);
  if (block.gap != null) parts.push(`--custom-gap: ${lengthValue(block.gap)}`);
  if (block.area) parts.push(`grid-area: ${block.area}`);
  if (block.column || block.gridColumn) parts.push(`grid-column: ${block.column || block.gridColumn}`);
  if (block.row || block.gridRow) parts.push(`grid-row: ${block.row || block.gridRow}`);
  if (block.span) parts.push(`grid-column: span ${block.span}`);
  if (block.align) parts.push(`align-self: ${alignValue(block.align)}`);
  if (block.justify) parts.push(`justify-self: ${alignValue(block.justify)}`);

  const widthValue = block.width ?? block.w;
  const heightValue = block.height ?? block.h;
  if (widthValue != null && !isFill(widthValue) && !isShrink(widthValue)) parts.push(`width: ${percentValue(widthValue)}`);
  if (heightValue != null && !isFill(heightValue) && !isShrink(heightValue)) parts.push(`height: ${percentValue(heightValue)}`);
  if (block.minWidth) parts.push(`min-width: ${lengthValue(block.minWidth)}`);
  if (block.maxWidth) parts.push(`max-width: ${lengthValue(block.maxWidth)}`);
  if (block.minHeight) parts.push(`min-height: ${lengthValue(block.minHeight)}`);
  if (block.maxHeight) parts.push(`max-height: ${lengthValue(block.maxHeight)}`);
  if (block.basis) parts.push(`flex-basis: ${lengthValue(block.basis)}`);

  if (mode === 'row' || mode === 'column' || mode === 'flex') {
    const mainValue = mode === 'column' ? heightValue : widthValue;
    const crossValue = mode === 'column' ? widthValue : heightValue;
    const portion = block.fillPortion ?? block.grow ?? flexPortion(mainValue);
    if (portion) parts.push(`flex: ${portion} 1 0`);
    else if (isShrink(mainValue)) parts.push('flex: 0 0 auto');
    if (isFill(crossValue)) parts.push('align-self: stretch');
  }
  if (block.zIndex || block.z) parts.push(`z-index: ${block.zIndex || block.z}`);

  const freeform = mode === 'freeform' || block.position === 'absolute' || block.x != null || block.y != null;
  if (freeform) {
    parts.push('position: absolute');
    if (block.x != null || block.left != null) parts.push(`left: ${percentValue(block.x ?? block.left)}`);
    if (block.y != null || block.top != null) parts.push(`top: ${percentValue(block.y ?? block.top)}`);
    if (block.right != null) parts.push(`right: ${percentValue(block.right)}`);
    if (block.bottom != null) parts.push(`bottom: ${percentValue(block.bottom)}`);
  }
  return joinStyle(parts, block.style);
}

function blockAttrs(block, kind, mode, helpers) {
  const variant = cleanToken(block.variant || block.tone || '');
  const classes = classList([
    'custom-block',
    `custom-${cleanToken(kind) || DEFAULT_BLOCK_TYPE}`,
    variant && `custom-${variant}`,
    block.area && `area-${cleanToken(block.area)}`,
    block.class,
    block.classes,
  ]);
  const attrs = [`class="${helpers.escapeHtml(classes)}"`];
  const style = styleAttr(blockStyle(block, mode), helpers.escapeHtml);
  if (style) attrs.push(style.trim());
  if (block.allowOverlap || block.overlap === 'allow' || block.overlapOk) attrs.push('data-allow-overlap="true"');
  if (block.name || block.id) attrs.push(`data-block-id="${helpers.escapeHtml(block.name || block.id)}"`);
  return attrs.join(' ');
}

function richText(value, helpers, html) {
  if (value == null && html == null) return '';
  return helpers.format ? helpers.format(value, html) : helpers.escapeHtml(value ?? '');
}

function renderKicker(block, helpers) {
  return block.kicker || block.eyebrow || block.label
    ? `<div class="custom-kicker">${richText(block.kicker ?? block.eyebrow ?? block.label, helpers, block.kickerHtml ?? block.eyebrowHtml ?? block.labelHtml)}</div>`
    : '';
}

function renderHeading(block, helpers) {
  return block.title || block.heading
    ? `<h3 class="custom-heading">${richText(block.title ?? block.heading, helpers, block.titleHtml ?? block.headingHtml)}</h3>`
    : '';
}

function renderBody(block, helpers) {
  const bodies = asArray(block.body ?? block.text ?? block.description ?? block.desc);
  if (!bodies.length) return '';
  return bodies.map((body) => `<p class="custom-body">${richText(body, helpers, block.bodyHtml ?? block.textHtml)}</p>`).join('');
}

function renderChips(block, helpers) {
  const chips = asArray(block.chips || block.tags).filter((chip) => chip != null && chip !== '');
  if (!chips.length) return '';
  return `<div class="custom-chips">${chips.map((chip) => `<span class="custom-chip">${richText(chip.label ?? chip.title ?? chip, helpers, chip.html)}</span>`).join('')}</div>`;
}

function renderItems(items, helpers) {
  const list = asArray(items).filter((item) => item != null && item !== '');
  if (!list.length) return '';
  return `<ul class="custom-list">${list.map((item) => {
    const objectItem = item && typeof item === 'object' && !Array.isArray(item);
    const localizedItem = objectItem && (Object.prototype.hasOwnProperty.call(item, 'en') || Object.prototype.hasOwnProperty.call(item, 'pl'));
    const title = localizedItem ? item : (objectItem ? (item.title ?? item.label ?? item.value) : item);
    const body = localizedItem ? null : (objectItem ? (item.body ?? item.desc ?? item.description) : null);
    const idx = objectItem ? item.idx : null;
    return `<li>${idx ? `<span class="custom-idx">${richText(idx, helpers)}</span>` : ''}<div><span class="custom-item-title">${richText(title, helpers, objectItem && item.titleHtml)}</span>${body ? `<span class="custom-item-body">${richText(body, helpers, objectItem && item.bodyHtml)}</span>` : ''}</div></li>`;
  }).join('')}</ul>`;
}

function renderTextBlock(block, helpers) {
  return `${renderKicker(block, helpers)}${renderHeading(block, helpers)}${renderBody(block, helpers)}${renderItems(block.items || block.points, helpers)}${renderChips(block, helpers)}`;
}

function renderMetricBlock(block, helpers) {
  const value = block.value ?? block.number ?? block.stat ?? '';
  const unit = block.unit ? `<span class="custom-unit">${richText(block.unit, helpers)}</span>` : '';
  const label = block.label ? `<div class="custom-label">${richText(block.label, helpers, block.labelHtml)}</div>` : '';
  return `${renderKicker(block, helpers)}<div class="custom-value">${richText(value, helpers, block.valueHtml)}${unit}</div>${label}${renderBody(block, helpers)}`;
}

function renderQuoteBlock(block, helpers) {
  const quote = block.quote ?? block.body ?? block.text ?? '';
  const source = [block.author, block.source, block.year].filter(Boolean).map((part) => richText(part, helpers)).join(' · ');
  return `<div class="custom-quote-mark">“</div><blockquote class="custom-quote-body">${richText(quote, helpers, block.quoteHtml ?? block.bodyHtml)}</blockquote>${source ? `<div class="custom-quote-source">${source}</div>` : ''}`;
}

function imageData(block) {
  if (block.image) return block.image;
  return block;
}

function renderImageBlock(block, slide, helpers, state) {
  const image = imageData(block);
  const imageIndex = state.imageIndex++;
  const caption = block.caption ?? image.caption ?? block.title;
  const meta = block.meta ?? image.meta ?? image.credit;
  return `${renderKicker(block, helpers)}${renderHeading(block, helpers)}<div class="custom-media-frame">${helpers.renderImage(slide, image, imageIndex)}</div>${caption || meta ? `<div class="custom-caption"><span>${richText(caption ?? '', helpers, block.captionHtml ?? image.captionHtml)}</span>${meta ? `<span>${richText(meta, helpers, block.metaHtml ?? image.metaHtml)}</span>` : ''}</div>` : ''}`;
}

function renderGalleryBlock(block, slide, helpers, state) {
  const images = asArray(block.images || block.items);
  const columns = templateTracks(block.columns ?? block.cols ?? Math.min(3, Math.max(1, images.length)));
  const galleryStyle = styleAttr(joinStyle([columns && `grid-template-columns: ${columns}`], block.galleryStyle), helpers.escapeHtml);
  const tiles = images.map((item) => {
    const image = item && typeof item === 'object' ? item : { src: item };
    const imageIndex = state.imageIndex++;
    const caption = image.caption ?? image.title;
    const meta = image.meta ?? image.credit;
    return `<div class="custom-gallery-item"><div class="custom-media-frame">${helpers.renderImage(slide, image, imageIndex)}</div>${caption || meta ? `<div class="custom-caption"><span>${richText(caption ?? '', helpers, image.captionHtml ?? image.titleHtml)}</span>${meta ? `<span>${richText(meta, helpers, image.metaHtml)}</span>` : ''}</div>` : ''}</div>`;
  }).join('');
  return `${renderKicker(block, helpers)}${renderHeading(block, helpers)}<div class="custom-gallery"${galleryStyle}>${tiles}</div>${renderBody(block, helpers)}`;
}

function renderGroupBlock(block, slide, helpers, state) {
  const rawType = block.type || block.kind;
  const shorthandMode = rawType === 'row' || rawType === 'column' || rawType === 'stack' ? rawType : null;
  const layout = block.layout || { columns: block.columns, gap: block.gap };
  if (shorthandMode && !layout.mode && !layout.type) layout.mode = shorthandMode;
  if (block.spacing != null && layout.spacing == null && layout.gap == null) layout.spacing = block.spacing;
  if (block.padding != null && layout.padding == null) layout.padding = block.padding;
  const nested = asArray(block.blocks || block.items);
  return `${renderKicker(block, helpers)}${renderHeading(block, helpers)}<div class="${helpers.escapeHtml(layoutClasses(layout))}"${styleAttr(layoutStyle(layout), helpers.escapeHtml)}>${nested.map((child) => renderBlock(child, slide, layoutChildMode(layout), helpers, state)).join('')}</div>`;
}

function renderBlock(block, slide, parentMode, helpers, state) {
  if (typeof block !== 'object' || block == null || Array.isArray(block)) {
    block = { type: 'text', body: block };
  }
  const kind = blockType(block);
  let body;
  if (kind === 'metric') body = renderMetricBlock(block, helpers);
  else if (kind === 'quote') body = renderQuoteBlock(block, helpers);
  else if (kind === 'image') body = renderImageBlock(block, slide, helpers, state);
  else if (kind === 'gallery') body = renderGalleryBlock(block, slide, helpers, state);
  else if (kind === 'list') body = `${renderKicker(block, helpers)}${renderHeading(block, helpers)}${renderItems(block.items || block.points, helpers)}`;
  else if (kind === 'group') body = renderGroupBlock(block, slide, helpers, state);
  else if (kind === 'rule') body = '<div class="custom-rule-line"></div>';
  else if (kind === 'spacer') body = '';
  else body = renderTextBlock(block, helpers);
  return `<div ${blockAttrs(block, kind, parentMode, helpers)}>${body}</div>`;
}

function renderCustomLayout(slide, deck, helpers) {
  const layout = slide.layout || {};
  const mode = layoutMode(layout);
  const blocks = asArray(slide.blocks || slide.items || (slide.images ? [{ type: 'gallery', images: slide.images }] : []));
  const state = { imageIndex: 0 };
  const title = slide.noTitle || slide.titleBlock === false || !slide.title ? '' : helpers.titleBlock(slide, deck);
  const layoutHtml = `<div class="${helpers.escapeHtml(layoutClasses(layout))}"${styleAttr(layoutStyle(layout), helpers.escapeHtml)}>${blocks.map((block) => renderBlock(block, slide, layoutChildMode(layout), helpers, state)).join('')}</div>`;
  return `${title}${layoutHtml}`;
}

module.exports = { renderCustomLayout, slideStyle, lengthValue, scaleValue };
