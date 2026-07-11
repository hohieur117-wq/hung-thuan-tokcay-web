const fs = require('fs');
const path = require('path');

function getTags(name, desc) {
    let tags = [];
    let text = (name + " " + desc).toLowerCase();
    
    const hasAny = (keywords) => keywords.some(k => text.includes(k));
    
    if (hasAny(["bánh gạo", "tokbokki", "topokki"])) tags.push("Bánh gạo/Tokbokki");
    if (hasAny(["mì", "mỳ", "udon", "chajang", "ramen", "miến"])) tags.push("Mì Hàn Quốc");
    if (hasAny(["xúc xích", "chả cá", "chả hải sản", "thanh cua", "surimi", "chả", "naruto", "chạo"])) tags.push("Xúc xích & Chả cá");
    if (hasAny(["gia vị", "xốt", "sốt", "tương", "dầu", "nước chấm", "nước mắm", "giấm", "muối", "đường", "bột ớt", "bột"])) tags.push("Gia vị & Xốt");
    if (text.includes("phô mai") || text.includes("mozzarella")) tags.push("Phô mai");
    if (hasAny(["viên thả lẩu", "đậu hủ", "cá viên", "tôm viên", "bò viên", "cua viên", "túi tiền"])) tags.push("Viên thả lẩu");
    if (text.includes("rong biển")) tags.push("Rong biển");
    if (hasAny(["gà rán", "đùi gà", "cánh gà", "gà chiên", "gà karaage", "gà viên"])) tags.push("Gà rán/Gà chiên");
    if (hasAny(["bánh sữa", "bánh xếp", "mandu", "há cảo", "xíu mại", "bánh bao", "chả giò", "bánh tuyết"])) tags.push("Dimsum & Bánh ăn vặt");
    
    if (tags.length === 0) tags.push("Khác");
    
    return [...new Set(tags)];
}

const filepath = path.join('c:\\', 'Users', 'LEGION', 'Desktop', 'web.env', 'san_pham.ini');
const content = fs.readFileSync(filepath, 'utf-8');
const lines = content.split('\n');

let products = [];
// Regex to match: number. [sku] name - Giá: price ₫ - Mô tả: desc[cite: 1]
const pattern = /^\d+\.\s+\[(.*?)\]\s+(.*?)\s+-\s+Giá:\s+(.*?)\s*₫?\s*-\s+Mô tả:\s+(.*?)(?:\[cite:.*?\])?$/;

for (let line of lines) {
    line = line.trim();
    if (!line || !/^\d+\./.test(line)) continue;
    
    const match = line.match(pattern);
    if (match) {
        const sku = match[1].trim();
        const name = match[2].trim();
        const price_str = match[3].trim();
        let desc = match[4].trim();
        
        // Remove trailing [cite: 1] if it wasn't caught
        desc = desc.replace(/\[cite:\s*\d+\]/g, '').trim();

        // Clean price
        const price_clean = price_str.replace(/[^\d]/g, '');
        const price = price_clean ? parseInt(price_clean, 10) : 0;
        
        const tags = getTags(name, desc);
        
        products.push({
            sku, name, price, description: desc, tags, image_url: null
        });
    }
}

const chunkSize = 50;
const chunks = [];
for (let i = 0; i < products.length; i += chunkSize) {
    chunks.push(products.slice(i, i + chunkSize));
}

const outputDir = path.join('c:\\', 'Users', 'LEGION', 'Desktop', 'web.env');

chunks.forEach((chunk, index) => {
    let sql = "INSERT INTO products (sku, name, price, description, tags, image_url) VALUES \n";
    let values = chunk.map(p => {
        const n = p.name.replace(/'/g, "''");
        const d = p.description.replace(/'/g, "''");
        const t_str = "ARRAY[" + p.tags.map(t => `'${t}'`).join(', ') + "]::TEXT[]";
        return `('${p.sku}', '${n}', ${p.price}, '${d}', ${t_str}, NULL)`;
    });
    
    sql += values.join(',\n') + ";\n";
    
    const filename = path.join(outputDir, `insert_chunk_${index + 1}.sql`);
    fs.writeFileSync(filename, sql, 'utf-8');
});

console.log(`Generated ${chunks.length} chunk files for ${products.length} products.`);
