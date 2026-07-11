const fs = require('fs');

// 1. Fix index.html
const indexFile = 'frontend/index.html';
let indexContent = fs.readFileSync(indexFile, 'utf8');
const metaRegex = /<meta name="description"[\s\S]*?>/i;
indexContent = indexContent.replace(metaRegex, '<meta name="description" content="Hùng Thuận Tokcay - Khám phá thế giới ẩm thực Hàn Quốc phong phú với các loại bánh gạo, mì cay, rong biển và gia vị nhập khẩu chính hãng." />');
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('Fixed index.html');

// 2. Fix main.jsx
const mainFile = 'frontend/main.jsx';
let mainContent = fs.readFileSync(mainFile, 'utf8');
const confirmRegex = /if\s*\(\s*window\.confirm\("Bạn có chắc chắn mu[^"]*"\)\)\s*\{/;
mainContent = mainContent.replace(confirmRegex, 'if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.")) {');
fs.writeFileSync(mainFile, mainContent, 'utf8');
console.log('Fixed main.jsx');
