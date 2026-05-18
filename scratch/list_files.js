const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
console.log('Files in root:', fs.readdirSync(dir));
console.log('Does DistribuidoraMH.pdf exist?', fs.existsSync(path.join(dir, 'DistribuidoraMH.pdf')));
