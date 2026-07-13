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

        // Gọi API Supabase để lấy thông tin sản phẩm
        const fetchUrl = `${supabaseUrl}/rest/v1/products?slug=eq.${slug}&select=*`;
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

        // Tạo Raw HTML với Meta Tags và Redirect
        const rawHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta property="og:title" content="${title} - Hùng Thuận Tokcay">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:type" content="product">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Chuyển hướng người dùng thật về đúng route của Frontend -->
    <meta http-equiv="refresh" content="0;url=/san-pham/${slug}">
    <script>window.location.replace("/san-pham/${slug}");</script>
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
