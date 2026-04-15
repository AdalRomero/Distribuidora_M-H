import React, { useState } from 'react';
import GridLayout from 'react-grid-layout';
import { InvoiceBlock } from '../../../types/invoice-builder';
import InvoiceBlockRenderer from './InvoiceBlockRenderer';

const ReactGridLayout = GridLayout as any;

export const defaultLayout: InvoiceBlock[] = [
  { i: 'emisor_info', type: 'emisor_info', x: 0, y: 0, w: 9, h: 12, static: false },
  { i: 'cfdi_box', type: 'cfdi_box', x: 9, y: 0, w: 3, h: 12, static: false },
  { i: 'cliente_info', type: 'cliente_info', x: 0, y: 12, w: 12, h: 7, static: false },
  { i: 'conceptos_table', type: 'conceptos_table', x: 0, y: 19, w: 12, h: 9, static: false },
  { i: 'totales_box', type: 'totales_box', x: 0, y: 28, w: 12, h: 8, static: false },
  { i: 'fiscal_info', type: 'fiscal_info', x: 0, y: 36, w: 12, h: 10, static: false },
  { i: 'sellos_box', type: 'sellos_box', x: 0, y: 46, w: 12, h: 10, static: false },
  { i: 'pagare_box', type: 'pagare_box', x: 0, y: 56, w: 12, h: 8, static: false },
];

interface InvoiceBuilderCanvasProps {
  isEditMode: boolean;
  form: any;
  calcConcepto: (c: any) => any;
  totals: any;
}

export default function InvoiceBuilderCanvas({ isEditMode, form, calcConcepto, totals }: InvoiceBuilderCanvasProps) {
  const [layout, setLayout] = useState<InvoiceBlock[]>(defaultLayout);

  const onLayoutChange = (newLayout: any) => {
    const updated = layout.map(block => {
      const lay = newLayout.find((l: any) => l.i === block.i);
      return lay ? { ...block, x: lay.x, y: lay.y, w: lay.w, h: lay.h } : block;
    });
    setLayout(updated);
  };

  return (
    <div className={`w-full h-full pb-10 ${isEditMode ? 'bg-slate-100' : 'bg-gray-200'}`} style={{ overflow: 'auto', padding: '16px' }}>
      <div 
        className="bg-white shadow-lg text-gray-900 border border-transparent transition-colors mx-auto relative" 
        style={{ 
          width: 680, 
          minHeight: 880,
          fontFamily: 'Arial, sans-serif', 
          fontSize: '8px', 
          lineHeight: '1.35',
          borderColor: isEditMode ? '#93c5fd' : 'transparent',
          paddingTop: 10,
          paddingBottom: 20
        }}
      >
        <ReactGridLayout
          className="layout"
          layout={layout.map(l => ({ ...l, static: !isEditMode }))}
          cols={12}
          rowHeight={10}
          width={680}
          onLayoutChange={onLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          margin={[0, 0]}
        >
          {layout.map((block) => (
            <div 
              key={block.i} 
              className={`transition-all ${isEditMode ? 'ring-1 ring-blue-400 ring-dashed hover:ring-2 bg-blue-50/20 z-50 cursor-move' : ''}`}
              style={{ overflow: 'visible' }}
            >
              <InvoiceBlockRenderer 
                type={block.type} 
                form={form} 
                calcConcepto={calcConcepto} 
                totals={totals}
              />
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </div>
  );
}
