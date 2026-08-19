// CSV export helper — used by the Excel export button across all modules.
// Exports the current view's columns + data, respecting active filters.

export function exportToCsv(filename, columns, data) {
  const header = columns.map((c) => c.header).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        // Resolve the display value: use render() output if simple, else accessor
        let val;
        if (col.exportValue) {
          val = col.exportValue(row);
        } else if (col.accessor) {
          val = row[col.accessor];
        } else {
          val = '';
        }
        // Escape CSV: wrap in quotes, double any internal quotes
        const s = String(val ?? '');
        return `"${s.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}