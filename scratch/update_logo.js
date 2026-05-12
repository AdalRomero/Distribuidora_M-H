const fs = require('fs');
const path = require('path');

const svgPath = path.join(process.cwd(), 'assets/image_app/logo-mh.svg');
const tsPath = path.join(process.cwd(), 'constants/logo_base64.ts');

let svg = fs.readFileSync(svgPath, 'utf8');

// Remove XML and DOCTYPE headers
svg = svg.replace(/<\?xml.*?\?>/s, '');
svg = svg.replace(/<!DOCTYPE.*?>/s, '');

// Optional: Remove width/height pt and replace with viewBox only
// svg = svg.replace(/width=".*?"/s, '');
// svg = svg.replace(/height=".*?"/s, '');

const base64 = Buffer.from(svg.trim()).toString('base64');
const content = `export const LOGO_MH_B64 = "${base64}";\n`;

fs.writeFileSync(tsPath, content);
console.log('Successfully updated logo_base64.ts with cleaned SVG');
