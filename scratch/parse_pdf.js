const fs = require('fs');
const path = require('path');

async function parsePdf() {
    try {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const pdfPath = path.join(__dirname, '..', 'DistribuidoraMH.pdf');
        
        console.log(`Loading PDF from: ${pdfPath}`);
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        
        console.log(`Total Pages: ${pdf.numPages}`);
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log(`\n--- PAGE ${pageNum} ---`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Log viewport size
            const viewport = page.getViewport({ scale: 1.0 });
            console.log(`Viewport Width: ${viewport.width}, Height: ${viewport.height}`);
            
            // Text items contain transforming matrices (transform) and string content (str)
            // transform matrix is: [scaleX, skewY, skewX, scaleY, translateX, translateY]
            textContent.items.forEach((item, index) => {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const fontSize = item.transform[0]; // approximation
                console.log(`[${index}] x: ${tx.toFixed(1)}, y: ${ty.toFixed(1)} | size: ${fontSize.toFixed(1)} | text: "${item.str}"`);
            });
        }
    } catch (err) {
        console.error('Error parsing PDF:', err);
    }
}

parsePdf();
