const fs = require('fs');

const fixMojibake = () => {
    const files = ['frontend/main.jsx', 'frontend/app.jsx'];
    const replacements = {
        'SÃ°£N PHÃ°©M': 'SẢN PHẨM',
        'KHUYÃ°¢N MÃ£I': 'KHUYẾN MÃI',
        'LIÃ°¢N HÃ°‡': 'LIÊN HỆ',
        'DANH MÃ»C SÃ°£N PHÃ°©M': 'DANH MỤC SẢN PHẨM',
        'GiÃ¡ sÃ¡»‰/thÃ¹ng': 'Giá sỉ/thùng',
        'GiÃ¡ bÃ¡n lÃ©': 'Giá bán lẻ',
        'ThÃªm VÃ O giÃ¡': 'Thêm vào giỏ',
        'TÃ¡¥t cÃ¡£ sÃ°£n phÃ°©m': 'Tất cả sản phẩm',
        'Logo HA1ng Thun Tokcay': 'Logo Hùng Thuận Tokcay',
        'Logo Hng Thu?n Tokcay': 'Logo Hùng Thuận Tokcay'
    };

    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        for (let [bad, good] of Object.entries(replacements)) {
            if (content.includes(bad)) {
                content = content.split(bad).join(good);
                modified = true;
            }
        }
        
        // Logo replacement for main.jsx
        if (file === 'frontend/main.jsx') {
            if (!content.includes("import logo from './logo_new.png';")) {
                content = "import logo from './logo_new.png';\n" + content;
                modified = true;
            }
            if (content.includes('<img src="/logo_new.png"')) {
                content = content.replace(/<img src="\/logo_new\.png"/g, '<img src={logo}');
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed ${file}`);
        }
    }
};

fixMojibake();
