import { jsPDF } from 'jspdf';
import type { Baustelle, Personnel } from '../types';
import { getPersonnelSortOrder } from '../types';

/**
 * Das Blatt, das die Kolonnen mitbekommen: wer geht auf welche Baustelle.
 *
 * Maschinen und Fahrzeuge stehen bewusst NICHT darauf - auf dem Hof zaehlt
 * nur die Mannschaft, und ein volleres Blatt liest sich schlechter.
 */
export function exportDispositionPDF(
  baustellen: Baustelle[],
  personnel: Personnel[]
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Kurzfristige Einsaetze kommen mit aufs Blatt, aber ans Ende und unter
  // eigener Ueberschrift - sonst laesst sich auf Papier ein Hofeinsatz nicht
  // von einem geplanten Projekt unterscheiden.
  const nichtArchiviert = baustellen.filter((b) => b.status !== 'Archiviert');
  const activeBaustellen = [
    ...nichtArchiviert.filter((b) => b.kurzfristig !== true),
    ...nichtArchiviert.filter((b) => b.kurzfristig === true),
  ];
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
  }

  function drawLine() {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 4;
  }

  // ── Kopfzeile ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Disposition \u2013 ${dateStr}`, marginLeft, y);
  y += 8;
  drawLine();
  y += 2;

  // ── Pro Baustelle ein Block ──
  for (let i = 0; i < activeBaustellen.length; i++) {
    const bs = activeBaustellen[i];
    const bsPersonnel = personnel.filter((p) => p.assignedTo === bs.id);

    // Überschlage benötigten Platz (grob)
    const lineCount = 2 + bsPersonnel.length + (bsPersonnel.length > 0 ? 1 : 0);
    checkPageBreak(lineCount * 5 + 10);

    // Baustellenname
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const nameText = bs.address ? `${bs.name} – ${bs.address}` : bs.name;
    const label = bs.kurzfristig === true ? 'Kurzfristig' : 'Baustelle';
    doc.text(`${label}: ${nameText}`, marginLeft, y);
    y += 6;

    // Personal
    if (bsPersonnel.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Personal:', marginLeft + 2, y);
      y += 5;

      const sortedPersonnel = [...bsPersonnel].sort(
        (a, b) => getPersonnelSortOrder(a.role) - getPersonnelSortOrder(b.role)
      );

      for (const p of sortedPersonnel) {
        checkPageBreak(6);
        doc.text(`-  ${p.lastName}, ${p.firstName} (${p.role})`, marginLeft + 6, y);
        y += 5;
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Kein Personal zugeordnet', marginLeft + 2, y);
      y += 5;
    }

    // Notizen
    if (bs.notes && bs.notes.trim().length > 0) {
      y += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Notizen:', marginLeft + 2, y);
      y += 5;

      doc.setFont('helvetica', 'italic');
      const noteLines = doc.splitTextToSize(bs.notes, contentWidth - 10);
      for (const line of noteLines) {
        checkPageBreak(6);
        doc.text(line, marginLeft + 6, y);
        y += 5;
      }
    }

    y += 3;
    drawLine();
    y += 2;
  }

  // Dateiname
  const fileDate = today.toISOString().split('T')[0];
  doc.save(`Disposition_${fileDate}.pdf`);
}
