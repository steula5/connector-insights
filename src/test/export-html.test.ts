import { describe, expect, it } from 'vitest';
import { buildExportHtml } from '@/lib/export-html';

describe('buildExportHtml', () => {
  it('gera um html navegavel e preserva valores negativos no relatorio', () => {
    const html = buildExportHtml({
      items: [
        {
          code: 'ABC-01',
          unitOrigin: 'UN',
          quantity: -3,
          qtyPerBag: 10,
          totalUN: -3,
          family: 'ABC',
        },
      ],
      history: {
        '2026': {
          '4': {
            year: 2026,
            month: 4,
            items: [],
            totalUN: 100,
            totalSKUs: 3,
            topItem: 'ABC-01',
            avgPerItem: 33,
            importedAt: '2026-04-06T12:00:00.000Z',
          },
        },
      },
      familyImages: {},
      selectedYear: '2026',
      selectedMonth: '4',
    });

    expect(html).toContain('data-section="resumo"');
    expect(html).toContain('data-section="historico"');
    expect(html).toContain('window.location.hash = sectionId');
    expect(html).toContain('ABC-01');
    expect(html).toContain('-3');
  });
});