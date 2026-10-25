const SITE_URL = 'https://tokcayfood.com';

const escapeXml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export default async function handler(req, res) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ufffqeaurlulzfsmznmq.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    let products = [];
    if (supabaseKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(
                `${supabaseUrl}/rest/v1/products?select=slug,id,is_hidden&order=id.desc`,
                {
                    headers: {
                        apikey: supabaseKey,
                        Authorization: `Bearer ${supabaseKey}`,
                    },
                    signal: controller.signal,
                }
            );
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.json();
                // Giữ sản phẩm có is_hidden = false hoặc null (chưa từng đặt trạng thái)
                products = (Array.isArray(data) ? data : []).filter((p) => p.is_hidden !== true);
            }
        } catch (error) {
            console.warn('sitemap: cannot load products', error);
        }
    }

    const urls = [
        `<url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ];

    products.forEach((product) => {
        const slug = product.slug || product.id;
        if (!slug) return;
        urls.push(
            `<url><loc>${SITE_URL}/san-pham/${encodeURIComponent(slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        );
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
}
