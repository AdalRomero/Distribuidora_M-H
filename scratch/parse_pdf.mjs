import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function parsePdf() {
    try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfPath = path.join(__dirname, '..', 'DistribuidoraMH.pdf');
        
        console.log(`Loading PDF from: ${pdfPath}`);
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        
        let output = `Total Pages: ${pdf.numPages}\n`;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            output += `\n--- PAGE ${pageNum} ---\n`;
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const viewport = page.getViewport({ scale: 1.0 });
            output += `Viewport Width: ${viewport.width}, Height: ${viewport.height}\n`;
            
            textContent.items.forEach((item, index) => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontSize = item.transform[0];
                const width = item.width;
                const height = item.height;
                output += `[${index}] x: ${tx.toFixed(1)}, y: ${ty.toFixed(1)} | w: ${width.toFixed(1)}, h: ${height.toFixed(1)} | size: ${fontSize.toFixed(1)} | text: "${item.str}"\n`;
            });
        }
        
        const outputPath = path.join(__dirname, 'pdf_texts.txt');
        fs.writeFileSync(outputPath, output, 'utf-8');
        console.log(`Successfully wrote PDF coordinate output to: ${outputPath}`);
    } catch (err) {
        console.error('Error parsing PDF:', err);
    }
}

parsePdf();
