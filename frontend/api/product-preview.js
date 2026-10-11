import fs from 'fs';
import path from 'path';

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hùng Thuận Tokcay</title>
    <meta property="og:title" content="Cửa hàng Hùng Thuận Tokcay - Nguyên liệu thực phẩm Hàn Quốc" />
    <meta property="og:description" content="Chuyên cung cấp sỉ và lẻ nguyên liệu nấu ăn Hàn Quốc: Bánh gạo, chả cá, tương ớt, mì cay... Uy tín, chất lượng tại Cần Thơ." />
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
</body>
</html>`;

function getIndexHtml() {
    try {
        const distPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(distPath)) {
            return fs.readFileSync(distPath, 'utf8');
        }
        const rootPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(rootPath)) {
            return fs.readFileSync(rootPath, 'utf8');
        }
    } catch (_) {
        // Ignore fs errors and return fallback HTML
    }
    return FALLBACK_HTML;
}

export default async function handler(req, res) {
    try {
        const indexHtml = getIndexHtml();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).send(indexHtml);
    } catch (error) {
        console.error('Fallback preview handler error:', error);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(FALLBACK_HTML);
    }
}
