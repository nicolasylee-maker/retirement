/**
 * Shared styles, colors, and number formats for the Excel audit workbook.
 */

// ---------- Colors ----------
export const COLORS = {
  headerBg:    'FF1F4E79',  // dark blue header
  headerFont:  'FFFFFFFF',  // white text
  sectionBg:   'FFF2F2F2',  // light gray section rows
  sectionFont: 'FF333333',  // dark gray section text
  inputFont:   'FF1F4E79',  // blue font for editable inputs
  yellowBg:    'FFFFF2CC',  // yellow highlight (key assumptions)
  redFill:     'FFFFC7CE',  // red fill (depleted portfolio)
  greenFont:   'FF006100',  // green font (surplus)
  lightBorder: 'FFD9D9D9',  // thin gray border
};

// ---------- Number Formats ----------
export const FMT = {
  currency:  '#,##0',
  currency2: '#,##0.00',
  pct:       '0.00%',
  pct1:      '0.0%',
  int:       '0',
  text:      '@',
};

// ---------- Font definitions ----------
const baseFont = { name: 'Calibri', size: 11 };

export const FONTS = {
  header:  { ...baseFont, size: 14, bold: true, color: { argb: COLORS.headerFont } },
  section: { ...baseFont, size: 11, bold: true, color: { argb: COLORS.sectionFont } },
  input:   { ...baseFont, color: { argb: COLORS.inputFont } },
  normal:  { ...baseFont },
  bold:    { ...baseFont, bold: true },
  small:   { ...baseFont, size: 9, color: { argb: 'FF666666' } },
};

// ---------- Helpers ----------

/** Apply header style to a row (dark bg, white bold font). */
export function styleHeaderRow(row, colCount) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = FONTS.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { vertical: 'middle' };
  }
}

/** Apply section-header style (gray bg, bold). */
export function styleSectionRow(row, colCount) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = FONTS.section;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  }
}

/** Set input style (blue font) on a cell. */
export function styleInputCell(cell, fmt) {
  cell.font = FONTS.input;
  if (fmt) cell.numFmt = fmt;
}

/** Set yellow highlight on a cell. */
export function styleHighlight(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.yellowBg } };
}

/** Freeze top N rows. */
export function freezeRows(ws, count) {
  ws.views = [{ state: 'frozen', ySplit: count, xSplit: 0 }];
}

/** Set column widths from an array of [col, width] pairs. */
export function setColWidths(ws, widths) {
  for (const [col, w] of widths) {
    ws.getColumn(col).width = w;
  }
}

/** Add a named range pointing to a specific cell. */
export function addNamedRange(wb, name, sheetName, cellRef) {
  wb.definedNames.add(`'${sheetName}'!$${cellRef}`, name);
}

// ---------- Documentation styles ----------

export const DOC_FONT = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF444444' } };
export const DOC_BG = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
export const PURPOSE_FONT = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF333333' } };

/** Add a merged purpose block spanning rows startRow to startRow+1, columns 1 to endCol. */
export function addPurposeRows(ws, text, startRow, endCol) {
  ws.mergeCells(startRow, 1, startRow + 1, endCol);
  const cell = ws.getRow(startRow).getCell(1);
  cell.value = text;
  cell.font = PURPOSE_FONT;
  cell.fill = DOC_BG;
  cell.alignment = { wrapText: true, vertical: 'top' };
}

/** Style a single cell as documentation (small italic gray on light bg). */
export function addDocCell(ws, row, col, text) {
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
  cell.font = DOC_FONT;
  cell.fill = DOC_BG;
  cell.alignment = { wrapText: true, vertical: 'top' };
}
