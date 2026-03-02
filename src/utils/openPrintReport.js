import React from 'react';
import { createRoot } from 'react-dom/client';
import PrintReportView from '../views/print/PrintReportView';

export function openPrintReport(scenario, projectionData, userName) {
  const win = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes');
  if (!win) {
    alert('Allow popups for PDF reports.');
    return;
  }

  win.document.write(`<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title>Retirement Report \u2013 ${scenario.name}</title>
  </head><body style="margin:0;padding:0"><div id="root"></div></body></html>`);
  win.document.close();

  // Copy Tailwind + custom CSS from parent into print window
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(el =>
    win.document.head.appendChild(el.cloneNode(true))
  );

  const container = win.document.getElementById('root');
  container.style.cssText = 'width:1100px;margin:0 auto;padding:16px 0;';
  createRoot(container).render(
    React.createElement(PrintReportView, { scenario, projectionData, userName, printWindow: win })
  );
}
