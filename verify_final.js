const fs = require('fs');
let c = fs.readFileSync('frontend/main.jsx', 'utf8');
console.log('Thêm vào giỏ hàng:', c.includes('Thêm vào giỏ hàng'));
console.log('Giá sỉ/thùng:', c.includes('Giá sỉ/thùng:'));
console.log('Logo:', c.includes('<img src="/logo_new.png"'));
console.log('Mangled Gi?', c.includes('Giá s0/thùng'));
