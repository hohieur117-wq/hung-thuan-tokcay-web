const fs = require('fs');

const fixFinal = () => {
    const file = 'frontend/main.jsx';
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // 1. Thêm vào giỏ -> Thêm vào giỏ hàng
    if (content.includes('Thêm vào giỏ')) {
        // Only replace if it doesn't already say "giỏ hàng"
        content = content.replace(/Thêm vào giỏ(?! hàng)/g, 'Thêm vào giỏ hàng');
        modified = true;
    }

    // 2. Giá s0/thùng: -> Giá sỉ/thùng:
    const giaSiRegex = /Giá s[^\/]+\/thùng/g;
    if (giaSiRegex.test(content)) {
        content = content.replace(giaSiRegex, 'Giá sỉ/thùng');
        modified = true;
    }

    // 3. Giá bán lẻ
    const giaBanLeRegex = /Giá bán l[^\:]*\:/g;
    if (giaBanLeRegex.test(content)) {
        content = content.replace(giaBanLeRegex, 'Giá bán lẻ:');
        modified = true;
    }

    // 4. DANH MỤC SẢN PHẨM and SẢN PHẨM
    // (Already SẢN PHẨM according to logs, but let's be safe against any other mangled forms)
    const danhMucRegex = /DANH M.C S.N PH.M/g;
    if (danhMucRegex.test(content)) {
        content = content.replace(danhMucRegex, 'DANH MỤC SẢN PHẨM');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
};

fixFinal();
