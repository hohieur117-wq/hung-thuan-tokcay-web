import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';

        // Tích hợp Supabase
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const formatVND = (price) => {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price).replace('��', '�');
        };

        const FallbackImage = "/media__1783016111445.png";
        const LogoImage = "./logo.png";

        // --- Helper: Crop Image using Canvas ---
        const cropImage = (file, targetRatio) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        let srcWidth = img.width;
                        let srcHeight = img.height;
                        let srcRatio = srcWidth / srcHeight;

                        let cropWidth = srcWidth;
                        let cropHeight = srcHeight;

                        if (srcRatio > targetRatio) {
                            // Ảnh g�c quá r�"ng ngang => Cắt b�:t chiều ngang
                            cropWidth = srcHeight * targetRatio;
                        } else {
                            // Ảnh g�c quá cao => Cắt b�:t chiều cao
                            cropHeight = srcWidth / targetRatio;
                        }

                        const startX = (srcWidth - cropWidth) / 2;
                        const startY = (srcHeight - cropHeight) / 2;

                        canvas.width = cropWidth;
                        canvas.height = cropHeight;

                        ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Canvas is empty'));
                                return;
                            }
                            resolve(blob);
                        }, file.type || 'image/jpeg', 0.9);
                    };
                    img.onerror = (error) => reject(error);
                };
                reader.onerror = (error) => reject(error);
            });
        };

        // --- Components ---
        const Header = ({ cartCount, onOpenCart, onSearch, onContactClick, onProductsClick }) => {
            return (
                <header className="sticky top-0 z-40 bg-primary shadow-lg border-b border-primaryDark">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            {/* Logo */}
                            <div className="flex-1 flex justify-start items-center">
                                <a href="#" className="flex items-center cursor-pointer" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>
                                    <img src="/logo_new.png" alt="Logo Hùng Thuận Tokcay" className="h-10 md:h-12 lg:h-14 w-auto object-contain cursor-pointer" />
                                </a>
                            </div>

                            {/* Search */}
                            <div className="flex-1 hidden md:flex justify-center items-center">
                                <div className="relative flex shadow-inner rounded-lg overflow-hidden bg-white/10 p-1 w-full max-w-md">
                                    <input
                                        type="text"
                                        className="block w-full pl-4 pr-12 py-2.5 rounded-l-md border-none leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none sm:text-sm"
                                        placeholder="Tìm kiếm sản phẩm..."
                                        onChange={(e) => onSearch(e.target.value)}
                                    />
                                    <button className="bg-white hover:bg-gray-100 text-primary px-5 py-2.5 rounded-r-md transition-colors flex items-center justify-center border-l border-gray-200">
                                        <i className="fa-solid fa-magnifying-glass"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Navigation & Cart */}
                            <div className="flex-1 flex justify-end items-center gap-4 lg:gap-8">
                                <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px'}} className="hidden lg:flex text-white font-semibold text-sm">
                                    <button onClick={onProductsClick} className="hover:text-yellow-300 transition-colors uppercase tracking-wide outline-none p-2 flex items-center justify-center">Sản phẩm</button>
                                    <button onClick={() => alert('Hiện tại chưa có chương trình khuyến mãi nào. Bạn vui lòng quay lại sau nhé!')} className="hover:text-yellow-300 transition-colors uppercase tracking-wide outline-none p-2 flex items-center justify-center">Khuyến mãi</button>
                                    <button onClick={onContactClick} className="hover:text-yellow-300 transition-colors uppercase tracking-wide outline-none p-2 flex items-center justify-center">Liên hệ</button>
                                </nav>

                                <div className="flex items-center gap-2 sm:gap-4">
                                    <button onClick={() => {
                                        const el = document.getElementById('products-section');
                                        if (el) {
                                            const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                            window.scrollTo({ top: y, behavior: 'smooth' });
                                        }
                                    }} className="text-white hover:text-yellow-300 transition-colors outline-none p-2 flex items-center justify-center lg:hidden">
                                        <span className="hidden md:block font-semibold text-sm uppercase tracking-wide">Sản phẩm</span>
                                        <i className="fa-solid fa-box-open text-xl md:hidden"></i>
                                    </button>

                                    <button onClick={onContactClick} className="text-white hover:text-yellow-300 transition-colors outline-none p-2 flex items-center justify-center lg:hidden">

                                        <i className="fa-solid fa-headset text-xl"></i>
                                    </button>

                                    <button onClick={onOpenCart} className="relative p-2 text-white hover:text-yellow-300 transition-colors flex items-center justify-center">
                                        <i className="fa-solid fa-cart-shopping text-2xl"></i>
                                        {cartCount > 0 && (
                                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold leading-none text-primary transform translate-x-1/4 -translate-y-1/4 bg-yellow-400 rounded-full shadow-sm border border-yellow-300">
                                                {cartCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Search */}
                        <div className="md:hidden pb-4">
                            <div className="relative flex rounded-md overflow-hidden">
                                <input
                                    type="text"
                                    className="block w-full pl-4 pr-12 py-2 border-none leading-5 bg-white placeholder-gray-500 focus:outline-none sm:text-sm"
                                    placeholder="Tìm kiếm sản phẩm..."
                                    onChange={(e) => onSearch(e.target.value)}
                                />
                                <button className="bg-gray-100 text-primary px-4 py-2">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
            );
        };

        const HeroBanner = ({ bannerMobileUrl, bannerDesktopUrl, isAdmin, onBannerMobileUpload, onBannerDesktopUpload }) => {
            const finalMobileBanner = bannerMobileUrl || "./media__1783108509497.png";
            const finalDesktopBanner = bannerDesktopUrl || "./media__1783108509497.png";
            return (
                <div className="w-full flex justify-center mb-8 relative group">
                    <img
                        src={finalMobileBanner}
                        className="w-full h-auto block md:hidden"
                        alt="Banner Mobile"
                    />
                    <img
                        src={finalDesktopBanner}
                        className="w-full h-auto hidden md:block"
                        alt="Banner PC"
                    />
                    {isAdmin && (
                        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                            <div>
                                <input type="file" id="banner-mobile-upload" accept="image/*" className="hidden" onChange={onBannerMobileUpload} />
                                <label htmlFor="banner-mobile-upload" className="cursor-pointer bg-white/90 hover:bg-white text-gray-800 text-sm font-bold py-2 px-4 rounded shadow-md flex items-center gap-2 border border-gray-200 transition-colors">
                                    <i className="fa-solid fa-mobile-screen"></i> Thay Banner Điện Thoại
                                </label>
                            </div>
                            <div>
                                <input type="file" id="banner-desktop-upload" accept="image/*" className="hidden" onChange={onBannerDesktopUpload} />
                                <label htmlFor="banner-desktop-upload" className="cursor-pointer bg-white/90 hover:bg-white text-gray-800 text-sm font-bold py-2 px-4 rounded shadow-md flex items-center gap-2 border border-gray-200 transition-colors">
                                    <i className="fa-solid fa-desktop"></i> Thay Banner Máy Tính
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        const ZaloWidget = ({ zaloNumber }) => {
            const finalZaloNumber = zaloNumber || '0902631632';
            return (
                <a
                    href={`https://zalo.me/${finalZaloNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 w-14 h-14 bg-[#0068FF] rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-50 group border-2 border-white"
                >
                    <span className="text-white font-bold text-lg">Zalo</span>
                </a>
            );
        };

        const ContactModal = ({ isOpen, onClose, settings }) => {
            if (!isOpen) return null;

            // Các link mặc ��9nh theo yêu cầu
            const defaultFb = "https://www.facebook.com/share/18g7FWfpAP/";
            const defaultMaps = "https://maps.app.goo.gl/7XXZpNfJ3nQ6UUia6";
            const defaultZalo = "0902631632";

            const fbLink = settings?.facebook_url || defaultFb;
            const mapsLink = settings?.maps_url || defaultMaps;
            const zaloLink = `https://zalo.me/${settings?.link_zalo || settings?.zalo_number || defaultZalo}`;

            return (
                <div className="fixed inset-0 z-[80] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in relative p-8 border border-gray-100">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"><i className="fa-solid fa-xmark text-lg"></i></button>
                        <h3 className="text-2xl font-bold text-center text-gray-800 mb-8 uppercase tracking-wide border-b pb-4">LIÊN HỆ VỚI CHÚNG TÔI</h3>
                        <div className="space-y-4">
                            <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 rounded-xl text-white font-bold text-lg bg-[#0068FF] hover:bg-blue-700 transition-transform hover:scale-105 shadow-md">
                                <i className="fa-solid fa-comment-dots text-2xl"></i> Chat Zalo
                            </a>
                            <a href={fbLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full py-4 rounded-xl text-white font-bold text-lg bg-[#1877F2] hover:bg-[#166FE5] transition-transform hover:scale-105 shadow-md">
                                <i className="fa-brands fa-facebook text-2xl"></i> Trang Facebook
                            </a>
                            <a href={mapsLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full py-4 rounded-xl text-gray-700 font-bold text-lg bg-white border border-gray-300 hover:bg-gray-50 transition-transform hover:scale-105 shadow-md">
                                <i className="fa-solid fa-map-location-dot text-green-600 text-2xl"></i> Bản đồ Google Maps
                            </a>
                        </div>
                    </div>
                </div>
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

            const handleCheckout = () => {
                if (cart.length === 0) return;
                let message = "Xin chào shop, tôi mu�n �ặt hàng:\n";
                cart.forEach((item, index) => {
                    message += `${index + 1}. ${item.name} - S� lượng: ${item.qty}\n`;
                });
                message += `T�"ng tạm tính: ${formatVND(total)}`;

                const encodedMessage = encodeURIComponent(message);
                window.open(`https://zalo.me/0902631632?text=${encodedMessage}`, '_blank');
            };

            return (
                <div className={`fixed inset-0 z-[60] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" onClick={onClose}></div>
                    <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-primaryLight">
                            <h2 className="text-xl font-bold text-primaryDark">Giỏ hàng ({cart.reduce((a, c) => a + c.qty, 0)})</h2>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full bg-white transition-colors">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
                                    <i className="fa-solid fa-basket-shopping text-6xl text-gray-200 mb-4"></i>
                                    <p>Giỏ hàng của bạn đang trống</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative pr-10">
                                        <img src={item.image_url || FallbackImage} onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }} alt={item.name} className="w-20 h-20 object-cover rounded-lg border border-gray-100" />
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug" title={item.name}>{item.name}</h4>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-primary font-bold">{formatVND(item.price)}</p>
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                    <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition-colors"><i className="fa-solid fa-minus text-xs"></i></button>
                                                    <span className="px-3 py-1 text-sm font-medium bg-white border-x border-gray-200">{item.qty}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition-colors"><i className="fa-solid fa-plus text-xs"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => updateQuantity(item.id, 0)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-2"><i className="fa-solid fa-trash-can"></i></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="border-t border-gray-100 p-5 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between text-lg font-bold text-gray-900 mb-5">
                                    <p>Tổng tiền:</p>
                                <p className="text-primary text-xl">{formatVND(total)}</p>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-primary hover:bg-primaryDark text-white font-bold py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                disabled={cart.length === 0}
                            >
                                Đặt hàng
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const ProductDetailsModal = ({ isOpen, onClose, product, onAddToCart }) => {
            if (!isOpen || !product) return null;
            const isOutOfStock = product.stock_status && product.stock_status.toLowerCase() === 'hết hàng';
            const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

            return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center modal-overlay p-4 sm:p-6">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col sm:flex-row overflow-hidden animate-fade-in relative">
                        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-500 hover:text-red-500 shadow-md">
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        {/* Image Section */}
                        <div className="w-full sm:w-1/2 bg-gray-50 flex items-center justify-center p-6 border-b sm:border-b-0 sm:border-r border-gray-100">
                            <img src={product.image_url || FallbackImage} onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }} alt={product.name} className="w-full max-h-[40vh] sm:max-h-full object-contain mix-blend-multiply drop-shadow-md" />
                        </div>

                        {/* Content Section */}
                        <div className="w-full sm:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto hide-scroll">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h2>
                            <p className="text-3xl font-black text-primary mb-6">{formatVND(product.price)}</p>

                            <div className="prose prose-sm text-gray-600 mb-8 flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2 text-base">Thông tin chi tiết</h4>
                                {product.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                                ) : (
                                    <p className="italic text-gray-400">Chưa có mô tả chi tiết cho sản phẩm này.</p>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-sm text-gray-600 font-medium">Tình trạng:</span>
                                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${colorClass}`}>
                                        {product.stock_status || 'Hàng sẵn tại kho'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { onAddToCart(product); onClose(); }}
                                    disabled={isOutOfStock}
                                    className="w-full bg-primary hover:bg-primaryDark text-white font-bold py-4 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                                >
                                    <i className="fa-solid fa-cart-plus"></i>
                                    {isOutOfStock ? 'Sản phẩm hết hàng' : 'Thêm vào giỏ hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const AdminProductModal = ({ isOpen, onClose, product, onSave, uniqueTags }) => {
            const [formData, setFormData] = useState({
                name: '', price: '', stock_status: 'Hàng sẵn kho', statusColor: 'green', image_url: '', description: '', tags: []
            });
            const [tagsInput, setTagsInput] = useState('');
            const [uploading, setUploading] = useState(false);
            const [isGenerating, setIsGenerating] = useState(false);

            useEffect(() => {
                if (product) {
                    let oldStatus = product.stock_status || 'Hàng sẵn kho';
                    if (oldStatus === 'Hàng sẵn' || oldStatus === 'Hàng sẵn tại kho' || oldStatus === 'Còn hàng') {
                        oldStatus = 'Hàng sẵn kho';
                    }
                    setFormData({
                        name: product.name || '',
                        price: product.price ?? '',
                        stock_status: oldStatus,
                        statusColor: product.statusColor || 'green',
                        image_url: product.image_url || '',
                        description: product.description || '',
                        tags: product.tags || []
                    });
                    setTagsInput((product.tags || []).join(', '));
                } else {
                    setFormData({ name: '', price: '', stock_status: 'Hàng sẵn kho', statusColor: 'green', image_url: '', description: '', tags: [] });
                    setTagsInput('');
                }
            }, [product, isOpen]);

            if (!isOpen) return null;

            const handleFileUpload = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);

                try {
                    // Cắt ảnh t�0 l�! 1:1 cho sản phẩm
                    const croppedBlob = await cropImage(file, 1);

                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const filePath = `products/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, croppedBlob, {
                        contentType: 'image/jpeg'
                    });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                    setFormData({ ...formData, image_url: data.publicUrl });
                } catch (error) {
                    alert('L�i xử lý ảnh: ' + error.message);
                } finally {
                    setUploading(false);
                }
            };

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
                    alert("Chưa có ảnh! Vui lòng chọn ảnh trư�:c khi dùng AI phân tích.");
                    return;
                }
                setIsGenerating(true);
                try {
                    // Kh�xi tạo model từ esm.sh do chạy trực tiếp trên trình duy�!t bằng Babel
                    // Hoặc lấy từ file config nếu có dùng Vite (bundle)
                    const { GoogleGenerativeAI } = await import('https://esm.sh/@google/generative-ai');

                    // Thử lấy key từ import.meta.env (nếu dùng Vite) hoặc yêu cầu nhập tạm nếu chạy thuần
                    let apiKey = '';
                    try {
                        apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    } catch (e) {
                        // Trình duy�!t không h� trợ import.meta.env
                        apiKey = prompt("Môi trường không dùng Vite. Vui lòng nhập tạm Gemini API Key �Ồ dùng thử (Hoặc cấu hình Vite �Ồ �ọc từ .env):");
                    }

                    if (!apiKey) {
                        alert("Không tìm thấy API Key!");
                        setIsGenerating(false);
                        return;
                    }

                    const genAI = new GoogleGenerativeAI(apiKey);
                    const visionModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

                    const imagePart = await imageToBase64InlineData(formData.image_url);
                    const promptText = `Bạn là m�"t chuyên gia kiỒm ��9nh nhãn mác hàng hóa và là copywriter cho cửa hàng thực phẩm Hàn Qu�c. Nhi�!m vụ: soi CỰC KỲ CHI TIẾT hình ảnh bao bì sản phẩm �ược cung cấp.
QUY TẮC: 
1. Trích xuất chính xác 100% thông tin (kh�i lượng, thành phần, thương hi�!u...).
2. Tuy�!t ��i không b�9a �ặt s� li�!u. Nếu ảnh mờ, dùng kiến thức thực tế về mặt hàng �ó �Ồ suy luận hợp lý.
3. KH�NG chào hỏi, KH�NG dùng markdown code block. CH�� TRẢ VỬ kết quả tuân thủ �úng biỒu mẫu sau:

* Tên sản phẩm: [Điền tên chuẩn]
* Thương hi�!u: [Điền tên thương hi�!u]
* Kh�i lượng t�9nh: [Điền kh�i lượng/thỒ tích]
* Thành phần: [Li�!t kê thành phần chính]
* Dạng sản phẩm: [B�"t m�9n, x�t �ặc, sợi khô...]
* Hương v�9: [Mô tả ngắn gọn]
* Công dụng: [Cách chế biến]
* Đ�i tượng sử dụng: [Gia �ình, nhà hàng...]
* Bảo quản: [Hư�:ng dẫn bảo quản]
* Quy cách �óng gói: [Túi zip, chai thủy tinh...]`;

                    const result = await visionModel.generateContent([promptText, imagePart]);
                    const response = await result.response;
                    const text = response.text();

                    setFormData(prev => ({ ...prev, description: text }));
                } catch (error) {
                    console.error("AI Error:", error);
                    alert("L�i AI: " + error.message);
                } finally {
                    setIsGenerating(false);
                }
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                const processedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
                onSave({ ...(product || {}), ...formData, price: formData.price === '' ? 0 : Number(formData.price), tags: processedTags });
            };

            return (
                <div className="fixed inset-0 z-[70] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                            <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto hide-scroll flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên sản phẩm *</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Giá (VNĐ) *</label>
                                    <input required type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tình trạng *</label>
                                    <div className="flex gap-2">
                                        <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={formData.stock_status} onChange={e => setFormData({ ...formData, stock_status: e.target.value })} placeholder="VD: Hàng sẵn kho, Hết hàng..." />
                                        <select
                                            className="w-1/3 border border-gray-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
                                            value={formData.statusColor}
                                            onChange={e => setFormData({ ...formData, statusColor: e.target.value })}
                                        >
                                            <option value="green">Màu Xanh</option>
                                            <option value="red">Màu Đỏ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (Phân cách bằng dấu phẩy)</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="VD: Bánh gạo/Tokbokki, Gia vị & Xốt" />
                                {uniqueTags && uniqueTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {uniqueTags.map(tag => (
                                            <span
                                                key={tag}
                                                onClick={() => setTagsInput(tag)}
                                                className="inline-flex items-center w-max whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 text-[11px] md:text-xs md:px-2 md:py-1 cursor-pointer transition-colors border border-gray-200"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Hình ảnh (Sẽ tự động cắt Vuông 1:1)</label>
                                <div className="flex gap-2">
                                    <input required type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                                    <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 cursor-pointer px-4 py-2.5 rounded-lg font-semibold text-gray-700 whitespace-nowrap transition-colors flex items-center justify-center min-w-[140px]">
                                        {uploading ? <span className="text-blue-600"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang xử lý...</span> : 'Chọn ảnh'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>
                                {formData.image_url && <img src={formData.image_url} alt="Preview" className="mt-3 h-32 w-32 object-cover rounded-lg border border-gray-200 shadow-sm" />}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-semibold text-gray-700">Mô tả chi tiết</label>
                                    <button
                                        type="button"
                                        onClick={generateDescriptionFromImage}
                                        disabled={isGenerating || uploading}
                                        className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-1 px-3 rounded shadow-sm flex items-center transition-all disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <><i className="fa-solid fa-spinner fa-spin mr-1"></i> Đang quét ảnh...</>
                                        ) : (
                                            <>✨ AI Tự Động Viết Mô Tả</>
                                        )}
                                    </button>
                                </div>
                                <textarea rows="6" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Nhập mô tả sản phẩm hoặc dùng AI..."></textarea>
                            </div>
                        </form>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
                            <button type="submit" onClick={handleSubmit} disabled={uploading} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primaryDark shadow-md transition-colors disabled:opacity-50">Lưu sản phẩm</button>
                        </div>
                    </div>
                </div>
            );
        };

        const AdminSettingsModal = ({ isOpen, onClose, settings, onSave }) => {
            const [formData, setFormData] = useState({});
            const [uploading, setUploading] = useState(false);

            useEffect(() => {
                if (settings) setFormData(settings);
            }, [settings, isOpen]);

            if (!isOpen) return null;

            const handleBannerUpload = async (e, type) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);

                try {
                    const fileName = `${Date.now()}_banner_${type}.jpg`;
                    const filePath = `banners/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, {
                        contentType: file.type || 'image/jpeg'
                    });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                    if (type === 'mobile') {
                        setFormData({ ...formData, banner_mobile_url: data.publicUrl });
                    } else {
                        setFormData({ ...formData, banner_desktop_url: data.publicUrl });
                    }
                } catch (error) {
                    alert('L�i xử lý ảnh: ' + error.message);
                } finally {
                    setUploading(false);
                }
            };

            return (
                <div className="fixed inset-0 z-[70] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-800">Cài đặt chung</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="p-6 overflow-y-auto hide-scroll flex-1 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Zalo</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.link_zalo || ''} onChange={e => setFormData({ ...formData, link_zalo: e.target.value })} placeholder="VD: 0902631632 hoặc link zalo.me" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Facebook</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.facebook_url || ''} onChange={e => setFormData({ ...formData, facebook_url: e.target.value })} placeholder="https://facebook.com/..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Google Maps</label>
                                <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" value={formData.maps_url || ''} onChange={e => setFormData({ ...formData, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Ảnh Banner Điện Thoại (Không cắt xén)</label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none" value={formData.banner_mobile_url || ''} onChange={e => setFormData({ ...formData, banner_mobile_url: e.target.value })} placeholder="https://..." />
                                    <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 cursor-pointer px-4 py-2 rounded-lg font-semibold text-gray-700 whitespace-nowrap min-w-[140px] flex items-center justify-center">
                                        {uploading ? <span className="text-blue-600"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang xử lý...</span> : 'Chọn ảnh Mobile'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerUpload(e, 'mobile')} disabled={uploading} />
                                    </label>
                                </div>
                                {formData.banner_mobile_url && <img src={formData.banner_mobile_url} alt="Banner Mobile" className="mt-3 w-full h-auto object-contain rounded-lg border border-gray-200 shadow-sm max-h-40" />}
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Ảnh Banner Máy Tính (Không cắt xén)</label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none" value={formData.banner_desktop_url || ''} onChange={e => setFormData({ ...formData, banner_desktop_url: e.target.value })} placeholder="https://..." />
                                    <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 cursor-pointer px-4 py-2 rounded-lg font-semibold text-gray-700 whitespace-nowrap min-w-[140px] flex items-center justify-center">
                                        {uploading ? <span className="text-blue-600"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang xử lý...</span> : 'Chọn ảnh PC'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerUpload(e, 'desktop')} disabled={uploading} />
                                    </label>
                                </div>
                                {formData.banner_desktop_url && <img src={formData.banner_desktop_url} alt="Banner PC" className="mt-3 w-full h-auto object-contain rounded-lg border border-gray-200 shadow-sm max-h-40" />}
                            </div>
                        </form>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Hủy</button>
                            <button type="button" onClick={() => onSave(formData)} disabled={uploading} className="px-5 py-2.5 bg-[#0068FF] text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50">Cập nhật</button>
                        </div>
                    </div>
                </div>
            );
        };

        const TagsSlider = ({ uniqueTags, selectedTag, onTagToggle, isAdmin, onManageTags }) => {
            const sliderRef = useRef(null);
            const scrollLeft = () => {
                if (sliderRef.current) sliderRef.current.scrollBy({ left: -200, behavior: 'smooth' });
            };
            const scrollRight = () => {
                if (sliderRef.current) sliderRef.current.scrollBy({ left: 200, behavior: 'smooth' });
            };

            return (
                <div className="w-full">
                    <style>{`
                        .hide-scrollbar::-webkit-scrollbar {
                            display: none !important;
                        }
                    `}</style>
                    <h3 className="text-xl md:text-2xl font-bold text-center text-primary mb-4 uppercase">DANH MỤC SẢN PHẨM</h3>
                    <div className="mb-6">
                        <div className="w-full bg-white border border-gray-100 rounded-xl shadow-sm p-4 md:py-2 md:px-0 relative overflow-hidden">
                            <div className="relative w-full max-w-4xl mx-auto flex items-center">
                                <button onClick={scrollLeft} className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center bg-white border border-gray-200 shadow-md rounded-full hover:bg-gray-50 text-gray-600 cursor-pointer">&lt;</button>

                                <div
                                    ref={sliderRef}
                                    className="grid grid-cols-2 gap-3 md:flex md:flex-row md:flex-nowrap md:overflow-x-auto md:scroll-smooth md:gap-4 md:px-12 w-full items-center hide-scrollbar"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {isAdmin && (
                                        <button
                                            onClick={onManageTags}
                                            className="flex items-center justify-center text-center font-medium border rounded-full transition-colors w-full min-h-[44px] text-[14px] md:w-max md:min-h-[38px] md:text-sm md:px-4 md:py-1.5 md:flex-shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                        >
                                            <i className="fa-solid fa-gear mr-1"></i> Quản lý
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onTagToggle('')}
                                        className={`flex items-center justify-center text-center font-medium border rounded-full transition-colors w-full min-h-[44px] text-[14px] md:w-max md:min-h-[38px] md:text-sm md:px-4 md:py-1.5 md:flex-shrink-0 ${selectedTag === '' ? 'bg-[#b91c1c] text-white border-[#b91c1c]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        Tất cả sản phẩm
                                    </button>
                                    {uniqueTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => onTagToggle(tag)}
                                            className={`flex items-center justify-center text-center font-medium border rounded-full transition-colors w-full min-h-[44px] text-[14px] md:w-max md:min-h-[38px] md:text-sm md:px-4 md:py-1.5 md:flex-shrink-0 ${selectedTag === tag ? 'bg-[#b91c1c] text-white border-[#b91c1c]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={scrollRight} className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 items-center justify-center bg-white border border-gray-200 shadow-md rounded-full hover:bg-gray-50 text-gray-600 cursor-pointer">&gt;</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const AdminTagsModal = ({ isOpen, onClose, categories, fetchData }) => {
            const [newTag, setNewTag] = useState('');
            const [isLoading, setIsLoading] = useState(false);

            if (!isOpen) return null;

            const handleAdd = async () => {
                if (newTag.trim() && !categories.includes(newTag.trim())) {
                    setIsLoading(true);
                    await supabase.from('tags').insert([{ name: newTag.trim() }]);
                    setNewTag('');
                    await fetchData();
                    setIsLoading(false);
                }
            };

            const handleEdit = async (index) => {
                const oldName = categories[index];
            const updated = prompt('Nhập tên danh mục mới:', oldName);
                if (updated && updated.trim()) {
                    setIsLoading(true);
                    await supabase.from('tags').update({ name: updated.trim() }).eq('name', oldName);
                    await fetchData();
                    setIsLoading(false);
                }
            };

            const handleDelete = async (index) => {
            if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này không?')) {
                    setIsLoading(true);
                    const oldName = categories[index];
                    await supabase.from('tags').delete().eq('name', oldName);
                    await fetchData();
                    setIsLoading(false);
                }
            };

            return (
                <div className="fixed inset-0 z-[80] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Quản lý Danh Mục</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div className="p-5 flex gap-2">
                                            <input type="text" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tên danh mục mới..." />
                            <button onClick={handleAdd} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primaryDark transition-colors">Thêm</button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-3">
                            {categories.map((cat, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="font-semibold text-gray-700">{cat}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(index)} className="text-blue-500 hover:text-blue-700 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center transition-colors"><i className="fa-solid fa-pen"></i></button>
                                        <button onClick={() => handleDelete(index)} className="text-red-500 hover:text-red-700 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        const ProductDetail = ({ onAddToCart }) => {
            const { id } = useParams();
            const [product, setProduct] = useState(null);
            const [loading, setLoading] = useState(true);
            const navigate = useNavigate();

            const handleBack = () => {
                if (window.history.length > 2) {
                    navigate(-1);
                } else {
                    navigate('/');
                }
            };

            useEffect(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }, []);


            useEffect(() => {
                const fetchProductDetail = async () => {
                    setLoading(true);
                    try {
                        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
                        if (error) throw error;
                        setProduct(data);
                    } catch (error) {
                        console.error('Error fetching product:', error);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchProductDetail();
            }, [id]);

            if (loading) {
                return (
                    <div className="flex justify-center py-32">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                    </div>
                );
            }

            if (!product) {
                return <div className="text-center py-32 text-gray-500">Không tìm thấy sản phẩm.</div>;
            }

            const isOutOfStock = product.stock_status && product.stock_status.toLowerCase() === 'hết hàng';
            const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

            return (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row p-6 md:p-10 mb-8 animate-fade-in">
                    <div className="w-full md:w-1/2 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50 rounded-xl">
                        <img
                            src={product.image_url || FallbackImage}
                            onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                            alt={product.name}
                            className="w-full max-h-[500px] object-contain mix-blend-multiply drop-shadow-md"
                        />
                    </div>
                    <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
                        <button onClick={handleBack} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition-all mb-5 active:scale-95 w-max cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> Quay lại
                        </button>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h1>
                        <p className="text-4xl font-black text-primary mb-6">{formatVND(product.price)}</p>

                        <div className="prose prose-sm text-gray-600 mb-8 flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2 text-lg">Thông tin chi tiết</h4>
                            {product.description ? (
                                <div dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                            ) : (
                                <p className="italic text-gray-400">Chưa có mô tả chi tiết cho sản phẩm này.</p>
                            )}
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-base text-gray-600 font-medium">Tình trạng:</span>
                                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${colorClass}`}>
                                    {product.stock_status || 'Hàng sẵn tại kho'}
                                </span>
                            </div>
                            <button
                                onClick={() => onAddToCart(product)}
                                disabled={isOutOfStock}
                                className="w-full bg-primary hover:bg-primaryDark text-white font-bold py-4 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                            >
                                <i className="fa-solid fa-cart-plus"></i>
                                {isOutOfStock ? 'Sản phẩm hết hàng' : 'Thêm vào giỏ hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const HomeScrollRestoration = () => {
            useEffect(() => {
                const savedScroll = sessionStorage.getItem('homeScrollY');
                if (savedScroll) {
                    setTimeout(() => {
                        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
                    }, 0);
                }
                const handleScroll = () => {
                    sessionStorage.setItem('homeScrollY', window.scrollY);
                };
                window.addEventListener('scroll', handleScroll, { passive: true });
                return () => {
                    window.removeEventListener('scroll', handleScroll);
                };
            }, []);
            return null;
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
            const [currentPage, setCurrentPage] = useState(1);
            const ITEMS_PER_PAGE = 15;

            // Filter States
            const [showFilters, setShowFilters] = useState(false);
            const [selectedTag, setSelectedTag] = useState('');
            const [priceMin, setPriceMin] = useState('');
            const [priceMax, setPriceMax] = useState('');
            const [sortOrder, setSortOrder] = useState('');

            // Modals
            const [selectedProduct, setSelectedProduct] = useState(null);
            const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
            const [isContactModalOpen, setIsContactModalOpen] = useState(false);

            // Admin State
            const [isAdmin, setIsAdmin] = useState(false);
            const [editingProduct, setEditingProduct] = useState(null);
            const [isProductModalOpen, setIsProductModalOpen] = useState(false);
            const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
            const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

            const [categories, setCategories] = useState([]);
            const [localBanner, setLocalBanner] = useState(null);

            const productsSectionRef = useRef(null);

            const fetchData = async () => {
                setLoading(true);
                try {
                    const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: false });
                    if (pData) setProducts(pData);

                    const { data: sData } = await supabase.from('settings').select('*');
                    if (sData) {
                        const settingsObj = {};
                        sData.forEach(item => {
                            settingsObj[item.key] = item.value;
                        });
                        setSettings(settingsObj);
                    }

                    const { data: tData } = await supabase.from('tags').select('*').order('created_at', { ascending: true });
                    if (tData) {
                        setCategories(tData.map(t => t.name));
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };

            useEffect(() => {
                fetchData();
            }, []);

            // Reset page to 1 on filter change
            useEffect(() => {
                setCurrentPage(1);
            }, [searchQuery, selectedTag, priceMin, priceMax, sortOrder]);

            const handleAppBannerUpload = async (e, type) => {
                const file = e.target.files[0];
                if (!file) return;
                setLoading(true);

                try {
                    const fileName = `${Date.now()}_banner_${type}.jpg`;
                    const filePath = `banners/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, {
                        contentType: file.type || 'image/jpeg'
                    });
                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);

                    const dbKey = type === 'mobile' ? 'banner_mobile_url' : 'banner_desktop_url';
                    await supabase.from('settings').upsert({ key: dbKey, value: data.publicUrl }, { onConflict: 'key' });
                    await fetchData();
                } catch (error) {
                    alert('L�i xử lý banner: ' + error.message);
                } finally {
                    setLoading(false);
                }
            };

            const filteredProducts = useMemo(() => {
                return products.filter(p => {
                    // Hidden/Stock logic
                    if (!isAdmin) {
                        const isOutOfStock = p.stock_status && p.stock_status.toLowerCase() === 'hết hàng';
                        if (p.is_hidden || isOutOfStock) return false;
                    }

                    // Search
                    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

                    // Single-tag filter
                    if (selectedTag !== '') {
                        if (!p.tags) return false;
                        if (!p.tags.includes(selectedTag)) return false;
                    }

                    // Price filter
                    const price = p.price || 0;
                    if (priceMin && price < Number(priceMin)) return false;
                    if (priceMax && price > Number(priceMax)) return false;

                    return true;
                });

                if (sortOrder === 'asc') {
                    result.sort((a, b) => (a.price || 0) - (b.price || 0));
                } else if (sortOrder === 'desc') {
                    result.sort((a, b) => (b.price || 0) - (a.price || 0));
                }

                return result;
            }, [products, isAdmin, searchQuery, selectedTag, priceMin, priceMax, sortOrder]);

            const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
            const currentProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

            const handlePageChange = (newPage) => {
                if (newPage >= 1 && newPage <= totalPages) {
                    setCurrentPage(newPage);
                    if (productsSectionRef.current) {
                        const y = productsSectionRef.current.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }
            };

            const handleOpenDetails = (product) => {
                setSelectedProduct(product);
                setIsDetailsModalOpen(true);
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
                    setIsAdmin(false);
                }
            };

            const handleToggleVisibility = async (e, product) => {
                e.stopPropagation();
                const { error } = await supabase.from('products').update({ is_hidden: !product.is_hidden }).eq('id', product.id);
                if (!error) fetchData();
            };

            const handleEditClick = (e, product) => {
                e.stopPropagation();
                setEditingProduct(product);
                setIsProductModalOpen(true);
            };

            const handleDeleteProduct = async (e, product) => {
                e.stopPropagation();
                if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.")) {
                    try {
                        const { error } = await supabase.from('products').delete().eq('id', product.id);
                        if (error) throw error;

                        setProducts(prev => prev.filter(p => p.id !== product.id));

                        if (product.image_url && product.image_url.includes('supabase.co')) {
                            const parts = product.image_url.split('/public/images/');
                            if (parts.length === 2) {
                                await supabase.storage.from('images').remove([parts[1]]);
                            }
                        }
                    } catch (error) {
                        alert('L�i xóa sản phẩm: ' + error.message);
                    }
                }
            };

            const handleSaveProduct = async (productData) => {
                const { id, name, price, stock_status, statusColor, image_url, description, tags } = productData;
                let err;
                if (id) {
                    const { error } = await supabase.from('products').update({ name, price, stock_status, statusColor, image_url, description, tags }).eq('id', id);
                    err = error;
                } else {
                    const { error } = await supabase.from('products').insert([{
                        name, price, stock_status, statusColor, image_url, description, tags, sku: 'PVN' + Math.floor(Math.random() * 1000), is_hidden: false
                    }]);
                    err = error;
                }

                if (err) {
                    alert('L�i lưu sản phẩm: ' + err.message);
                } else {
                    setIsProductModalOpen(false);
                    fetchData(); // Cập nhật lại state products ngay lập tức
                }
            };

            const handleSaveSettings = async (newData) => {
                const updates = Object.keys(newData).map(key => ({
                    key: key,
                    value: newData[key]
                }));
                await supabase.from('settings').upsert(updates, { onConflict: 'key' });
                setIsSettingsModalOpen(false);
                fetchData();
            };

            const handleTagToggle = (tag) => {
                if (tag === '' || tag === 'ALL') {
                    setSelectedTag('');
                    return;
                }
                if (selectedTag === tag) {
                    setSelectedTag('');
                } else {
                    setSelectedTag(tag);
                }
            };

            const handlePresetPrice = (min, max) => {
                setPriceMin(min);
                setPriceMax(max);
            };

            return (
                <div className="min-h-screen flex flex-col font-sans">
                    <Header
                        cartCount={cart.reduce((a, c) => a + c.qty, 0)}
                        onOpenCart={() => setIsCartOpen(true)}
                        onSearch={setSearchQuery}
                        onContactClick={() => setIsContactModalOpen(true)}
                        onProductsClick={() => setShowFilters(!showFilters)}
                    />

                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                        <Routes>
                            <Route path="/" element={
                                <>
                                    <HomeScrollRestoration />
                                    <HeroBanner
                                        bannerMobileUrl={settings?.banner_mobile_url}
                                        bannerDesktopUrl={settings?.banner_desktop_url}
                                        isAdmin={isAdmin}
                                        onBannerMobileUpload={(e) => handleAppBannerUpload(e, 'mobile')}
                                        onBannerDesktopUpload={(e) => handleAppBannerUpload(e, 'desktop')}
                                    />

                                    <main id="products-section" className="flex-1 py-6 w-full" ref={productsSectionRef}>

                                        {isAdmin && (
                                            <div className="mb-8 p-5 bg-primaryLight border border-red-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                                                <div className="flex items-center gap-3 text-primaryDark font-bold text-lg">
                                                    <span className="relative flex h-4 w-4">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                                                    </span>
                                        Chế độ Quản Trị (Admin)
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                                                        <i className="fa-solid fa-plus"></i> Thêm sản phẩm
                                                    </button>
                                                    <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-900 shadow-sm transition-colors">
                                        <i className="fa-solid fa-gear"></i> Cài đặt chung
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col md:flex-row gap-6">

                                            {/* B�� L�RC */}
                                            {showFilters && (
                                                <aside className="hidden md:block w-full md:w-64 flex-shrink-0 animate-fade-in">
                                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 sticky top-24">
                                                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                                                            <h3 className="text-xl font-black text-gray-800">Bộ Lọc</h3>
                                                            <button onClick={() => setShowFilters(false)} className="md:hidden text-gray-400 hover:text-red-500 bg-gray-100 w-8 h-8 rounded-full"><i className="fa-solid fa-xmark"></i></button>
                                                        </div>

                                                        {/* Tag Filter */}
                                                        <div className="mb-6 border-b border-gray-100 pb-5">
                                                            <h4 className="font-bold text-gray-700 mb-3 flex items-center justify-between">Dòng Sản Phẩm <i className="fa-solid fa-chevron-up text-xs text-gray-400"></i></h4>
                                                            <div className="space-y-3 max-h-60 overflow-y-auto hide-scroll">
                                                                {categories.map(tag => (
                                                                    <label key={tag} className="flex items-center gap-3 cursor-pointer group">
                                                                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                                            checked={selectedTag === tag}
                                                                            onChange={(e) => {
                                                                                if (selectedTag === tag) setSelectedTag('');
                                                                                else setSelectedTag(tag);
                                                                            }}
                                                                        />
                                                                        <span className="text-gray-600 text-sm font-medium group-hover:text-primary transition-colors">{tag}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Price Filter */}
                                                        <div>
                                                            <h4 className="font-bold text-gray-700 mb-3 flex items-center justify-between">Khoảng Giá <i className="fa-solid fa-chevron-up text-xs text-gray-400"></i></h4>
                                                            <div className="flex items-center gap-2 mb-5">
                                                                <input type="number" placeholder="Từ" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                                                                <span className="text-gray-400">-</span>
                                                                <input type="number" placeholder="Đến" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" onChange={() => handlePresetPrice('', 50000)} />
                                                                    <span className="text-gray-600 text-sm font-medium group-hover:text-primary transition-colors">Dưới 50.000đ</span>
                                                                </label>
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" onChange={() => handlePresetPrice(50000, 150000)} />
                                                                    <span className="text-gray-600 text-sm font-medium group-hover:text-primary transition-colors">50.000đ - 150.000đ</span>
                                                                </label>
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" onChange={() => handlePresetPrice(150000, '')} />
                                                                    <span className="text-gray-600 text-sm font-medium group-hover:text-primary transition-colors">Trên 150.000đ</span>
                                                                </label>
                                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                                    <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" onChange={() => handlePresetPrice('', '')} />
                                                                    <span className="text-gray-600 text-sm font-medium group-hover:text-primary transition-colors">Tất cả mức giá</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </aside>
                                            )}

                                            {/* KHU VỰC SẢN PHẨM */}
                                            <div className="flex-1 w-full max-w-7xl mx-auto pb-10 mb-8">
                                                <TagsSlider uniqueTags={categories} selectedTag={selectedTag} onTagToggle={handleTagToggle} isAdmin={isAdmin} onManageTags={() => setIsTagsModalOpen(true)} />

                                                <div className="hidden justify-center mt-4 mb-2">
                                                    <select
                                                        className="w-[90%] md:w-48 p-2 border border-red-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === 'all') {
                                                                setPriceMin(''); setPriceMax(''); setSortOrder('');
                                                            } else if (val === 'under-50') {
                                                                setPriceMin(''); setPriceMax(50000); setSortOrder('');
                                                            } else if (val === '50-100') {
                                                                setPriceMin(50000); setPriceMax(100000); setSortOrder('');
                                                            } else if (val === 'over-100') {
                                                                setPriceMin(100000); setPriceMax(''); setSortOrder('');
                                                            } else if (val === 'asc') {
                                                                setPriceMin(''); setPriceMax(''); setSortOrder('asc');
                                                            } else if (val === 'desc') {
                                                                setPriceMin(''); setPriceMax(''); setSortOrder('desc');
                                                            }
                                                        }}
                                                    >
                                                        <option value="all">Lọc theo giá (Tất cả)</option>
                                                        <option value="under-50">Dưới 50.000đ</option>
                                                        <option value="50-100">50.000đ - 150.000đ</option>
                                                        <option value="over-100">Trên 100.000 �</option>
                                                        <option value="asc">Giá: Thấp �ến Cao</option>
                                                        <option value="desc">Giá: Cao �ến Thấp</option>
                                                    </select>
                                                </div>

                                                {loading ? (
                                                    <div className="flex justify-center py-32">
                                                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                                                    </div>
                                                ) : filteredProducts.length === 0 ? (
                                                    <div className="text-center py-32 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                                                        <i className="fa-solid fa-box-open text-6xl text-gray-200 mb-4"></i>
                                                        <p className="text-lg">Không tìm thấy sản phẩm nào phù hợp.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full justify-center">
                                                            {currentProducts.map(product => {
                                                                const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                                                                const CardLink = isAdmin ? 'div' : Link;
                                                                const cardLinkProps = isAdmin ? {} : { to: `/san-pham/${product.id}` };
                                                                return (
                                                                    <div
                                                                        key={product.id}
                                                                        className={`group bg-white rounded-2xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 border border-gray-100 hover:-translate-y-1 overflow-hidden flex flex-col ${product.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}
                                                                    >
                                                                        <CardLink {...cardLinkProps} className="relative aspect-square overflow-hidden bg-white p-4 flex items-center justify-center border-b border-gray-50 block cursor-pointer">
                                                                            <img
                                                                                src={product.image_url || FallbackImage}
                                                                                onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                                                                alt={product.name}
                                                                                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                                                            />
                                                                            {isAdmin && (
                                                                                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                                                                                    <button onClick={(e) => handleEditClick(e, product)} className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-primary hover:text-white text-gray-700 transition-colors" title="Ch�0nh sửa">
                                                                                        <i className="fa-solid fa-pen text-sm"></i>
                                                                                    </button>
                                                                                    <button onClick={(e) => handleToggleVisibility(e, product)} className={`w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md transition-colors ${product.is_hidden ? 'hover:bg-green-500 hover:text-white text-green-600' : 'hover:bg-gray-800 hover:text-white text-gray-600'}`} title={product.is_hidden ? 'Hi�!n sản phẩm' : 'Ẩn sản phẩm'}>
                                                                                        <i className={`fa-solid ${product.is_hidden ? 'fa-eye' : 'fa-eye-slash'} text-sm`}></i>
                                                                                    </button>
                                                                                    <button onClick={(e) => handleDeleteProduct(e, product)} className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-red-600 hover:text-white text-red-500 transition-colors" title="Xóa sản phẩm">
                                                                                        <i className="fa-solid fa-trash-can text-sm"></i>
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {product.is_hidden && <div className="absolute top-3 left-3 bg-gray-800 text-white text-xs font-bold px-2.5 py-1 rounded shadow-md z-10">Đang ẩn</div>}
                                                                        </CardLink>

                                                                        <div className="p-5 flex flex-col flex-1 bg-white">
                                                                            <CardLink {...cardLinkProps}>
                                                                                <h3 className="text-[15px] font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors" title={product.name}>{product.name}</h3>
                                                                            </CardLink>
                                                                            <div className="mb-2">
                                                                                <span className={`px-2 py-1 rounded-md text-sm font-medium ${colorClass}`}>
                                                                                    {product.stock_status || 'Hàng sẵn tại kho'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-auto pt-3">
                                                        <p className="whitespace-nowrap overflow-hidden text-ellipsis w-full text-[11px] sm:text-xs md:text-sm text-blue-600 mb-1">Giá sỉ/thùng: <span className="font-bold cursor-pointer no-underline text-blue-600">liên hệ Zalo</span></p>
                                                                                <p className="mb-3 tracking-tight w-full flex items-center flex-wrap md:flex-nowrap whitespace-nowrap overflow-hidden text-ellipsis"><span className="text-gray-500 text-xs md:text-sm font-medium mr-1">Giá bán lẻ: </span><span className="text-sm md:text-base font-bold text-red-600">{formatVND(product.price)}</span></p>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                                                                                    disabled={product.stock_status && product.stock_status.toLowerCase() === 'hết hàng'}
                                                                                    className="w-full bg-primary hover:bg-primaryDark text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 flex justify-center items-center gap-2"
                                                                                >
                                                                                    {!(product.stock_status && product.stock_status.toLowerCase() === 'hết hàng') ? (
                                                                                        <>Thêm vào giỏ hàng</>
                                                                                    ) : (
                                                                                        <>Hết hàng</>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </main>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="w-full bg-white border-t border-gray-200 py-4 flex justify-center items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Trang trước
                                            </button>

                                            <div className="flex gap-1 hidden sm:flex">
                                                {Array.from({ length: totalPages }).map((_, idx) => {
                                                    const page = idx + 1;
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-colors shadow-sm ${currentPage === page ? 'bg-primary text-white border border-primary' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="sm:hidden text-sm font-semibold text-gray-600 px-4">
                                                {currentPage} / {totalPages}
                                            </div>

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Trang sau
                                            </button>
                                        </div>
                                    )}
                                </>
                            } />
                            <Route path="/san-pham/:id" element={<ProductDetail onAddToCart={handleAddToCart} />} />
                        </Routes>
                    </div>

                    <footer className="w-full bg-white border-t border-gray-200 py-10 mt-auto">
                        <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex flex-col space-y-2">
                                <h4 className="text-base font-bold text-gray-800">CÔNG TY TNHH HÙNG THUẬN TOKCAY KOREA FOODS</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>MST: 1801801902</p>
                                    <p>Địa chỉ: 92B5, KDC Hưng Phú 1, KV9, Phường Hưng Phú, Thành phố Cần Thơ</p>
                                    <p>Điện thoại: 0902 631 632</p>
                                    <p>Email: hungthuanfood@gmail.com</p>
                                </div>
                                <div className="text-gray-500 text-sm font-medium pt-4">
                                    &copy; 2026 Hùng Thuận Tokcay. All rights reserved.
                                </div>
                            </div>
                            <div className="flex flex-col md:items-end gap-4 text-sm">
                                <div className="flex flex-wrap gap-6">
                                    <a href="#" className="text-gray-500 hover:text-primary transition-colors font-medium">Chính sách bảo mật</a>
                                    <a href="#" className="text-gray-500 hover:text-primary transition-colors font-medium">Điều khoản dịch vụ</a>
                                </div>
                                <button onClick={handleAdminLogin} className="text-gray-400 hover:text-primary transition-colors cursor-pointer font-medium outline-none text-left md:text-right w-max">
                                        {isAdmin ? 'Đăng xuất admin' : 'Admin'}
                                </button>
                            </div>
                        </div>
                    </footer>

                    <CartSlideOver isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} setCart={setCart} />
                    <ZaloWidget zaloNumber={settings?.link_zalo || settings?.zalo_number} />
                    <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} settings={settings} />

                    <ProductDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => setIsDetailsModalOpen(false)}
                        product={selectedProduct}
                        onAddToCart={handleAddToCart}
                    />

                    {isAdmin && (
                        <>
                            <AdminProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={editingProduct} onSave={handleSaveProduct} uniqueTags={categories} />
                            <AdminSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSave={handleSaveSettings} />
                            <AdminTagsModal isOpen={isTagsModalOpen} onClose={() => setIsTagsModalOpen(false)} categories={categories} fetchData={fetchData} />
                        </>
                    )}
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
