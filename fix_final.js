const fs = require('fs');

const fixAll = () => {
    const files = ['frontend/main.jsx', 'frontend/app.jsx'];
    
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Remove logo import and use public path
        if (content.includes("import logo from './logo_new.png';")) {
            content = content.replace("import logo from './logo_new.png';\n", "");
            modified = true;
        }

        // Replace logo src
        if (content.includes('<img src={logo}')) {
            content = content.replace(/<img src=\{logo\}/g, '<img src="/logo_new.png"');
            modified = true;
        }

        // Fix logo alt texts
        const altFixes = [
            /alt="Logo [^"]*"/g,
            /alt='Logo [^']*'/g
        ];
        altFixes.forEach(regex => {
            if (regex.test(content)) {
                content = content.replace(regex, 'alt="Logo Hùng Thuận Tokcay"');
                modified = true;
            }
        });

        // Specific strings the user complained about:
        // We will do broad regex replacements to catch any mangled versions.
        const replacements = [
            { regex: /Gi\w?\s+s[^\/]*\/th\w*ng/g, new: 'Giá sỉ/thùng:' },
            { regex: /Giá s0\/thùng/g, new: 'Giá sỉ/thùng:' },
            { regex: /Gi\w?\s+b\w*n\s+l[^\:]*/g, new: 'Giá bán lẻ:' },
            { regex: /Giá bn l/g, new: 'Giá bán lẻ:' },
            { regex: /Th\w*m\s+v\w*o\s+gi\w*/g, new: 'Thêm vào giỏ hàng' },
            { regex: /S\w*N\s+PH\w*M/g, new: 'SẢN PHẨM' }, // This might match 'SẢN PHẨM', which is fine.
            { regex: /DANH M\w*C S\w*N PH\w*M/g, new: 'DANH MỤC SẢN PHẨM' },
            { regex: /T\w*t c\w* s\w*n ph\w*m/g, new: 'Tất cả sản phẩm' }
        ];

        for (const { regex, new: correctStr } of replacements) {
            if (regex.test(content)) {
                // Ensure we don't double replace correctly encoded strings
                content = content.replace(regex, correctStr);
                modified = true;
            }
        }
        
        // Clean up some over-replacements
        content = content.replace(/SẢN PHẨM/g, 'SẢN PHẨM'); // Dummy to ensure we are good
        content = content.replace(/DANH MỤC SẢN PHẨM/g, 'DANH MỤC SẢN PHẨM');

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed ${file}`);
        }
    }
};

fixAll();
