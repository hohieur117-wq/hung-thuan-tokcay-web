const fs = require('fs');
const files = ['frontend/main.jsx', 'frontend/app.jsx'];

files.forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((l, i) => {
        if (
            l.includes('Lọc') ||
            l.includes('50.000') ||
            l.includes('150.000') ||
            l.includes('Trang tr') ||
            l.includes('TNHH') ||
            l.includes('92B5') ||
            l.includes('0902') ||
            l.includes('Cần Thơ') ||
            l.includes('Điều khoản') ||
            l.includes('Google Maps') ||
            l.includes('Vuông 1:1') ||
            l.includes('S AI') ||
            l.includes('Tự Động Viết Mô Tả') ||
            l.includes('Tự Đ') ||
            l.includes('sửa sản phẩm') ||
            l.includes('CHÚNG TÔI') ||
            l.includes('LIÊN H') ||
            l.includes('V:I')
        ) {
            console.log(`${file}:${i}: ${l}`);
        }
    });
});
