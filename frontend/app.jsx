import { Analytics } from '@vercel/analytics/react';
const { useState, useEffect, useMemo } = React;

const SUPABASE_URL = 'https://ufffqeaurlulzfsmznmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmZxZWF1cmx1bHpmc216bm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTU5MTcsImV4cCI6MjA5ODQ5MTkxN30.Bcj8kkU7vIrxYlpb6DeouXFpZvdXxz2WaSsOnhNpvlU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Icons ---
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconCart = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEyeOff = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Utils ---
const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

// --- Components ---
const Header = ({ cartCount, onOpenCart, onSearch }) => {
    return (
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-red-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <a href="#" className="text-2xl font-black text-primary tracking-tight">Hùng Thuận Tokcay</a>
                    </div>
                    <div className="flex-1 max-w-lg mx-8 hidden md:block">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <IconSearch />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                                placeholder="Tìm kiếm sản phẩm..."
                                onChange={(e) => onSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button onClick={onOpenCart} className="relative p-2 text-gray-600 hover:text-primary transition-colors">
                            <IconCart />
                            {cartCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-primary rounded-full shadow-sm">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const HeroBanner = () => (
    <div className="relative bg-primary overflow-hidden">
        <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-primary sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                    <div className="sm:text-center lg:text-left">
                        <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                            <span className="block xl:inline">Hương vị chuẩn Hàn</span>{' '}
                            <span className="block text-yellow-300 xl:inline">tại nhà bạn</span>
                        </h1>
                        <p className="mt-3 text-base text-red-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                            Khám phá thế giới ẩm thực Hàn Quốc phong phú với các loại bánh gạo, mì cay, rong biển và vô vàn gia vị đặc trưng. Nấu ăn chưa bao giờ dễ dàng đến thế!
                        </p>
                    </div>
                </main>
            </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <img className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full mix-blend-multiply opacity-80" src="https://images.unsplash.com/photo-1580651315530-69c8e0026377?q=80&w=2070&auto=format&fit=crop" alt="Korean Food" />
        </div>
    </div>
);

const ZaloWidget = ({ zaloNumber }) => {
    if (!zaloNumber) return null;
    return (
        <a 
            href={`https://zalo.me/${zaloNumber}`} 
            target="_blank" 
            rel="noreferrer"
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 hover:scale-110 transition-all z-50 group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M21.2 5.3c-.5-.9-1.3-1.6-2.3-2C17.6 2.5 15.6 2 12 2S6.4 2.5 5.1 3.3c-1 .4-1.8 1.1-2.3 2C2.1 6.3 2 8 2 11c0 3 .1 4.7.8 5.7.5.9 1.3 1.6 2.3 2 1.3.8 3.3 1.3 6.9 1.3 1.3 0 2.5-.1 3.6-.3l3.6 2.4c.5.3 1.2.1 1.5-.4.1-.2.1-.4.1-.6v-2.3c1.3-.7 2.1-1.6 2.5-2.7.7-1 .8-2.7.8-5.7 0-3-.1-4.7-.8-5.7zm-2.8 9.5c-.3 1-1.3 1.5-2.2 1.5H16c-.6 0-1-.4-1-1s.4-1 1-1h.2c.4 0 .7-.3.7-.7s-.3-.7-.7-.7h-3.6c-.6 0-1-.4-1-1s.4-1 1-1h1.5c1.4 0 2.5-1.1 2.5-2.5S14.6 6 13.2 6H9c-.6 0-1 .4-1 1s.4 1 1 1h4.2c.3 0 .5.2.5.5s-.2.5-.5.5H9c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5h.3c-.6.6-1 1.4-1 2.3v1.3L12 18v-2h4c1.4 0 2.8-.7 3.4-2 .2-.5.5-.8 1-.8h.2c.6 0 1 .4 1 1 0 .3-.1.5-.2.6z"/>
            </svg>
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-sm py-1 px-3 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Chat Zalo: {zaloNumber}
            </div>
        </a>
    );
};

const CartSlideOver = ({ isOpen, onClose, cart, setCart }) => {
    const updateQuantity = (id, newQty) => {
        if (newQty < 1) {
            setCart(cart.filter(item => item.id !== id));
        } else {
            setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
        }
    };

    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

    return (
        <div className={`fixed inset-0 z-50 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
            <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Giỏ hàng của bạn</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 bg-gray-100 rounded-full">
                        <IconClose />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">Giỏ hàng trống</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'} alt={item.name} className="w-16 h-16 object-cover rounded shadow-sm" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate" title={item.name}>{item.name}</h4>
                                    <p className="text-primary font-medium text-sm mt-1">{formatVND(item.price)}</p>
                                    <div className="flex items-center mt-2 border border-gray-200 w-max rounded-md bg-white">
                                        <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="px-2 text-gray-600 hover:text-primary transition-colors">-</button>
                                        <span className="px-3 text-sm font-medium border-x border-gray-200">{item.qty}</span>
                                        <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-2 text-gray-600 hover:text-primary transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex justify-between text-base font-bold text-gray-900 mb-4">
                        <p>Tổng tiền</p>
                        <p className="text-primary">{formatVND(total)}</p>
                    </div>
                    <button className="w-full bg-primary hover:bg-primaryDark text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50" disabled={cart.length === 0}>
                        Tiến hành Thanh toán
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductModal = ({ isOpen, onClose, product, onSave }) => {
    const [formData, setFormData] = useState({
        name: '', price: 0, stock_quantity: 0, image_url: '', description: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                price: product.price || 0,
                stock_quantity: product.stock_quantity || 0,
                image_url: product.image_url || ''
            });
        } else {
            setFormData({ name: '', price: 0, stock_quantity: 100, image_url: '', description: '' });
        }
    }, [product, isOpen]);

    const imageToBase64InlineData = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64data,
                        mimeType: blob.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const generateDescriptionFromImage = async () => {
        if (!formData.image_url) {
            alert("Chưa có ảnh! Vui lòng chọn ảnh trước khi dùng AI phân tích.");
            return;
        }
        setIsGenerating(true);
        try {
            const { GoogleGenerativeAI } = await import('https://esm.sh/@google/generative-ai');
            
            let apiKey = '';
            try {
                apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            } catch (e) {
                apiKey = prompt("Môi trường không dùng Vite. Vui lòng nhập tạm Gemini API Key để dùng thử (Hoặc cấu hình Vite để đọc từ .env):");
            }

            if (!apiKey) {
                alert("Không tìm thấy API Key!");
                setIsGenerating(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const visionModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

            const imagePart = await imageToBase64InlineData(formData.image_url);
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

            const result = await visionModel.generateContent([promptText, imagePart]);
            const response = await result.response;
            const text = response.text();

            setFormData(prev => ({ ...prev, description: text }));
        } catch (error) {
            console.error("AI Error:", error);
            alert("Lỗi AI: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...(product || {}), ...formData });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold">{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><IconClose /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                        <input required type="text" className="w-full border rounded-lg px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ) *</label>
                            <input required type="number" className="w-full border rounded-lg px-3 py-2" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho *</label>
                            <input required type="number" className="w-full border rounded-lg px-3 py-2" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Hình ảnh *</label>
                        <input required type="url" className="w-full border rounded-lg px-3 py-2" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
                        {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-2 h-24 object-cover rounded border" />}
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                            <button 
                                type="button" 
                                onClick={generateDescriptionFromImage}
                                disabled={isGenerating}
                                className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-1 px-3 rounded shadow-sm flex items-center transition-all disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <><i className="fa-solid fa-spinner fa-spin mr-1"></i> Đang phân tích ảnh...</>
                                ) : (
                                    <>✨ AI Tự Động Viết Mô Tả</>
                                )}
                            </button>
                        </div>
                        <textarea rows="4" className="w-full border rounded-lg px-3 py-2" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Nhập mô tả sản phẩm..."></textarea>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primaryDark shadow-sm">Lưu lại</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ZaloModal = ({ isOpen, onClose, currentNumber, onSave }) => {
    const [num, setNum] = useState('');
    useEffect(() => { setNum(currentNumber || ''); }, [currentNumber, isOpen]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold">Cập nhật số Zalo</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><IconClose /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(num); }} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại Zalo</label>
                        <input required type="text" className="w-full border rounded-lg px-3 py-2 focus:ring-primary focus:border-primary" value={num} onChange={e => setNum(e.target.value)} placeholder="VD: 0902631632" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg font-medium">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">Cập nhật</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main App ---
const App = () => {
    const [products, setProducts] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    
    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: false });
            if (pData) setProducts(pData);
            
            const { data: sData } = await supabase.from('settings').select('*').eq('id', 1).single();
            if (sData) setSettings(sData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Derived Data
    const uniqueTags = useMemo(() => {
        const tags = new Set();
        products.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Visibility & Stock logic
            if (!isAdmin) {
                if (p.is_hidden || p.stock_quantity <= 0) return false;
            }
            // Search logic
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // Tag logic
            if (selectedTag && (!p.tags || !p.tags.includes(selectedTag))) return false;
            
            return true;
        });
    }, [products, isAdmin, searchQuery, selectedTag]);

    // Handlers
    const handleAddToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...product, qty: 1 }];
        });
        setIsCartOpen(true);
    };

    const handleAdminLogin = () => {
        if (!isAdmin) {
            const pwd = prompt("Nhập mật khẩu Admin:");
            if (pwd === "admin@1993") {
                setIsAdmin(true);
            } else if (pwd !== null) {
                alert("Sai mật khẩu!");
            }
        } else {
            setIsAdmin(false); // Logout
        }
    };

    const handleToggleVisibility = async (product) => {
        const { error } = await supabase.from('products').update({ is_hidden: !product.is_hidden }).eq('id', product.id);
        if (!error) fetchData();
    };

    const handleSaveProduct = async (productData) => {
        const { id, name, price, stock_quantity, image_url } = productData;
        if (id) {
            // Update
            await supabase.from('products').update({ name, price, stock_quantity, image_url }).eq('id', id);
        } else {
            // Insert
            await supabase.from('products').insert([{ 
                name, price, stock_quantity, image_url, sku: 'NEW-' + Date.now(), is_hidden: false, tags: ['Khác'] 
            }]);
        }
        setIsProductModalOpen(false);
        fetchData();
    };

    const handleSaveZalo = async (newNumber) => {
        await supabase.from('settings').update({ zalo_number: newNumber }).eq('id', 1);
        setIsZaloModalOpen(false);
        fetchData();
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header cartCount={cart.reduce((a,c)=>a+c.qty, 0)} onOpenCart={() => setIsCartOpen(true)} onSearch={setSearchQuery} />
            <HeroBanner />
            
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                
                {isAdmin && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-primaryDark font-bold">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                            Chế độ Quản Trị (Admin)
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="flex items-center gap-1 bg-white border border-gray-300 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 shadow-sm text-sm">
                                <IconPlus /> Thêm sản phẩm
                            </button>
                            <button onClick={() => setIsZaloModalOpen(true)} className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-600 shadow-sm text-sm">
                                Cập nhật Zalo
                            </button>
                        </div>
                    </div>
                )}

                {/* Filter Tags */}
                <div className="mb-8">
                    <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
                        <button 
                            onClick={() => setSelectedTag('')}
                            className={`whitespace-nowrap px-4 py-2 rounded-full font-medium transition-colors border ${!selectedTag ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                        >
                            Tất cả sản phẩm
                        </button>
                        {uniqueTags.map(tag => (
                            <button 
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full font-medium transition-colors border ${selectedTag === tag ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">Không tìm thấy sản phẩm nào.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col ${product.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                                <div className="relative aspect-square overflow-hidden bg-gray-100">
                                    <img 
                                        src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80'} 
                                        alt={product.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {isAdmin && (
                                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                                            <button onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }} className="p-2 bg-white/90 backdrop-blur rounded-full shadow hover:bg-primary hover:text-white transition-colors" title="Chỉnh sửa">
                                                <IconEdit />
                                            </button>
                                            <button onClick={() => handleToggleVisibility(product)} className={`p-2 bg-white/90 backdrop-blur rounded-full shadow transition-colors ${product.is_hidden ? 'hover:bg-green-500 hover:text-white text-green-600' : 'hover:bg-gray-800 hover:text-white text-gray-600'}`} title={product.is_hidden ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}>
                                                {product.is_hidden ? <IconEye /> : <IconEyeOff />}
                                            </button>
                                        </div>
                                    )}
                                    {product.is_hidden && <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow">Đang ẩn</div>}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 leading-snug" title={product.name}>{product.name}</h3>
                                    <div className="mt-auto pt-2">
                                        <div className="flex justify-between items-end mb-3">
                                            <p className="text-primary font-black text-lg tracking-tight">{formatVND(product.price)}</p>
                                            <p className="text-xs text-gray-500">Kho: {product.stock_quantity}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleAddToCart(product)}
                                            disabled={product.stock_quantity <= 0}
                                            className="w-full bg-red-50 hover:bg-primary text-primary hover:text-white font-bold py-2 px-4 rounded-xl border border-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {product.stock_quantity > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="bg-white border-t py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-sm text-gray-500">
                    <p>&copy; 2026 Hùng Thuận Tokcay. All rights reserved.</p>
                    <button onClick={handleAdminLogin} className="hover:text-primary transition-colors cursor-pointer focus:outline-none">
                        {isAdmin ? 'Thoát Admin' : 'Admin'}
                    </button>
                </div>
            </footer>

            <CartSlideOver isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} setCart={setCart} />
            <ZaloWidget zaloNumber={settings?.zalo_number} />
            
            {isAdmin && (
                <>
                    <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={editingProduct} onSave={handleSaveProduct} />
                    <ZaloModal isOpen={isZaloModalOpen} onClose={() => setIsZaloModalOpen(false)} currentNumber={settings?.zalo_number} onSave={handleSaveZalo} />
                </>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <>
        <App />
        <Analytics />
    </>
);
