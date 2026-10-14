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
    <meta property="og:url" content="https://tokcayfood.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://tokcayfood.com/og-banner.jpg" />
    <meta property="og:image:secure_url" content="https://tokcayfood.com/og-banner.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Cửa hàng Hùng Thuận Tokcay - Nguyên liệu thực phẩm Hàn Quốc" />
    <meta name="twitter:description" content="Chuyên cung cấp sỉ và lẻ nguyên liệu nấu ăn Hàn Quốc: Bánh gạo, chả cá, tương ớt, mì cay... Uy tín, chất lượng tại Cần Thơ." />
    <meta name="twitter:image" content="https://tokcayfood.com/og-banner.jpg" />
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
</body>
</html>`;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

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
    const baseHtml = getIndexHtml();
    try {
        const { slug } = req.query || {};
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ufffqeaurlulzfsmznmq.supabase.co';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!slug || !supabaseKey) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
            return res.status(200).send(baseHtml);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const apiUrl = `${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=name,price,image_url,description,slug&limit=1`;
        const response = await fetch(apiUrl, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Supabase HTTP ${response.status}`);
        }

        const products = await response.json();
        const product = Array.isArray(products) && products.length > 0 ? products[0] : null;

        if (!product) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
            return res.status(200).send(baseHtml);
        }

        const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price || 0);
        const ogTitle = escapeHtml(`${product.name} - Giá: ${formattedPrice} | Tokcayfood`);
        const rawDesc = product.description
            ? product.description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 160)
            : 'Sản phẩm Hàn Quốc chất lượng cao tại Hùng Thuận Tokcay.';
        const ogDesc = escapeHtml(rawDesc);
        const ogImage = escapeHtml(product.image_url || 'https://tokcayfood.com/og-banner.jpg');
        const ogUrl = escapeHtml(`https://tokcayfood.com/san-pham/${product.slug || product.id}`);

        let html = baseHtml
            .replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`)
            .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${ogTitle}" />`)
            .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${ogDesc}" />`)
            .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${ogUrl}" />`)
            .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`)
            .replace(/<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:secure_url" content="${ogImage}" />`)
            .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${ogTitle}" />`)
            .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${ogDesc}" />`)
            .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${ogImage}" />`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).send(html);
    } catch (error) {
        console.error('Fallback preview handler:', error);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).send(baseHtml);
    }
}
