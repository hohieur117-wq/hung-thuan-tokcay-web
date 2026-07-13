const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    try {
        const { id } = req.query;

        // Đọc nội dung file index.html từ thư mục dist
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        let htmlData = fs.readFileSync(indexPath, 'utf8');

        if (!id) {
            return res.status(200).send(htmlData);
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials in process.env');
            return res.status(200).send(htmlData);
        }

        // Gọi API Supabase để lấy thông tin sản phẩm
        const fetchUrl = `${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`;
        const response = await fetch(fetchUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        const products = await response.json();

        if (products && products.length > 0) {
            const product = products[0];
            
            const title = product.name || 'Hùng Thuận Tokcay';
            const description = product.description ? product.description.replace(/(<([^>]+)>)/gi, "").substring(0, 150) + "..." : 'Chi tiết sản phẩm';
            const image = product.image_url || 'https://tokcay.com/logo.png'; // Thay bằng domain thật nếu cần
            const url = `https://${req.headers.host}${req.url}`;

            // Tạo các thẻ Open Graph
            const ogTags = `
                <title>${title}</title>
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
                <meta property="og:url" content="${url}" />
                <meta property="og:type" content="product" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${image}" />
            `;

            // Chèn ogTags vào phần <head>
            htmlData = htmlData.replace('</head>', `${ogTags}</head>`);
        }

        res.status(200).send(htmlData);

    } catch (error) {
        console.error('Error generating preview:', error);
        // Trả về HTML gốc nếu có lỗi
        try {
            const indexPath = path.join(process.cwd(), 'dist', 'index.html');
            const htmlData = fs.readFileSync(indexPath, 'utf8');
            res.status(200).send(htmlData);
        } catch (e) {
            res.status(500).send('Internal Server Error');
        }
    }
};
