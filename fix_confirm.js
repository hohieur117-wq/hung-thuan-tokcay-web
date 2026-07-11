const fs = require('fs');
let lines = fs.readFileSync('frontend/main.jsx', 'utf8').split('\n');
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('window.confirm')) {
        lines[i] = '                if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.")) {';
    }
}
fs.writeFileSync('frontend/main.jsx', lines.join('\n'), 'utf8');
