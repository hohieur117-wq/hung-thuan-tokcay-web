const fs = require('fs');
let c = fs.readFileSync('frontend/index.html', 'utf8');
const match = c.match(/alt="Logo [^"]*"/);
console.log(match ? match[0] : 'Not found in index.html');
const textMatch = c.match(/S.*N PH.*M/);
console.log(textMatch ? textMatch[0] : 'S...N PH...M not found in index.html');
