import re
import os
import json

def get_tags(name, desc):
    tags = []
    text = (name + " " + desc).lower()
    if any(k in text for k in ["bánh gạo", "tokbokki", "topokki"]):
        tags.append("Bánh gạo/Tokbokki")
    if any(k in text for k in ["mì", "mỳ", "udon", "chajang", "ramen", "miến"]):
        tags.append("Mì Hàn Quốc")
    if any(k in text for k in ["xúc xích", "chả cá", "chả hải sản", "thanh cua", "surimi", "chả", "naruto", "chạo"]):
        tags.append("Xúc xích & Chả cá")
    if any(k in text for k in ["gia vị", "xốt", "sốt", "tương", "dầu", "nước chấm", "nước mắm", "giấm", "muối", "đường", "bột ớt", "bột"]):
        tags.append("Gia vị & Xốt")
    if "phô mai" in text or "mozzarella" in text:
        tags.append("Phô mai")
    if any(k in text for k in ["viên thả lẩu", "đậu hủ", "cá viên", "tôm viên", "bò viên", "cua viên", "túi tiền"]):
        tags.append("Viên thả lẩu")
    if "rong biển" in text:
        tags.append("Rong biển")
    if any(k in text for k in ["gà rán", "đùi gà", "cánh gà", "gà chiên", "gà karaage", "gà viên"]):
        tags.append("Gà rán/Gà chiên")
    if any(k in text for k in ["bánh sữa", "bánh xếp", "mandu", "há cảo", "xíu mại", "bánh bao", "chả giò", "bánh tuyết"]):
        tags.append("Dimsum & Bánh ăn vặt")
    if not tags:
        tags.append("Khác")
    return list(set(tags))

with open(r"c:\Users\LEGION\Desktop\web.env\san_pham.ini", "r", encoding="utf-8") as f:
    lines = f.readlines()

products = []
# Regex to match: number. [sku] name - Giá: price ₫ - Mô tả: desc[cite: 1]
pattern = re.compile(r'^\d+\.\s+\[(.*?)\]\s+(.*?)\s+-\s+Giá:\s+(.*?)\s*₫?\s*-\s+Mô tả:\s+(.*?)(?:\[cite:.*?\])?$')

for line in lines:
    line = line.strip()
    if not line or not re.match(r'^\d+\.', line):
        continue
    
    match = pattern.match(line)
    if match:
        sku = match.group(1).strip()
        name = match.group(2).strip()
        price_str = match.group(3).strip()
        desc = match.group(4).strip()
        
        # Clean price: remove dots, spaces, Liên hệ, etc.
        price_clean = re.sub(r'[^\d]', '', price_str)
        price = int(price_clean) if price_clean else 0
        
        tags = get_tags(name, desc)
        
        products.append({
            "sku": sku,
            "name": name,
            "price": price,
            "description": desc,
            "tags": tags,
            "image_url": None
        })

# Chunking into 50 products per file
chunk_size = 50
chunks = [products[i:i + chunk_size] for i in range(0, len(products), chunk_size)]

output_dir = r"c:\Users\LEGION\Desktop\web.env"

for i, chunk in enumerate(chunks):
    sql = "INSERT INTO products (sku, name, price, description, tags, image_url) VALUES \n"
    values = []
    for p in chunk:
        # Escape single quotes in strings
        n = p['name'].replace("'", "''")
        d = p['description'].replace("'", "''")
        t_str = "ARRAY[" + ", ".join([f"'{t}'" for t in p['tags']]) + "]::TEXT[]"
        values.append(f"('{p['sku']}', '{n}', {p['price']}, '{d}', {t_str}, NULL)")
    sql += ",\n".join(values) + ";"
    
    filename = os.path.join(output_dir, f"insert_chunk_{i+1}.sql")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(sql)

print(f"Generated {len(chunks)} chunk files for {len(products)} products.")
