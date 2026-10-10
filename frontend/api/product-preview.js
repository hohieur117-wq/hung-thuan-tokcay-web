module.exports = async (req, res) => {
    try {
        const { slug } = req.query;

        if (!slug) {
            return res.status(400).send('Missing product slug');
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials in process.env');
            return res.status(500).send('Server Configuration Error');
        }

        const escapeHtml = (str) => String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Gọi API Supabase để lấy thông tin sản phẩm
        const fetchUrl = `${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&is_hidden=eq.false&select=name,description,image_url`;
        const response = await fetch(fetchUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        const products = await response.json();

        let title = 'Hùng Thuận Tokcay';
        let description = 'Chi tiết sản phẩm';
        let image = 'https://tokcay.com/logo.png'; // Cập nhật domain/logo thật nếu có

        if (products && products.length > 0) {
            const product = products[0];
            title = product.name || title;
            if (product.description) {
                description = product.description.replace(/(<([^>]+)>)/gi, "").substring(0, 150) + "...";
            }
            if (product.image_url) {
                image = product.image_url;
            }
        }

        const safeTitle = escapeHtml(title);
        const safeDesc = escapeHtml(description);
        const safeImage = escapeHtml(image);
        const safeSlug = encodeURIComponent(slug);

        // Tạo Raw HTML với Meta Tags và Redirect
        const rawHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    <meta property="og:title" content="${safeTitle} - Hùng Thuận Tokcay">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:type" content="product">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${safeImage}">
    
    <!-- Chuyển hướng người dùng thật về đúng route của Frontend -->
    <meta http-equiv="refresh" content="0;url=/san-pham/${safeSlug}">
    <script>window.location.replace("/san-pham/${safeSlug}");</script>
</head>
<body>
    <p>Đang tải thông tin sản phẩm...</p>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(rawHtml);

    } catch (error) {
        console.error('Error generating raw HTML preview:', error);
        res.status(500).send('Internal Server Error');
    }
};
