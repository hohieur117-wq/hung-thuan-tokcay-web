export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured on server' });
    }

    try {
        const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};
        if (!imageBase64) {
            return res.status(400).json({ error: 'Missing imageBase64 in request body' });
        }

        const promptText = `Bạn là một chuyên gia kiểm định nhãn mác hàng hóa và là copywriter cho cửa hàng thực phẩm Hàn Quốc. Nhiệm vụ: soi CỰC KỲ CHI TIẾT hình ảnh bao bì sản phẩm được cung cấp.
QUY TẮC: 
1. Trích xuất chính xác 100% thông tin (khối lượng, thành phần, thương hiệu...).
2. Tuyệt đối không bịa đặt số liệu. Nếu ảnh mờ, dùng kiến thức thực tế về mặt hàng đó để suy luận hợp lý.
3. KHÔNG chào hỏi, KHÔNG dùng markdown code block. CHỈ TRẢ VỀ kết quả tuân thủ đúng biểu mẫu sau:

* Tên sản phẩm: [Điền tên chuẩn]
* Thương hiệu: [Điền tên thương hiệu]
* Khối lượng tịnh: [Điền khối lượng/thể tích]
* Thành phần: [Liệt kê thành phần chính]
* Dạng sản phẩm: [Bột mịn, xốt đặc, sợi khô...]
* Hương vị: [Mô tả ngắn gọn]
* Công dụng: [Cách chế biến]
* Đối tượng sử dụng: [Gia đình, nhà hàng...]
* Bảo quản: [Hướng dẫn bảo quản]
* Quy cách đóng gói: [Túi zip, chai thủy tinh...]`;

        const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
        let lastErr = null;

        for (const model of CANDIDATE_MODELS) {
            try {
                const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const geminiRes = await fetch(geminiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: promptText },
                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: imageBase64
                                        }
                                    }
                                ]
                            }
                        ]
                    })
                });

                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        return res.status(200).json({ text, model });
                    }
                } else {
                    const errBody = await geminiRes.json().catch(() => null);
                    lastErr = errBody?.error?.message || `HTTP ${geminiRes.status}`;
                }
            } catch (err) {
                lastErr = err.message;
            }
        }

        throw new Error(`Tất cả mô hình Gemini đều bận hoặc không phản hồi: ${lastErr}`);
    } catch (err) {
        console.error('generate-description error:', err);
        return res.status(500).json({ error: err.message });
    }
}
