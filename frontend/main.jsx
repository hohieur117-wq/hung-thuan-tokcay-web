import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import FloatingDecor from './components/FloatingDecor.jsx';


        // Tích hợp Supabase
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { experimental: { passkey: true } } });

        const isWebAuthnSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;

        const formatVND = (price) => {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price).replace(' ', ' ');
        };

        const generateSlug = (text) => {
            if (!text) return '';
            return text.toString().toLowerCase()
                .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
                .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
                .replace(/ì|í|ị|ỉ|ĩ/g, "i")
                .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
                .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
                .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
                .replace(/đ/g, "d")
                .replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "")
                .replace(/\u02C6|\u0306|\u031B/g, "")
                .replace(/[^a-z0-9 -]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-+/, "")
                .replace(/-+$/, "");
        };

        const FallbackImage = "/media__1783016111445.png";
        const LogoImage = "./logo.png";

        // --- SWR Cache Helpers (localStorage + sessionStorage) ---
        const CACHE_KEY = 'tokcay_products_cache';
        const CACHE_FRESH_TTL = 600000;  // 10 phút: hoàn toàn tươi mới (0 gọi API kể cả mở tab mới)
        const CACHE_STALE_TTL = 86400000; // 24 giờ: hiển thị tức thì từ cache, đồng thời làm mới ngầm dưới nền

        const readProductsCache = () => {
            try {
                const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || !Array.isArray(parsed.data) || !parsed.timestamp) return null;
                const age = Date.now() - parsed.timestamp;
                if (age > CACHE_STALE_TTL) return null;
                return {
                    cached: parsed,
                    isFresh: age < CACHE_FRESH_TTL,
                };
            } catch (_) {
                return null;
            }
        };

        const writeProductsCache = (payload) => {
            const serialized = JSON.stringify({
                ...payload,
                timestamp: Date.now(),
            });
            try { sessionStorage.setItem(CACHE_KEY, serialized); } catch (_) {}
            try { localStorage.setItem(CACHE_KEY, serialized); } catch (_) {}
        };

        const clearProductsCache = () => {
            try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
            try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
        };

        // --- Helper: Dọn file ảnh cũ trên Supabase Storage khi thay ảnh mới ---
        const removeOldSupabaseImage = async (oldUrl, newUrl = '') => {
            try {
                if (!oldUrl || oldUrl === newUrl || !oldUrl.includes('supabase.co')) return;
                const parts = oldUrl.split('/public/images/');
                if (parts.length === 2 && parts[1]) {
                    const cleanPath = decodeURIComponent(parts[1].split('?')[0]);
                    await supabase.storage.from('images').remove([cleanPath]);
                }
            } catch (e) {
                console.warn('Không thể xóa ảnh cũ:', e);
            }
        };

        const useDebounce = (value, delay) => {
            const [debouncedValue, setDebouncedValue] = useState(value);
            useEffect(() => {
                const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
                return () => clearTimeout(handler);
            }, [value, delay]);
            return debouncedValue;
        };

        const removeAccents = (str) => {
            return str.normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                      .toLowerCase();
        };

        const LiveSearchBar = ({ resetKey }) => {
            const [searchTerm, setSearchTerm] = useState('');
            const debouncedTerm = useDebounce(searchTerm, 350);
            const [results, setResults] = useState([]);
            const [isDropdownOpen, setIsDropdownOpen] = useState(false);
            const searchCache = useRef({});
            const wrapperRef = useRef(null);
            const navigate = useNavigate();

            useEffect(() => {
                if (resetKey) {
                    setSearchTerm('');
                    setResults([]);
                    setIsDropdownOpen(false);
                }
            }, [resetKey]);

            useEffect(() => {
                const handleClickOutside = (event) => {
                    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                        setIsDropdownOpen(false);
                    }
                };
                document.addEventListener("mousedown", handleClickOutside);
                return () => document.removeEventListener("mousedown", handleClickOutside);
            }, []);

            useEffect(() => {
                const fetchResults = async () => {
                    if (!debouncedTerm.trim()) {
                        setResults([]);
                        setIsDropdownOpen(false);
                        return;
                    }
                    if (searchCache.current[debouncedTerm]) {
                        setResults(searchCache.current[debouncedTerm]);
                        setIsDropdownOpen(true);
                        return;
                    }
                    try {
                        const trimmedTerm = debouncedTerm.trim();
                        const slugTerm = generateSlug(trimmedTerm);
                        const normalizedTerm = removeAccents(trimmedTerm);
                        let rawData = null;

                        const cacheEntry = readProductsCache();
                        if (cacheEntry && cacheEntry.cached) {
                            rawData = cacheEntry.cached.data.filter(p => {
                                if (p.is_hidden) return false;
                                const pName = removeAccents(p.name || '');
                                const pSlug = String(p.slug || '').toLowerCase();
                                return pName.includes(normalizedTerm) || (slugTerm && pSlug.includes(slugTerm));
                            });
                        }

                        if (!rawData) {
                            const searchFilter = slugTerm
                                ? `name.ilike.%${trimmedTerm}%,slug.ilike.%${slugTerm}%`
                                : `name.ilike.%${trimmedTerm}%`;
                            const { data, error } = await supabase
                                .from('products')
                                .select('name, slug, image_url, price')
                                .eq('is_hidden', false)
                                .or(searchFilter)
                                .limit(20);
                            if (error) throw error;
                            rawData = data || [];
                        }

                        rawData.sort((a, b) => {
                            const nameA = removeAccents(a.name);
                            const nameB = removeAccents(b.name);
                            
                            const getScore = (name) => {
                                if (name.startsWith(normalizedTerm)) return 3;
                                if (name.includes(' ' + normalizedTerm)) return 2;
                                if (name.includes(normalizedTerm)) return 1;
                                return 0;
                            };

                            return getScore(nameB) - getScore(nameA);
                        });

                        const finalData = rawData.slice(0, 4);
                        searchCache.current[debouncedTerm] = finalData;
                        setResults(finalData);
                        setIsDropdownOpen(true);
                    } catch (err) {
                        console.error('Lỗi tìm kiếm:', err);
                    }
                };
                fetchResults();
            }, [debouncedTerm]);

            return (
                <div ref={wrapperRef} className="relative w-full max-w-md">
                    <div className="flex items-center w-full rounded-full bg-white/95 focus-within:bg-white focus-within:ring-2 focus-within:ring-yellow-300 shadow-inner overflow-hidden p-1 transition-all">
                        <input
                            type="search"
                            name="tokcay_search_query"
                            className="block w-full pl-4 pr-3 py-2 rounded-l-full border-none leading-5 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none sm:text-sm"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => { if (searchTerm.trim()) setIsDropdownOpen(true); }}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck="false"
                            inputMode="search"
                        />
                        <button className="bg-red-50 hover:bg-primary text-primary hover:text-white w-9 h-9 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-magnifying-glass text-sm"></i>
                        </button>
                    </div>
                    
                    {isDropdownOpen && results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/[0.97] backdrop-blur-2xl border border-red-100 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.22)] overflow-hidden z-[100]">
                            {results.map(product => (
                                <div 
                                    key={product.slug || product.name} 
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setSearchTerm('');
                                        navigate(`/san-pham/${product.slug}`);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-red-50/80 cursor-pointer border-b border-stone-100/80 last:border-0 transition-colors"
                                >
                                    <img src={product.image_url || FallbackImage} alt={product.name} className="w-[50px] h-[50px] object-cover rounded-lg flex-shrink-0 border border-stone-200/70 shadow-sm" loading="lazy" decoding="async" onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }} />
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</span>
                                        {product.price !== undefined && product.price !== null && (
                                            <span className="block text-xs font-bold text-red-700 mt-0.5">{formatVND(product.price)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {isDropdownOpen && debouncedTerm.trim() && results.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/[0.97] backdrop-blur-2xl border border-red-100 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.22)] p-4 text-center text-sm text-gray-600 z-[100]">
                            Không tìm thấy sản phẩm nào.
                        </div>
                    )}
                </div>
            );
        };

        // --- Helper: Crop + Resize + WebP Compression using Canvas ---
        const cropImage = (file, targetRatio, maxDimension = 800) => {
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
                            cropWidth = srcHeight * targetRatio;
                        } else {
                            cropHeight = srcWidth / targetRatio;
                        }

                        const startX = (srcWidth - cropWidth) / 2;
                        const startY = (srcHeight - cropHeight) / 2;

                        // Thu nhỏ về tối đa maxDimension (800x800px) để giảm 85% dung lượng Egress
                        let outWidth = cropWidth;
                        let outHeight = cropHeight;
                        if (outWidth > maxDimension || outHeight > maxDimension) {
                            const scale = Math.min(maxDimension / outWidth, maxDimension / outHeight);
                            outWidth = Math.round(outWidth * scale);
                            outHeight = Math.round(outHeight * scale);
                        }

                        canvas.width = outWidth;
                        canvas.height = outHeight;

                        ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, outWidth, outHeight);

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Canvas is empty'));
                                return;
                            }
                            resolve(blob);
                        }, 'image/webp', 0.85);
                    };
                    img.onerror = (error) => reject(error);
                };
                reader.onerror = (error) => reject(error);
            });
        };

        const compressBannerImage = (file, maxWidth = 1920) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        let outWidth = img.width;
                        let outHeight = img.height;
                        if (outWidth > maxWidth) {
                            const scale = maxWidth / outWidth;
                            outWidth = Math.round(outWidth * scale);
                            outHeight = Math.round(outHeight * scale);
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = outWidth;
                        canvas.height = outHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, outWidth, outHeight);
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                resolve(file);
                                return;
                            }
                            resolve(blob);
                        }, 'image/webp', 0.88);
                    };
                    img.onerror = () => resolve(file);
                };
                reader.onerror = () => resolve(file);
            });
        };

        // --- Components ---
        const Header = ({ cartCount, onOpenCart, onContactClick, onProductsClick, onLogoClick, searchResetKey }) => {
            return (
                <header
                    className="sticky top-0 z-50 bg-red-800 text-white backdrop-blur-xl border-b border-white/25 shadow-[0_8px_25px_rgba(153,27,27,0.35)] transition-all"
                    style={{ background: 'linear-gradient(90deg, rgba(153, 27, 27, 0.96) 0%, rgba(185, 28, 28, 0.94) 50%, rgba(153, 27, 27, 0.96) 100%)' }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-20">
                            {/* Logo */}
                            <div className="flex-1 flex justify-start items-center">
                                <a
                                    href="/"
                                    className="flex items-center cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onLogoClick) onLogoClick(e);
                                    }}
                                >
                                    <img src="/logo_new.png" alt="Logo Hùng Thuận Tokcay" className="h-10 md:h-12 lg:h-14 w-auto object-contain cursor-pointer drop-shadow-md" />
                                </a>
                            </div>

                            {/* Search */}
                            <div className="flex-1 hidden md:flex justify-center items-center relative z-50">
                                <LiveSearchBar resetKey={searchResetKey} />
                            </div>

                            {/* Navigation & Cart */}
                            <div className="flex-1 flex justify-end items-center gap-3 lg:gap-6">
                                <nav className="hidden md:flex justify-between items-center gap-2 lg:gap-3 text-white font-semibold text-sm">
                                    <button onClick={onProductsClick} className="px-3.5 py-1.5 rounded-full hover:bg-white/15 hover:text-yellow-300 active:scale-95 transition-all duration-200 uppercase tracking-wide outline-none flex items-center justify-center whitespace-nowrap drop-shadow-sm cursor-pointer">Sản phẩm</button>
                                    <button onClick={() => alert('Hiện tại chưa có chương trình khuyến mãi nào. Bạn vui lòng quay lại sau nhé!')} className="px-3.5 py-1.5 rounded-full hover:bg-white/15 hover:text-yellow-300 active:scale-95 transition-all duration-200 uppercase tracking-wide outline-none flex items-center justify-center whitespace-nowrap drop-shadow-sm cursor-pointer">Khuyến mãi</button>
                                    <button onClick={onContactClick} className="px-3.5 py-1.5 rounded-full hover:bg-white/15 hover:text-yellow-300 active:scale-95 transition-all duration-200 uppercase tracking-wide outline-none flex items-center justify-center whitespace-nowrap drop-shadow-sm cursor-pointer">Liên hệ</button>
                                </nav>

                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button onClick={onProductsClick} className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md transition-all text-white hover:text-yellow-300 outline-none flex items-center justify-center md:hidden cursor-pointer" aria-label="Sản phẩm">
                                        <i className="fa-solid fa-box-open text-lg"></i>
                                    </button>

                                    <button onClick={onContactClick} className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md transition-all text-white hover:text-yellow-300 outline-none flex items-center justify-center md:hidden cursor-pointer" aria-label="Liên hệ">
                                        <i className="fa-solid fa-headset text-lg"></i>
                                    </button>

                                    <button onClick={onOpenCart} className="relative p-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md transition-all text-white hover:text-yellow-300 flex items-center justify-center cursor-pointer">
                                        <i className="fa-solid fa-cart-shopping text-xl"></i>
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-red-950 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full shadow-md border border-white">
                                                {cartCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Search */}
                        <div className="md:hidden pb-4 relative z-50">
                            <LiveSearchBar resetKey={searchResetKey} />
                        </div>
                    </div>
                </header>
            );
        };

        const HeroBanner = ({ bannerMobileUrl, bannerDesktopUrl, isAdmin, onBannerMobileUpload, onBannerDesktopUpload }) => {
            const finalMobileBanner = bannerMobileUrl || "/media__1783108509497.png";
            const finalDesktopBanner = bannerDesktopUrl || "/media__1783108509497.png";

            return (
                <div className="relative w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mb-4 group">
                    {/* Thẻ chứa ảnh bo góc và tỏa sáng */}
                    <div className="relative w-full h-auto rounded-[2rem] shadow-[0_0_80px_-15px_rgba(220,38,38,0.4)] border border-red-200 overflow-hidden bg-white">
                        <img
                            src={finalMobileBanner}
                            className="w-full h-auto object-contain block md:hidden"
                            alt="Banner Mobile"
                            decoding="async"
                        />
                        <img
                            src={finalDesktopBanner}
                            className="w-full h-auto object-contain hidden md:block"
                            alt="Banner PC"
                            decoding="async"
                        />

                        {/* 1 Lớp Glass duy nhất */}
                        <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(185,28,28,0.1)] bg-gradient-to-tr from-white/10 via-transparent to-white/15" />

                        {/* Lớp Button Quản trị đè lên trên */}
                        <div className="absolute inset-0 z-20 w-full h-full p-4 pointer-events-none">
                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
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
                    </div>
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
                    className="fixed bottom-6 right-6 w-14 h-14 bg-[#0068FF] rounded-full ring-4 ring-white/60 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 group border border-white/80"
                >
                    <span className="text-white font-bold text-lg drop-shadow-sm">Zalo</span>
                </a>
            );
        };

        const ContactModal = ({ isOpen, onClose, settings }) => {
            if (!isOpen) return null;

            // Các link mặc định theo yêu cầu
            const defaultFb = "https://www.facebook.com/share/18g7FWfpAP/";
            const defaultMaps = "https://maps.app.goo.gl/7XXZpNfJ3nQ6UUia6";
            const defaultZalo = "0902631632";

            const fbLink = settings?.facebook_url || defaultFb;
            const mapsLink = settings?.maps_url || defaultMaps;
            const zaloLink = `https://zalo.me/${settings?.link_zalo || settings?.zalo_number || defaultZalo}`;

            return (
                <div className="fixed inset-0 z-[80] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white/85 backdrop-blur-xl border border-white/80 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in relative p-6 sm:p-7">
                        <div className="flex items-center justify-between gap-4 pr-12 border-b border-stone-200/70 pb-4 mb-5">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 uppercase tracking-wide leading-snug">LIÊN HỆ VỚI CHÚNG TÔI</h3>
                            <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-600 transition-colors w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-stone-200/70 shadow-sm flex-shrink-0"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div className="mb-5 p-3.5 rounded-xl bg-white/75 border border-white/80 space-y-2.5 text-xs sm:text-sm text-stone-700">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 shadow-sm"><i className="fa-solid fa-phone text-xs"></i></span>
                                <span className="font-semibold">0902 631 632</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 shadow-sm"><i className="fa-solid fa-location-dot text-xs"></i></span>
                                <span className="line-clamp-2">92B5, KDC Hưng Phú 1, KV9, P. Hưng Phú, TP. Cần Thơ</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 shadow-sm"><i className="fa-solid fa-envelope text-xs"></i></span>
                                <span>hungthuanfood@gmail.com</span>
                            </div>
                        </div>
                        <div className="space-y-3.5">
                            <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-bold text-lg bg-[#0068FF] hover:bg-blue-700 transition-transform hover:scale-[1.02] shadow-md">
                                <i className="fa-solid fa-comment-dots text-2xl"></i> Chat Zalo
                            </a>
                            <a href={fbLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-white font-bold text-lg bg-[#1877F2] hover:bg-[#166FE5] transition-transform hover:scale-[1.02] shadow-md">
                                <i className="fa-brands fa-facebook text-2xl"></i> Trang Facebook
                            </a>
                            <a href={mapsLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl text-gray-700 font-bold text-lg bg-white/85 backdrop-blur-sm border border-white/80 hover:bg-white transition-transform hover:scale-[1.02] shadow-md">
                                <i className="fa-solid fa-map-location-dot text-green-600 text-2xl"></i> Bản đồ Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            );
        };

        const CartSlideOver = ({ isOpen, onClose, cart, setCart, zaloNumber }) => {
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
                let message = "Xin chào shop, tôi muốn đặt hàng:\n";
                cart.forEach((item, index) => {
                    message += `${index + 1}. ${item.name} - Số lượng: ${item.qty}\n`;
                });
                message += `Tổng tạm tính: ${formatVND(total)}`;

                const encodedMessage = encodeURIComponent(message);
                const cleanZalo = String(zaloNumber || '0902631632').replace(/^https?:\/\/(www\.)?zalo\.me\//i, '').trim() || '0902631632';
                window.open(`https://zalo.me/${cleanZalo}?text=${encodedMessage}`, '_blank');
            };

            return (
                <div className={`fixed inset-0 z-[60] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" onClick={onClose}></div>
                    <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-white/85 backdrop-blur-2xl border-l border-white/80 shadow-2xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div className="flex items-center justify-between gap-4 pr-12 p-5 border-b border-white/60 bg-red-50/70 backdrop-blur-md relative">
                            <h2 className="text-xl font-bold text-primaryDark">Giỏ hàng ({cart.reduce((a, c) => a + c.qty, 0)})</h2>
                            <button onClick={onClose} className="absolute top-4 right-4 p-2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-600 rounded-full bg-white/80 border border-white/60 shadow-sm transition-colors">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
                                    <i className="fa-solid fa-basket-shopping text-6xl text-gray-300 mb-4"></i>
                                    <p>Giỏ hàng của bạn đang trống</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex gap-4 bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-stone-200/60 shadow-sm relative pr-10">
                                        <img src={item.image_url || FallbackImage} onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }} alt={item.name} loading="lazy" decoding="async" className="w-20 h-20 object-cover rounded-lg border border-white/80 shadow-sm" />
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug" title={item.name}>{item.name}</h4>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-red-700 font-bold">{formatVND(item.price)}</p>
                                                <div className="flex items-center border border-stone-200/80 rounded-lg overflow-hidden bg-white/80">
                                                    <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="px-2.5 py-1 text-gray-600 hover:bg-red-50 transition-colors"><i className="fa-solid fa-minus text-xs"></i></button>
                                                    <span className="px-3 py-1 text-sm font-medium bg-white/90 border-x border-stone-200/80">{item.qty}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-2.5 py-1 text-gray-600 hover:bg-red-50 transition-colors"><i className="fa-solid fa-plus text-xs"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => updateQuantity(item.id, 0)} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-2 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="border-t border-white/80 p-5 bg-white/75 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                            <div className="flex justify-between text-lg font-bold text-gray-900 mb-5">
                                <p>Tổng tiền:</p>
                                <p className="text-red-700 text-xl">{formatVND(total)}</p>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-700/25 active:scale-[0.99]"
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
                            <img src={product.image_url || FallbackImage} onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }} alt={product.name} loading="lazy" decoding="async" className="w-full max-h-[40vh] sm:max-h-full object-cover drop-shadow-md" />
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

        const ImageUploaderWithAI = ({ imageUrl, onImageChange, onFileChange, uploading, isProcessing, setIsProcessing, cancelRef }) => {
            const [rawImage, setRawImage] = useState(null);
            const [processedImage, setProcessedImage] = useState(null);
            const [previewUrl, setPreviewUrl] = useState('');

            useEffect(() => {
                let url = '';
                if (processedImage) {
                    url = URL.createObjectURL(processedImage);
                    setPreviewUrl(url);
                } else if (rawImage) {
                    url = URL.createObjectURL(rawImage);
                    setPreviewUrl(url);
                } else {
                    setPreviewUrl(imageUrl);
                }
                return () => {
                    if (url && (processedImage || rawImage)) URL.revokeObjectURL(url);
                };
            }, [processedImage, rawImage, imageUrl]);

            useEffect(() => {
                return () => {
                    if (cancelRef) cancelRef.current = true;
                };
            }, [cancelRef]);

            const handleFileSelect = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setRawImage(file);
                setProcessedImage(null);
                onFileChange(file); // Pass raw file up
            };

            const getProductBottomY = (ctx, width, height) => {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                for (let y = height - 1; y >= 0; y--) {
                    for (let x = 0; x < width; x++) {
                        const index = (y * width + x) * 4;
                        if (data[index + 3] > 15) {
                            return y;
                        }
                    }
                }
                return height;
            };

            const compressImageBeforeAI = (file, maxWidth = 1000, maxHeight = 1000) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (event) => {
                        const img = new Image();
                        img.src = event.target.result;
                        img.onload = () => {
                            let width = img.width;
                            let height = img.height;
                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width *= ratio;
                                height *= ratio;
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            canvas.toBlob((blob) => {
                                resolve(blob);
                            }, file.type || 'image/jpeg', 0.9);
                        };
                        img.onerror = reject;
                    };
                    reader.onerror = reject;
                });
            };

            const handleProcessImage = async () => {
                if (!rawImage) return;
                if (cancelRef) cancelRef.current = false;
                setIsProcessing(true);
                try {
                    const compressedBlob = await compressImageBeforeAI(rawImage);
                    if (cancelRef && cancelRef.current) return;
                    
                    const { removeBackground } = await import('@imgly/background-removal');
                    if (cancelRef && cancelRef.current) return;

                    const bgRemovedBlob = await removeBackground(compressedBlob, { model: 'isnet' });
                    if (cancelRef && cancelRef.current) return;
                    
                    const img = new Image();
                    img.src = URL.createObjectURL(bgRemovedBlob);
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    if (cancelRef && cancelRef.current) return;

                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    const productBottomY = getProductBottomY(ctx, canvas.width, canvas.height);
                    
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.globalCompositeOperation = 'source-over';
                    
                    const fontSize = canvas.width * 0.055;
                    ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    const text = 'www.tokcayfood.com';
                    const x = canvas.width / 2;
                    const marginInside = canvas.height * 0.03;
                    const watermarkY = productBottomY - marginInside;
                    
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = fontSize * 0.2;
                    ctx.strokeText(text, x, watermarkY);
                    
                    ctx.fillStyle = '#E3000F';
                    ctx.fillText(text, x, watermarkY);
                    
                    canvas.toBlob((blob) => {
                        if (cancelRef && cancelRef.current) return;
                        setProcessedImage(blob);
                        onFileChange(blob); // Pass processed blob up
                        setIsProcessing(false);
                    }, 'image/webp', 0.8);
                    
                    URL.revokeObjectURL(img.src);
                } catch (error) {
                    if (cancelRef && cancelRef.current) return;
                    console.error('Processing error:', error);
                    alert('Lỗi xử lý ảnh: ' + error.message);
                    setIsProcessing(false);
                }
            };

            return (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hình ảnh (Sẽ tự động cắt Vuông 1:1)</label>
                    <div className="flex gap-2">
                        <input type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none transition-all" value={imageUrl} onChange={e => onImageChange(e.target.value)} placeholder="https://..." />
                        <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 cursor-pointer px-4 py-2.5 rounded-lg font-semibold text-gray-700 whitespace-nowrap transition-colors flex items-center justify-center min-w-[140px]">
                            {uploading ? <span className="text-blue-600"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang lưu...</span> : 'Chọn ảnh'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                        </label>
                    </div>
                    
                    {previewUrl && (
                        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <img src={previewUrl} alt="Preview" className="h-32 w-32 object-cover rounded-lg border border-gray-200 shadow-sm" />
                            <div className="flex flex-col gap-2">
                                <button 
                                    type="button" 
                                    onClick={handleProcessImage} 
                                    disabled={!rawImage || isProcessing}
                                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
                                >
                                    {isProcessing ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang xử lý...</> : <>✨ Xử lý tự động</>}
                                </button>
                                {isProcessing && <p className="text-xs text-gray-500 animate-pulse">Đang tách nền & đóng mộc tinh tế...</p>}
                            </div>
                        </div>
                    )}
                </div>
            );
        };


        const AdminProductModal = ({ isOpen, onClose, product, onSave, uniqueTags }) => {
            const [formData, setFormData] = useState({
                name: '', slug: '', price: '', stock_status: 'Hàng sẵn kho', statusColor: 'green', image_url: '', description: '', tags: []
            });
            const [tagsInput, setTagsInput] = useState('');
            const [uploading, setUploading] = useState(false);
            const [isGenerating, setIsGenerating] = useState(false);
            const [selectedFile, setSelectedFile] = useState(null);

            const [isProcessing, setIsProcessing] = useState(false);
            const cancelRef = useRef(false);

            const handleClose = () => {
                cancelRef.current = true;
                setIsProcessing(false);
                onClose();
            };

            useEffect(() => {
                if (product) {
                    let oldStatus = product.stock_status || 'Hàng sẵn kho';
                    if (oldStatus === 'Hàng sẵn' || oldStatus === 'Hàng sẵn tại kho' || oldStatus === 'Còn hàng') {
                        oldStatus = 'Hàng sẵn kho';
                    }
                    setFormData({
                        name: product.name || '',
                        slug: product.slug || '',
                        price: product.price ?? '',
                        stock_status: oldStatus,
                        statusColor: product.statusColor || 'green',
                        image_url: product.image_url || '',
                        description: product.description || '',
                        tags: product.tags || []
                    });
                    setTagsInput((product.tags || []).join(', '));
                } else {
                    setFormData({ name: '', slug: '', price: '', stock_status: 'Hàng sẵn kho', statusColor: 'green', image_url: '', description: '', tags: [] });
                    setTagsInput('');
                }
                setSelectedFile(null);
            }, [product, isOpen]);

            if (!isOpen) return null;

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

            const handleSubmit = async (e) => {
                e.preventDefault();
                setUploading(true);
                let finalImageUrl = formData.image_url;
                const previousImageUrl = product?.image_url;
                try {
                    let fileToUpload = selectedFile;
                    if (fileToUpload) {
                        const croppedBlob = await cropImage(fileToUpload, 1);
                        const ext = croppedBlob.type === 'image/webp' ? 'webp' : 'jpg';
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                        const filePath = `products/${fileName}`;

                        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, croppedBlob, {
                            contentType: croppedBlob.type || 'image/webp',
                            cacheControl: '31536000'
                        });

                        if (uploadError) throw uploadError;
                        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                        finalImageUrl = data.publicUrl;
                    }

                    const processedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t !== '');
                    await onSave({ ...(product || {}), ...formData, image_url: finalImageUrl, price: formData.price === '' ? 0 : Number(formData.price), tags: processedTags });

                    if (previousImageUrl && previousImageUrl !== finalImageUrl) {
                        await removeOldSupabaseImage(previousImageUrl, finalImageUrl);
                    }
                } catch (err) {
                    alert('Lỗi khi lưu sản phẩm: ' + err.message);
                } finally {
                    setUploading(false);
                }
            };

            return (
                <div className="fixed inset-0 z-[70] flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                            <button type="button" onClick={handleClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto hide-scroll flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên sản phẩm *</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={formData.name} onChange={e => {
                                    const newName = e.target.value;
                                    setFormData(prev => {
                                        if (!product || prev.slug === '') {
                                            return { ...prev, name: newName, slug: generateSlug(newName) };
                                        }
                                        return { ...prev, name: newName };
                                    });
                                }} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Slug (URL) *</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
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
                            <ImageUploaderWithAI 
                                imageUrl={formData.image_url}
                                onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                                onFileChange={(file) => setSelectedFile(file)}
                                uploading={uploading}
                                isProcessing={isProcessing}
                                setIsProcessing={setIsProcessing}
                                cancelRef={cancelRef}
                            />
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
                            <button type="button" onClick={handleClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors">Hủy</button>
                            <button type="submit" onClick={handleSubmit} disabled={uploading || isProcessing} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primaryDark shadow-md transition-colors disabled:opacity-50">
                                {uploading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang lưu...</> : 'Lưu sản phẩm'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const AdminSettingsModal = ({ isOpen, onClose, settings, onSave, session }) => {
            const [formData, setFormData] = useState({});
            const [uploading, setUploading] = useState(false);
            const [loginData, setLoginData] = useState({ email: '', password: '' });

            useEffect(() => {
                if (settings) setFormData(settings);
            }, [settings, isOpen]);

            if (!isOpen) return null;

            const handleBannerUpload = async (e, type) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);

                try {
                    const compressedBlob = await compressBannerImage(file, type === 'mobile' ? 1080 : 1920);
                    const ext = compressedBlob.type === 'image/webp' ? 'webp' : 'jpg';
                    const fileName = `${Date.now()}_banner_${type}.${ext}`;
                    const filePath = `banners/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, compressedBlob, {
                        contentType: compressedBlob.type || 'image/webp',
                        cacheControl: '31536000'
                    });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                    const oldUrl = type === 'mobile' ? formData.banner_mobile_url : formData.banner_desktop_url;
                    if (type === 'mobile') {
                        setFormData({ ...formData, banner_mobile_url: data.publicUrl });
                    } else {
                        setFormData({ ...formData, banner_desktop_url: data.publicUrl });
                    }
                    if (oldUrl && oldUrl !== data.publicUrl) {
                        await removeOldSupabaseImage(oldUrl, data.publicUrl);
                    }
                } catch (error) {
                    alert('Lỗi xử lý ảnh: ' + error.message);
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

                            {!session ? (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-3">Đăng nhập quản trị</h4>
                                    <input type="email" placeholder="Email" className="w-full border p-2 mb-2 rounded" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                                    <input type="password" placeholder="Mật khẩu" className="w-full border p-2 mb-2 rounded" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
                                    <button type="button" onClick={async () => {
                                        const { error } = await supabase.auth.signInWithPassword(loginData);
                                        if (error) alert(error.message); else window.location.reload();
                                    }} className="w-full bg-blue-600 text-white p-2 rounded">Đăng nhập</button>
                                </div>
                            ) : null}
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

            useEffect(() => {
                const el = sliderRef.current;
                if (!el) return;
                const handleNativeWheel = (e) => {
                    if (window.innerWidth >= 768 && e.deltaY !== 0) {
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                    }
                };
                el.addEventListener('wheel', handleNativeWheel, { passive: false });
                return () => el.removeEventListener('wheel', handleNativeWheel);
            }, []);

            const handleWheel = (e) => {
                if (window.innerWidth >= 768 && e.deltaY !== 0 && sliderRef.current && !e.defaultPrevented) {
                    sliderRef.current.scrollLeft += e.deltaY;
                }
            };

            return (
                <div className="w-full max-w-full">
                    <style>{`
                        .hide-scrollbar::-webkit-scrollbar,
                        .no-scrollbar::-webkit-scrollbar {
                            display: none !important;
                        }
                        .no-scrollbar {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `}</style>
                    <h3 className="text-xl md:text-2xl font-bold text-center text-primary mb-3 uppercase tracking-wide drop-shadow-sm">DANH MỤC SẢN PHẨM</h3>
                    <div className="rounded-2xl md:rounded-full p-2.5 md:p-1.5 bg-white/75 backdrop-blur-md border border-red-100/80 shadow-sm w-full max-w-full overflow-hidden flex items-center gap-2 box-border">
                        <button
                            type="button"
                            onClick={scrollLeft}
                            aria-label="Cuộn sang trái"
                            className="hidden md:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center bg-white/90 hover:bg-red-50 text-stone-600 hover:text-red-600 shadow-sm border border-stone-200/60 transition-all cursor-pointer z-10"
                        >
                            &lt;
                        </button>

                        <div
                            ref={sliderRef}
                            onWheel={handleWheel}
                            className="grid grid-cols-2 gap-2 w-full md:flex md:flex-1 md:min-w-0 md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto no-scrollbar scroll-smooth md:px-1"
                        >
                            {isAdmin && (
                                <button
                                    onClick={onManageTags}
                                    className="col-span-2 md:col-span-1 w-full md:w-auto md:flex-shrink-0 whitespace-nowrap flex items-center justify-center text-center font-semibold border rounded-xl md:rounded-full transition-all px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm bg-yellow-100/90 text-yellow-800 border-yellow-300 hover:bg-yellow-200 backdrop-blur-sm cursor-pointer"
                                >
                                    <i className="fa-solid fa-gear mr-1"></i> Quản lý
                                </button>
                            )}
                            <button
                                onClick={() => onTagToggle('')}
                                className={`w-full md:w-auto md:flex-shrink-0 whitespace-nowrap truncate flex items-center justify-center text-center px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl md:rounded-full font-semibold transition-all cursor-pointer ${selectedTag === '' ? 'text-white bg-red-600 shadow-md border border-red-400/40' : 'bg-white/85 hover:bg-red-50 text-stone-700 hover:text-red-600 border border-stone-200/80'}`}
                                style={selectedTag === '' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                            >
                                Tất cả sản phẩm
                            </button>
                            {uniqueTags.map(tag => {
                                const isActive = selectedTag === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => onTagToggle(tag)}
                                        className={`w-full md:w-auto md:flex-shrink-0 whitespace-nowrap truncate flex items-center justify-center text-center px-2.5 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl md:rounded-full font-semibold transition-all cursor-pointer ${isActive ? 'text-white bg-red-600 shadow-md border border-red-400/40' : 'bg-white/85 hover:bg-red-50 text-stone-700 hover:text-red-600 border border-stone-200/80'}`}
                                        style={isActive ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={scrollRight}
                            aria-label="Cuộn sang phải"
                            className="hidden md:flex flex-shrink-0 w-8 h-8 rounded-full items-center justify-center bg-white/90 hover:bg-red-50 text-stone-600 hover:text-red-600 shadow-sm border border-stone-200/60 transition-all cursor-pointer z-10"
                        >
                            &gt;
                        </button>
                    </div>
                </div>
            );
        };

        const AdminTagsModal = ({ isOpen, onClose, categories, products = [], fetchData }) => {
            const [newTag, setNewTag] = useState('');
            const [isLoading, setIsLoading] = useState(false);

            if (!isOpen) return null;

            const handleAdd = async () => {
                if (newTag.trim() && !categories.includes(newTag.trim())) {
                    setIsLoading(true);
                    await supabase.from('tags').insert([{ name: newTag.trim() }]);
                    setNewTag('');
                    clearProductsCache();
                    await fetchData(true);
                    setIsLoading(false);
                }
            };

            const handleEdit = async (index) => {
                const oldName = categories[index];
                const updated = prompt('Nhập tên danh mục mới:', oldName);
                const newName = updated ? updated.trim() : '';
                if (newName && newName !== oldName) {
                    setIsLoading(true);
                    await supabase.from('tags').update({ name: newName }).eq('name', oldName);
                    const affectedProducts = (products || []).filter(p => Array.isArray(p.tags) && p.tags.includes(oldName));
                    if (affectedProducts.length > 0) {
                        await Promise.all(affectedProducts.map(p => {
                            const updatedTags = Array.from(new Set(p.tags.map(t => t === oldName ? newName : t)));
                            return supabase.from('products').update({ tags: updatedTags }).eq('id', p.id);
                        }));
                    }
                    clearProductsCache();
                    await fetchData(true);
                    setIsLoading(false);
                }
            };

            const handleDelete = async (index) => {
                if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này không?')) {
                    setIsLoading(true);
                    const oldName = categories[index];
                    await supabase.from('tags').delete().eq('name', oldName);
                    const affectedProducts = (products || []).filter(p => Array.isArray(p.tags) && p.tags.includes(oldName));
                    if (affectedProducts.length > 0) {
                        await Promise.all(affectedProducts.map(p => {
                            const updatedTags = p.tags.filter(t => t !== oldName);
                            return supabase.from('products').update({ tags: updatedTags }).eq('id', p.id);
                        }));
                    }
                    clearProductsCache();
                    await fetchData(true);
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
                            <button onClick={handleAdd} disabled={isLoading} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primaryDark transition-colors disabled:opacity-50">Thêm</button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-3">
                            {categories.map((cat, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="font-semibold text-gray-700">{cat}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(index)} disabled={isLoading} className="text-blue-500 hover:text-blue-700 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center transition-colors disabled:opacity-50"><i className="fa-solid fa-pen"></i></button>
                                        <button onClick={() => handleDelete(index)} disabled={isLoading} className="text-red-500 hover:text-red-700 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        const ProductDetail = ({ onAddToCart, products = [], parentLoading = false }) => {
            const { slug } = useParams();
            const [product, setProduct] = useState(null);
            const [relatedProducts, setRelatedProducts] = useState([]);
            const [loading, setLoading] = useState(true);
            const navigate = useNavigate();
            const detailTopRef = useRef(null);

            const handleBack = () => {
                if (window.history.length > 2) {
                    navigate(-1);
                } else {
                    navigate('/');
                }
            };

            const handleShare = async () => {
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: product?.name || 'Tokcayfood',
                            text: 'Xem ngay sản phẩm này trên Tokcay Korea Foods!',
                            url: window.location.href,
                        });
                    } catch (error) { console.log('User canceled share'); }
                } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Đã copy đường link sản phẩm!');
                }
            };

            useEffect(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }, [slug]);

            useEffect(() => {
                let isMounted = true;

                const computeRelated = (targetProduct, allList) => {
                    const visibleList = (allList || []).filter(p => !p.is_hidden && p.id !== targetProduct.id);
                    const sameCategory = visibleList.filter(p => {
                        if (targetProduct.category && p.category && p.category === targetProduct.category) return true;
                        if (Array.isArray(targetProduct.tags) && targetProduct.tags.length > 0 && Array.isArray(p.tags)) {
                            return p.tags.some(t => targetProduct.tags.includes(t));
                        }
                        return false;
                    });
                    return (sameCategory.length > 0 ? sameCategory : visibleList).slice(0, 5);
                };

                const findInList = (list) => {
                    if (!Array.isArray(list) || list.length === 0) return null;
                    return list.find(p => String(p.slug) === String(slug) || String(p.id) === String(slug)) || null;
                };

                const resolveProductDetail = async () => {
                    // 1. Check in-memory products prop from App
                    const fromProps = findInList(products);
                    if (fromProps) {
                        if (isMounted) {
                            setProduct(fromProps);
                            setRelatedProducts(computeRelated(fromProps, products));
                            setLoading(false);
                        }
                        return;
                    }

                    // 2. Check SWR cache (localStorage + sessionStorage)
                    const cached = readProductsCache();
                    if (cached && Array.isArray(cached.data)) {
                        const fromCache = findInList(cached.data);
                        if (fromCache) {
                            if (isMounted) {
                                setProduct(fromCache);
                                setRelatedProducts(computeRelated(fromCache, cached.data));
                                setLoading(false);
                            }
                            return;
                        }
                    }

                    // 3. If App is currently fetching all products, wait for it first
                    if (parentLoading) {
                        if (isMounted) setLoading(true);
                        return;
                    }

                    // 4. Fallback: fetch from Supabase safely
                    if (isMounted) setLoading(true);
                    try {
                        let { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
                        if (!data && !error && !isNaN(Number(slug))) {
                            const byId = await supabase.from('products').select('*').eq('id', Number(slug)).maybeSingle();
                            data = byId.data;
                            error = byId.error;
                        }
                        if (error) throw error;

                        if (isMounted) {
                            setProduct(data || null);
                        }

                        if (data && isMounted) {
                            const sourceList = (Array.isArray(products) && products.length > 0)
                                ? products
                                : (await supabase.from('products').select('*').eq('is_hidden', false).order('id', { ascending: false })).data || [];
                            if (isMounted) {
                                setRelatedProducts(computeRelated(data, sourceList));
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching product:', error);
                    } finally {
                        if (isMounted) setLoading(false);
                    }
                };

                resolveProductDetail();
                return () => { isMounted = false; };
            }, [slug, products, parentLoading]);

            if (loading || (parentLoading && !product)) {
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
                <div ref={detailTopRef} className="w-full pb-12 animate-fade-in">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-red-100/80 overflow-hidden flex flex-col md:flex-row p-6 md:p-10 mb-8">
                        <div className="w-full md:w-1/2 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50 rounded-xl">
                            <img
                                src={product.image_url || FallbackImage}
                                onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full max-h-[500px] object-cover drop-shadow-md"
                            />
                        </div>
                        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
                            <div className="flex items-center gap-3 mb-5">
                                <button onClick={handleBack} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition-all active:scale-95 w-max cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> Quay lại
                                </button>
                                <button onClick={handleShare} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition-all active:scale-95 w-max cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg> Chia sẻ
                                </button>
                            </div>
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
                                    className="w-full py-4 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_6px_16px_rgba(185,28,28,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_8px_22px_rgba(185,28,28,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg cursor-pointer"
                                    style={!isOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                >
                                    <i className="fa-solid fa-cart-plus"></i>
                                    {isOutOfStock ? 'Sản phẩm hết hàng' : 'Thêm vào giỏ hàng'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SẢN PHẨM CÙNG DANH MỤC (COMPACT SINGLE-ROW STRIP) */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-xs sm:text-sm font-bold text-red-700 uppercase tracking-wider mb-2.5">
                                Sản phẩm cùng danh mục
                            </h4>
                            <div
                                onWheel={(e) => { if (e.deltaY !== 0) { e.currentTarget.scrollLeft += e.deltaY; } }}
                                className="flex flex-nowrap items-stretch gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-2 scroll-smooth"
                            >
                                {relatedProducts.map(relProduct => {
                                    const relOutOfStock = relProduct.stock_status && relProduct.stock_status.toLowerCase() === 'hết hàng';
                                    const handleSelectRelated = () => {
                                        navigate(`/san-pham/${relProduct.slug || relProduct.id}`);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    };
                                    return (
                                        <div
                                            key={relProduct.id}
                                            onClick={handleSelectRelated}
                                            className="flex-shrink-0 w-32 sm:w-36 md:w-40 p-2 rounded-xl bg-gradient-to-br from-white/80 via-red-50/40 to-rose-100/35 backdrop-blur-md border border-red-200/55 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                                        >
                                            <div>
                                                <img
                                                    src={relProduct.image_url || FallbackImage}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                                    alt={relProduct.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-20 sm:h-24 object-contain rounded-lg bg-white p-1 mb-1.5"
                                                />
                                                <h5 className="text-[11px] sm:text-xs font-medium text-stone-800 line-clamp-2 leading-tight mb-1" title={relProduct.name}>
                                                    {relProduct.name}
                                                </h5>
                                            </div>
                                            <div className="mt-auto">
                                                <p className="text-xs font-bold text-red-600 mb-1.5">
                                                    {formatVND(relProduct.price)}
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAddToCart(relProduct);
                                                    }}
                                                    disabled={relOutOfStock}
                                                    className="w-full py-1 px-2 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                    style={!relOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                                >
                                                    {!relOutOfStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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
                let scrollTimer = null;
                const handleScroll = () => {
                    if (scrollTimer) clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(() => {
                        sessionStorage.setItem('homeScrollY', String(window.scrollY));
                    }, 150);
                };
                window.addEventListener('scroll', handleScroll, { passive: true });
                return () => {
                    if (scrollTimer) clearTimeout(scrollTimer);
                    window.removeEventListener('scroll', handleScroll);
                };
            }, []);
            return null;
        };

        const ScrollToTopAdmin = () => {
            useEffect(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }, []);
            return null;
        };

        // --- Main App ---
        const App = () => {
            const navigate = useNavigate();
            const adminPassword = "admin@1993";
            const [products, setProducts] = useState([]);
            const [settings, setSettings] = useState(null);
            const [loading, setLoading] = useState(true);
            const [totalCount, setTotalCount] = useState(0);

            // UI State - Persist Cart in localStorage
            const [cart, setCart] = useState(() => {
                try {
                    const savedCart = localStorage.getItem('tokcay_cart');
                    return savedCart ? JSON.parse(savedCart) : [];
                } catch (e) {
                    return [];
                }
            });
            useEffect(() => {
                try {
                    localStorage.setItem('tokcay_cart', JSON.stringify(cart));
                } catch (e) {
                    console.warn('Cart save error:', e);
                }
            }, [cart]);

            const [isCartOpen, setIsCartOpen] = useState(false);
            const [searchParams, setSearchParams] = useSearchParams();
            const currentPage = parseInt(searchParams.get('page') || '1', 10);
            const ITEMS_PER_PAGE = 15;

            // Filter States
            const [showFilters, setShowFilters] = useState(false);
            const [selectedTag, setSelectedTag] = useState('');
            const [priceMin, setPriceMin] = useState('');
            const [priceMax, setPriceMax] = useState('');


            const [sortOrder, setSortOrder] = useState('');
            const [searchResetKey, setSearchResetKey] = useState(0);

            // Modals
            const [selectedProduct, setSelectedProduct] = useState(null);
            const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
            const [isContactModalOpen, setIsContactModalOpen] = useState(false);

            // Admin State
            const [isAdmin, setIsAdmin] = useState(false);
            const [session, setSession] = useState(null);

            useEffect(() => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    setSession(session);
                    if (session) setIsAdmin(true);
                });
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    setSession(session);
                    if (session) setIsAdmin(true);
                    else setIsAdmin(false);
                });
                return () => subscription.unsubscribe();
            }, []);
            const [editingProduct, setEditingProduct] = useState(null);
            const [isProductModalOpen, setIsProductModalOpen] = useState(false);
            const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
            const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

            const [categories, setCategories] = useState([]);
            const [localBanner, setLocalBanner] = useState(null);

            const productsSectionRef = useRef(null);

            const fetchData = async (forceRefresh = false) => {
                let isSilentRevalidate = false;
                if (!forceRefresh) {
                    const cached = readProductsCache();
                    if (cached && Array.isArray(cached.data)) {
                        setProducts(cached.data);
                        setTotalCount(cached.data.filter(p => !p.is_hidden).length);
                        if (cached.settings) setSettings(cached.settings);
                        if (Array.isArray(cached.categories)) setCategories(cached.categories);
                        setLoading(false);
                        if (cached.isFresh) {
                            return;
                        }
                        isSilentRevalidate = true;
                    }
                }

                if (!isSilentRevalidate) {
                    setLoading(true);
                }

                try {
                    const [productsRes, settingsRes, tagsRes] = await Promise.all([
                        supabase.from('products').select('*').order('id', { ascending: false }),
                        supabase.from('settings').select('*'),
                        supabase.from('tags').select('*').order('created_at', { ascending: true })
                    ]);

                    if (productsRes.error) throw productsRes.error;
                    if (settingsRes.error) throw settingsRes.error;
                    if (tagsRes.error) throw tagsRes.error;

                    const productsList = productsRes.data || [];
                    setProducts(productsList);
                    setTotalCount(productsList.filter(p => !p.is_hidden).length);

                    let settingsObj = {};
                    if (settingsRes.data) {
                        settingsRes.data.forEach(item => {
                            settingsObj[item.key] = item.value;
                        });
                        setSettings(settingsObj);
                    }

                    let categoriesArr = [];
                    if (tagsRes.data) {
                        categoriesArr = tagsRes.data.map(t => t.name);
                        setCategories(categoriesArr);
                    }

                    writeProductsCache(productsList, settingsObj, categoriesArr);
                } catch (error) {
                    console.error('Lỗi khi tải dữ liệu:', error);
                } finally {
                    setLoading(false);
                }
            };

            useEffect(() => {
                fetchData();
            }, []);

            useEffect(() => {
                if (currentPage !== 1) {
                    setSearchParams({ page: '1' });
                }
            }, [selectedTag, priceMin, priceMax, sortOrder]);

            const handleAppBannerUpload = async (e, type) => {
                const file = e.target.files[0];
                if (!file) return;
                setLoading(true);

                try {
                    const compressedBlob = await compressBannerImage(file, type === 'mobile' ? 1080 : 1920);
                    const ext = compressedBlob.type === 'image/webp' ? 'webp' : 'jpg';
                    const fileName = `${Date.now()}_banner_${type}.${ext}`;
                    const filePath = `banners/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, compressedBlob, {
                        contentType: compressedBlob.type || 'image/webp',
                        cacheControl: '31536000'
                    });
                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('images').getPublicUrl(filePath);

                    const dbKey = type === 'mobile' ? 'banner_mobile_url' : 'banner_desktop_url';
                    const oldUrl = settings?.[dbKey];
                    await supabase.from('settings').upsert({ key: dbKey, value: data.publicUrl }, { onConflict: 'key' });
                    if (oldUrl && oldUrl !== data.publicUrl) {
                        await removeOldSupabaseImage(oldUrl, data.publicUrl);
                    }
                    clearProductsCache();
                    await fetchData(true);
                } catch (error) {
                    alert('Lỗi xử lý banner: ' + error.message);
                } finally {
                    setLoading(false);
                }
            };

            const [editingPriceId, setEditingPriceId] = useState(null);
            const [editingPriceValue, setEditingPriceValue] = useState('');

            const pinnedProductIds = useMemo(() => {
                if (!settings?.pinned_product_ids) return [];
                try {
                    const parsed = typeof settings.pinned_product_ids === 'string'
                        ? JSON.parse(settings.pinned_product_ids)
                        : settings.pinned_product_ids;
                    return Array.isArray(parsed) ? parsed.map(Number) : [];
                } catch (e) {
                    return [];
                }
            }, [settings]);

            const filteredProducts = useMemo(() => {
                let result = products.filter(p => {
                    if (!isAdmin && p.is_hidden) return false;
                    if (selectedTag !== '' && (!p.tags || !p.tags.includes(selectedTag))) return false;
                    const price = p.price || 0;
                    if (priceMin && price < Number(priceMin)) return false;
                    if (priceMax && price > Number(priceMax)) return false;
                    return true;
                });

                if (sortOrder === 'asc') {
                    result.sort((a, b) => (a.price || 0) - (b.price || 0));
                } else if (sortOrder === 'desc') {
                    result.sort((a, b) => (b.price || 0) - (a.price || 0));
                } else if (pinnedProductIds.length > 0) {
                    result.sort((a, b) => {
                        const aPinIdx = pinnedProductIds.indexOf(Number(a.id));
                        const bPinIdx = pinnedProductIds.indexOf(Number(b.id));
                        const aPinned = aPinIdx !== -1;
                        const bPinned = bPinIdx !== -1;
                        if (aPinned && !bPinned) return -1;
                        if (!aPinned && bPinned) return 1;
                        if (aPinned && bPinned) return aPinIdx - bPinIdx;
                        return (b.id || 0) - (a.id || 0);
                    });
                }

                return result;
            }, [products, isAdmin, selectedTag, priceMin, priceMax, sortOrder, pinnedProductIds]);

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
                    setSearchParams({ page: newPage.toString() });
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

            const handleAdminLogin = async (e) => {
                if (e && e.preventDefault) e.preventDefault();
                
                if (e && e.target && e.target.email) {
                    const emailInput = e.target.email.value;
                    const passwordInput = e.target.password.value;
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: emailInput,
                        password: passwordInput,
                    });
                    if (error) {
                        alert("Đăng nhập thất bại: " + error.message);
                    } else {
                        const hasPrompted = localStorage.getItem('passkey_prompted');
                        if (!hasPrompted) {
                            const wantPasskey = window.confirm("Đăng nhập thành công! Sếp có muốn lưu Vân tay/FaceID trên máy này để lần sau chạm là vào không?");
                            localStorage.setItem('passkey_prompted', 'true');
                            if (wantPasskey) {
                                try {
                                    await supabase.auth.registerPasskey();
                                    alert("✅ Đã đúc Passkey thành công!");
                                } catch (err) {
                                    console.log("Người dùng hủy hoặc lỗi tạo Passkey", err);
                                }
                            }
                        }
                        window.location.href = '/';
                    }
                } else {
                    if (isAdmin) {
                        await supabase.auth.signOut();
                        navigate('/');
                    } else {
                        navigate('/admin');
                    }
                }
            };

            const handleAdminClick = async (e) => {
                e.preventDefault();
                try {
                    // CHỈ GỌI PASSKEY KHI USER CHỦ ĐỘNG BẤM NÚT NÀY
                    const { data, error } = await supabase.auth.signInWithPasskey();
                    if (error) throw error; 
                    
                    // Quét thành công -> Vào thẳng nhà (không qua /login)
                    window.location.href = '/'; // Hoặc router.push('/') nếu có trang Dashboard riêng
                } catch (err) {
                    // Lỗi, chưa có passkey, hoặc user bấm Hủy -> Sang trang Login
                    window.location.href = '/admin'; 
                }
            };

            const handlePasskeyLogin = async () => {
                try {
                    const { data, error } = await supabase.auth.signInWithPasskey();
                    if (error) throw new Error("Đăng nhập thất bại: " + error.message);
                    if (data?.session || data?.user) {
                        setIsAdmin(true);
                        navigate('/');
                    }
                } catch (error) {
                    console.log('User canceled or error:', error);
                    const errorMsg = error.message || '';
                    if (error.name === 'NotAllowedError' || errorMsg.toLowerCase().includes('cancel') || errorMsg.includes('timed out') || errorMsg.includes('The operation either timed out or was not allowed')) {
                        alert('Đã hủy thao tác quét vân tay.');
                    } else {
                        alert('Lỗi đăng nhập bằng FaceID/Vân tay: ' + errorMsg);
                    }
                }
            };

            const handleToggleVisibility = async (e, product) => {
                e.stopPropagation();
                const { error } = await supabase.from('products').update({ is_hidden: !product.is_hidden }).eq('id', product.id);
                if (!error) {
                    clearProductsCache();
                    fetchData(true);
                }
            };

            // 1. Admin Quick Toggle Pin Product to Top
            const handleTogglePinProduct = async (e, product) => {
                e.stopPropagation();
                const pid = Number(product.id);
                const isCurrentlyPinned = pinnedProductIds.includes(pid);
                const nextPinned = isCurrentlyPinned
                    ? pinnedProductIds.filter(id => id !== pid)
                    : [pid, ...pinnedProductIds];

                setSettings(prev => ({ ...(prev || {}), pinned_product_ids: JSON.stringify(nextPinned) }));
                const { error } = await supabase.from('settings').upsert(
                    { key: 'pinned_product_ids', value: JSON.stringify(nextPinned) },
                    { onConflict: 'key' }
                );
                if (!error) {
                    clearProductsCache();
                    fetchData(true);
                }
            };

            // 2. Admin 1-Click Quick Toggle Stock Status
            const handleQuickToggleStock = async (e, product) => {
                e.stopPropagation();
                if (!isAdmin) return;
                const isCurrentlyOut = product.stock_status && product.stock_status.toLowerCase() === 'hết hàng';
                const nextStatus = isCurrentlyOut ? 'Hàng sẵn tại kho' : 'Hết hàng';
                const nextColor = isCurrentlyOut ? 'green' : 'red';

                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_status: nextStatus, statusColor: nextColor } : p));
                const { error } = await supabase.from('products').update({ stock_status: nextStatus, statusColor: nextColor }).eq('id', product.id);
                if (!error) {
                    clearProductsCache();
                    fetchData(true);
                }
            };

            // 3. Admin Quick Inline Price Save
            const handleQuickPriceSave = async (e, product) => {
                if (e && e.stopPropagation) e.stopPropagation();
                const numericPrice = editingPriceValue === '' ? 0 : Number(editingPriceValue);
                if (isNaN(numericPrice) || numericPrice < 0) {
                    setEditingPriceId(null);
                    return;
                }
                setEditingPriceId(null);
                if (numericPrice === Number(product.price)) return;

                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: numericPrice } : p));
                const { error } = await supabase.from('products').update({ price: numericPrice }).eq('id', product.id);
                if (!error) {
                    clearProductsCache();
                    fetchData(true);
                }
            };

            // 4. Admin Export Price List to Excel (CSV UTF-8 BOM)
            const handleExportPriceListCSV = () => {
                const exportList = filteredProducts.length > 0 ? filteredProducts : products;
                const headers = ['STT', 'Mã SP', 'Tên sản phẩm', 'Danh mục', 'Giá bán lẻ (VNĐ)', 'Tình trạng kho', 'Nổi bật', 'Link sản phẩm'];
                const rows = exportList.map((p, idx) => {
                    const tagsStr = Array.isArray(p.tags) ? p.tags.join('; ') : '';
                    const isPinned = pinnedProductIds.includes(Number(p.id)) ? 'Đã ghim' : '';
                    const link = `${window.location.origin}/san-pham/${p.slug || p.id}`;
                    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
                    return [
                        idx + 1,
                        escapeCsv(p.sku || `SP-${p.id}`),
                        escapeCsv(p.name || ''),
                        escapeCsv(tagsStr),
                        p.price || 0,
                        escapeCsv(p.stock_status || 'Hàng sẵn tại kho'),
                        escapeCsv(isPinned),
                        escapeCsv(link)
                    ].join(',');
                });
                const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const today = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `Bang-Gia-Hung-Thuan-Tokcay-${today}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };

            // 5. Admin Print / Save PDF Price List
            const handlePrintPriceListPDF = () => {
                const exportList = (filteredProducts.length > 0 ? filteredProducts : products).filter(p => !p.is_hidden);
                const todayStr = new Date().toLocaleDateString('vi-VN');
                const printWin = window.open('', '_blank', 'width=1000,height=800');
                if (!printWin) {
                    alert('Vui lòng cho phép mở cửa sổ bật lên (Pop-up) để in bảng giá.');
                    return;
                }
                const rowsHtml = exportList.map((p, idx) => {
                    const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : '';
                    const priceStr = formatVND(p.price);
                    const stockStr = p.stock_status || 'Hàng sẵn tại kho';
                    const isOut = stockStr.toLowerCase() === 'hết hàng';
                    return `
                        <tr>
                            <td style="text-align:center;font-weight:600;">${idx + 1}</td>
                            <td style="text-align:center;">
                                <img src="${p.image_url || FallbackImage}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid #eee;" />
                            </td>
                            <td style="font-weight:700;color:#1c1917;">${p.name || ''}</td>
                            <td style="color:#57534e;font-size:12px;">${tagsStr}</td>
                            <td style="text-align:right;font-weight:800;color:#b91c1c;">${priceStr}</td>
                            <td style="text-align:center;color:#0068FF;font-weight:600;font-size:12px;">Liên hệ Zalo</td>
                            <td style="text-align:center;">
                                <span style="padding:3px 8px;border-radius:99px;font-size:11px;font-weight:700;background:${isOut ? '#fee2e2' : '#dcfce7'};color:${isOut ? '#b91c1c' : '#15803d'};">
                                    ${stockStr}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('');

                printWin.document.write(`
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8" />
                        <title>Bảng Báo Giá - Hùng Thuận Tokcay Korea Foods (${todayStr})</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #1c1917; }
                            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b91c1c; padding-bottom: 14px; margin-bottom: 18px; }
                            .company h1 { margin: 0 0 6px 0; font-size: 18px; color: #b91c1c; text-transform: uppercase; }
                            .company p { margin: 2px 0; font-size: 12.5px; color: #44403c; }
                            .meta { text-align: right; font-size: 12.5px; }
                            .meta h2 { margin: 0 0 6px 0; font-size: 16px; color: #1c1917; }
                            table { width: 100%; border-collapse: collapse; font-size: 13px; }
                            th { background: #b91c1c; color: #fff; padding: 9px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
                            td { padding: 7px 8px; border-bottom: 1px solid #e7e5e4; vertical-align: middle; }
                            tr:nth-child(even) { background: #fafaf9; }
                            @media print {
                                .no-print { display: none !important; }
                                body { margin: 10mm; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="no-print" style="margin-bottom:16px;display:flex;justify-content:flex-end;gap:10px;">
                            <button onclick="window.print()" style="background:#b91c1c;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ In / Lưu thành PDF</button>
                            <button onclick="window.close()" style="background:#e7e5e4;color:#1c1917;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">Đóng</button>
                        </div>
                        <div class="header">
                            <div class="company">
                                <h1>CÔNG TY TNHH HÙNG THUẬN TOKCAY KOREA FOODS</h1>
                                <p>📍 Địa chỉ: 92B5, KDC Hưng Phú 1, KV9, Phường Hưng Phú, TP. Cần Thơ</p>
                                <p>📞 Hotline Sỉ/Lẻ (Zalo): <strong>0902 631 632</strong> | ✉️ Email: hungthuanfood@gmail.com</p>
                            </div>
                            <div class="meta">
                                <h2>BẢNG BÁO GIÁ SẢN PHẨM</h2>
                                <p>Ngày xuất: <strong>${todayStr}</strong></p>
                                <p>Tổng số mặt hàng: <strong>${exportList.length}</strong></p>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:40px;text-align:center;">STT</th>
                                    <th style="width:60px;text-align:center;">Ảnh</th>
                                    <th>Tên sản phẩm</th>
                                    <th style="width:140px;">Danh mục</th>
                                    <th style="width:110px;text-align:right;">Giá bán lẻ</th>
                                    <th style="width:100px;text-align:center;">Giá sỉ/thùng</th>
                                    <th style="width:120px;text-align:center;">Tình trạng</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                        </script>
                    </body>
                    </html>
                `);
                printWin.document.close();
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

                        clearProductsCache();
                        setProducts(prev => prev.filter(p => p.id !== product.id));

                        if (product.image_url) {
                            await removeOldSupabaseImage(product.image_url, null);
                        }
                        await fetchData(true);
                    } catch (error) {
                        alert('Lỗi xóa sản phẩm: ' + error.message);
                    }
                }
            };

            const handleSaveProduct = async (productData) => {
                const { id, name, slug, price, stock_status, statusColor, image_url, description, tags } = productData;
                let err;
                if (id) {
                    const { error } = await supabase.from('products').update({ name, slug, price, stock_status, statusColor, image_url, description, tags }).eq('id', id);
                    err = error;
                } else {
                    const { error } = await supabase.from('products').insert([{
                        name, slug, price, stock_status, statusColor, image_url, description, tags, sku: 'PVN' + Math.floor(Math.random() * 1000), is_hidden: false
                    }]);
                    err = error;
                }

                if (err) {
                    alert('Lỗi lưu sản phẩm: ' + err.message);
                } else {
                    setIsProductModalOpen(false);
                    clearProductsCache();
                    fetchData(true); // Cập nhật lại state products ngay lập tức
                }
            };

            const handleSaveSettings = async (newData) => {
                const updates = Object.keys(newData).map(key => ({
                    key: key,
                    value: newData[key]
                }));
                await supabase.from('settings').upsert(updates, { onConflict: 'key' });
                setIsSettingsModalOpen(false);
                clearProductsCache();
                fetchData(true);
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

            const handleProductsNavClick = () => {
                setSelectedProduct(null);
                setIsDetailsModalOpen(false);
                setSelectedTag('');
                setPriceMin('');
                setPriceMax('');
                setSortOrder('');
                setShowFilters(false);
                setSearchResetKey(prev => prev + 1);
                setSearchParams({ page: '1' });
                sessionStorage.removeItem('homeScrollY');
                navigate('/');
                setTimeout(() => {
                    const el = document.getElementById('products-section') || productsSectionRef.current;
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 80);
            };

            const handleLogoClick = (e) => {
                if (e && e.preventDefault) e.preventDefault();
                setSelectedProduct(null);
                setIsDetailsModalOpen(false);
                setShowFilters(false);
                sessionStorage.removeItem('homeScrollY');
                navigate('/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            return (
                <div className="relative min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#FAF0E6' }}>
                    <FloatingDecor />

                    <Header
                        cartCount={cart.reduce((a, c) => a + c.qty, 0)}
                        onOpenCart={() => setIsCartOpen(true)}
                        onContactClick={() => setIsContactModalOpen(true)}
                        onProductsClick={handleProductsNavClick}
                        onLogoClick={handleLogoClick}
                        searchResetKey={searchResetKey}
                    />

                    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
                                            <div className="mb-8 p-5 bg-primaryLight border border-red-200 rounded-xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 animate-fade-in">
                                                <div className="flex items-center flex-wrap gap-3 text-primaryDark font-bold text-lg">
                                                    <span className="relative flex h-4 w-4">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                                                    </span>
                                                    <span>Chế độ Quản Trị (Admin)</span>
                                                    <span
                                                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-600 backdrop-blur-md border border-red-400/40 text-white select-all shadow-sm"
                                                        style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }}
                                                        title="Mật khẩu Admin hiện tại"
                                                    >
                                                        Pass: {adminPassword}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center gap-2.5">
                                                    <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="flex items-center gap-2 bg-white border border-gray-300 px-3.5 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer">
                                                        <i className="fa-solid fa-plus text-primary"></i> Thêm sản phẩm
                                                    </button>
                                                    <button onClick={handleExportPriceListCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer" title="Tải xuống Bảng Giá file Excel (.CSV)">
                                                        <i className="fa-solid fa-file-excel"></i> Xuất Excel
                                                    </button>
                                                    <button onClick={handlePrintPriceListPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }} title="In Bảng Báo Giá hoặc Lưu thành PDF">
                                                        <i className="fa-solid fa-print"></i> In Bảng Giá / PDF
                                                    </button>
                                                    <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 bg-gray-800 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 shadow-sm transition-colors cursor-pointer">
                                                        <i className="fa-solid fa-gear"></i> Cài đặt chung
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* TÁCH BIỆT 2 HÀNG ĐỘC LẬP: HÀNG 1 (Danh mục) & HÀNG 2 (Số lượng + Bộ lọc/Sắp xếp) */}
                                        <div className="flex flex-col w-full max-w-7xl mx-auto px-3 sm:px-4 gap-3 mb-4">
                                            {/* HÀNG 1: Thanh Tag Danh mục */}
                                            <TagsSlider
                                                uniqueTags={categories}
                                                selectedTag={selectedTag}
                                                onTagToggle={handleTagToggle}
                                                isAdmin={isAdmin}
                                                onManageTags={() => setIsTagsModalOpen(true)}
                                            />

                                            {/* HÀNG 2: Thanh đếm số sản phẩm (Trái) & Bộ lọc / Sắp xếp (Phải) */}
                                            <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 relative z-20 text-xs sm:text-sm text-stone-600">
                                                <span className="font-medium text-stone-500">
                                                    Hiển thị <strong className="text-red-600 font-semibold">{filteredProducts.length}</strong> sản phẩm
                                                </span>

                                                <div className="flex items-center gap-2 relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowFilters(!showFilters)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-sm border font-medium shadow-sm transition-all cursor-pointer select-none ${showFilters || priceMin || priceMax ? 'bg-red-600 text-white border-red-400/40' : 'bg-white/80 hover:bg-red-50 border-red-100 text-stone-700 hover:text-red-600'}`}
                                                        style={showFilters || priceMin || priceMax ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                                    >
                                                        <i className="fa-solid fa-sliders text-xs"></i>
                                                        <span>Bộ lọc</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (sortOrder === '') setSortOrder('asc');
                                                            else if (sortOrder === 'asc') setSortOrder('desc');
                                                            else setSortOrder('');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 hover:bg-red-50/80 backdrop-blur-sm border border-red-100/80 text-stone-700 hover:text-red-600 font-medium shadow-sm transition-all cursor-pointer select-none"
                                                    >
                                                        <span>
                                                            {sortOrder === 'asc' ? 'Sắp xếp: Giá tăng dần' : sortOrder === 'desc' ? 'Sắp xếp: Giá giảm dần' : 'Sắp xếp'}
                                                        </span>
                                                        {sortOrder === 'asc' ? (
                                                            <span className="text-red-600 font-bold leading-none">↑</span>
                                                        ) : sortOrder === 'desc' ? (
                                                            <span className="text-red-600 font-bold leading-none">↓</span>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-500">
                                                                <path d="m21 16-4 4-4-4" />
                                                                <path d="M17 20V4" />
                                                                <path d="m3 8 4-4 4 4" />
                                                                <path d="M7 4v16" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Khung Bộ Lọc nổi độc lập (absolute right-0 top-full mt-2 z-30) */}
                                                    {showFilters && (
                                                        <div className="absolute right-0 top-full mt-2 z-30 w-72 sm:w-80 bg-white/[0.97] backdrop-blur-2xl border border-red-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-5 animate-fade-in">
                                                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2.5">
                                                                <h3 className="text-base font-extrabold text-gray-800 uppercase tracking-wide">Bộ Lọc</h3>
                                                                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-red-600 bg-gray-100 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                                                            </div>

                                                            {/* Tag Filter */}
                                                            <div className="mb-4 border-b border-gray-100 pb-4">
                                                                <h4 className="font-bold text-gray-700 mb-2.5 text-xs uppercase tracking-wider">Dòng Sản Phẩm</h4>
                                                                <div className="space-y-2.5 max-h-44 overflow-y-auto hide-scroll">
                                                                    {categories.map(tag => (
                                                                        <label key={tag} className="flex items-center gap-2.5 cursor-pointer group">
                                                                            <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                                                checked={selectedTag === tag}
                                                                                onChange={() => {
                                                                                    if (selectedTag === tag) setSelectedTag('');
                                                                                    else setSelectedTag(tag);
                                                                                }}
                                                                            />
                                                                            <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">{tag}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Price Filter */}
                                                            <div>
                                                                <h4 className="font-bold text-gray-700 mb-2.5 text-xs uppercase tracking-wider">Khoảng Giá</h4>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <input type="number" placeholder="Từ" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                                                                    <span className="text-gray-400">-</span>
                                                                    <input type="number" placeholder="Đến" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                                                        <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" checked={!priceMin && Number(priceMax) === 50000} onChange={() => handlePresetPrice('', 50000)} />
                                                                        <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">Dưới 50.000đ</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                                                        <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" checked={Number(priceMin) === 50000 && Number(priceMax) === 150000} onChange={() => handlePresetPrice(50000, 150000)} />
                                                                        <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">50.000đ - 150.000đ</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                                                        <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" checked={Number(priceMin) === 150000 && !priceMax} onChange={() => handlePresetPrice(150000, '')} />
                                                                        <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">Trên 150.000đ</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2.5 cursor-pointer group">
                                                                        <input type="radio" name="price" className="text-primary focus:ring-primary w-4 h-4 cursor-pointer" checked={!priceMin && !priceMax} onChange={() => handlePresetPrice('', '')} />
                                                                        <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">Tất cả mức giá</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* KHU VỰC LƯỚI SẢN PHẨM */}
                                        <div className="w-full max-w-7xl mx-auto pb-10 mb-8">
                                            {loading ? (
                                                <div className="flex justify-center py-32">
                                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                                                </div>
                                            ) : filteredProducts.length === 0 ? (
                                                <div className="text-center py-32 text-gray-500 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/80 flex flex-col items-center">
                                                    <i className="fa-solid fa-box-open text-6xl text-gray-300 mb-4"></i>
                                                    <p className="text-lg">Không tìm thấy sản phẩm nào phù hợp.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full justify-center">
                                                        {currentProducts.map(product => {
                                                            const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                                                            const isPinned = pinnedProductIds.includes(Number(product.id));
                                                            const CardLink = isAdmin ? 'div' : Link;
                                                            const cardLinkProps = isAdmin ? {} : { to: `/san-pham/${product.slug || product.id}` };
                                                            return (
                                                                <div
                                                                    key={product.id}
                                                                    className={`group bg-gradient-to-br from-white/80 via-red-50/40 to-rose-100/35 hover:from-white/90 hover:via-red-50/55 hover:to-rose-100/50 backdrop-blur-sm border ${isPinned ? 'border-red-400/80 ring-1 ring-red-300/50' : 'border-red-200/55'} shadow-[0_8px_24px_rgba(185,28,28,0.05)] hover:shadow-[0_14px_32px_rgba(185,28,28,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col ${product.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}
                                                                >
                                                                    <CardLink {...cardLinkProps} className="relative aspect-square overflow-hidden bg-white/85 p-4 flex items-center justify-center border-b border-red-100/60 block cursor-pointer">
                                                                        <img
                                                                            src={product.image_url || FallbackImage}
                                                                            onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                                                            alt={product.name}
                                                                            loading="lazy"
                                                                            decoding="async"
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                        />
                                                                        {isAdmin && (
                                                                            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                                                                                <button
                                                                                    onClick={(e) => handleTogglePinProduct(e, product)}
                                                                                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center backdrop-blur rounded-full shadow-md transition-colors cursor-pointer ${isPinned ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/90 text-gray-700 hover:bg-amber-500 hover:text-white'}`}
                                                                                    title={isPinned ? 'Bỏ ghim khỏi đầu trang' : 'Ghim sản phẩm lên đầu trang'}
                                                                                >
                                                                                    <i className="fa-solid fa-thumbtack text-xs sm:text-sm"></i>
                                                                                </button>
                                                                                <button onClick={(e) => handleEditClick(e, product)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-primary hover:text-white text-gray-700 transition-colors cursor-pointer" title="Chỉnh sửa chi tiết">
                                                                                    <i className="fa-solid fa-pen text-xs sm:text-sm"></i>
                                                                                </button>
                                                                                <button onClick={(e) => handleToggleVisibility(e, product)} className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md transition-colors cursor-pointer ${product.is_hidden ? 'hover:bg-green-500 hover:text-white text-green-600' : 'hover:bg-gray-800 hover:text-white text-gray-600'}`} title={product.is_hidden ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}>
                                                                                    <i className={`fa-solid ${product.is_hidden ? 'fa-eye' : 'fa-eye-slash'} text-xs sm:text-sm`}></i>
                                                                                </button>
                                                                                <button onClick={(e) => handleDeleteProduct(e, product)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-red-600 hover:text-white text-red-500 transition-colors cursor-pointer" title="Xóa sản phẩm">
                                                                                    <i className="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                                                            {isPinned && (
                                                                                <div
                                                                                    className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 w-max"
                                                                                    style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }}
                                                                                >
                                                                                    <i className="fa-solid fa-thumbtack text-[9px]"></i> Nổi bật
                                                                                </div>
                                                                            )}
                                                                            {product.is_hidden && (
                                                                                <div className="bg-gray-800 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md w-max">
                                                                                    Đang ẩn
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </CardLink>

                                                                    <div className="p-4 sm:p-5 flex flex-col flex-1 bg-transparent">
                                                                        <CardLink {...cardLinkProps}>
                                                                            <h3 className="text-[15px] font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors" title={product.name}>{product.name}</h3>
                                                                        </CardLink>
                                                                        <div className="mb-2">
                                                                            <span
                                                                                onClick={isAdmin ? (e) => handleQuickToggleStock(e, product) : undefined}
                                                                                title={isAdmin ? 'Admin: Nhấn 1 chạm để đổi nhanh Còn hàng / Hết hàng' : undefined}
                                                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs sm:text-sm font-medium ${colorClass} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-red-300 active:scale-95 transition-all select-none' : ''}`}
                                                                            >
                                                                                {product.stock_status || 'Hàng sẵn tại kho'}
                                                                                {isAdmin && <i className="fa-solid fa-rotate text-[10px] opacity-75"></i>}
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-auto pt-3">
                                                                            <p className="whitespace-nowrap overflow-hidden text-ellipsis w-full text-[11px] sm:text-xs md:text-sm text-blue-600 mb-1">Giá sỉ/thùng: <span className="font-bold cursor-pointer no-underline text-blue-600">liên hệ Zalo</span></p>
                                                                            {isAdmin && editingPriceId === product.id ? (
                                                                                <div className="mb-3 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                                                    <input
                                                                                        type="number"
                                                                                        autoFocus
                                                                                        className="w-full border border-red-400 rounded-md px-2 py-1 text-xs sm:text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-400 bg-white"
                                                                                        value={editingPriceValue}
                                                                                        onChange={e => setEditingPriceValue(e.target.value)}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter') handleQuickPriceSave(e, product);
                                                                                            if (e.key === 'Escape') setEditingPriceId(null);
                                                                                        }}
                                                                                        onBlur={e => handleQuickPriceSave(e, product)}
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onMouseDown={e => { e.preventDefault(); handleQuickPriceSave(e, product); }}
                                                                                        className="px-2 py-1 bg-red-600 text-white rounded-md text-xs font-bold cursor-pointer"
                                                                                        style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }}
                                                                                    >
                                                                                        Lưu
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <p
                                                                                    onClick={isAdmin ? (e) => { e.stopPropagation(); setEditingPriceId(product.id); setEditingPriceValue(String(product.price || 0)); } : undefined}
                                                                                    title={isAdmin ? 'Admin: Nhấn để sửa nhanh giá bán lẻ' : undefined}
                                                                                    className={`mb-3 tracking-tight w-full flex items-center flex-wrap md:flex-nowrap whitespace-nowrap overflow-hidden text-ellipsis ${isAdmin ? 'cursor-pointer hover:bg-red-50/80 rounded px-1 -mx-1 transition-colors' : ''}`}
                                                                                >
                                                                                    <span className="text-gray-500 text-xs md:text-sm font-medium mr-1">Giá bán lẻ: </span>
                                                                                    <span className="text-sm md:text-base font-bold text-red-600">{formatVND(product.price)}</span>
                                                                                    {isAdmin && <i className="fa-solid fa-pen-to-square text-[11px] text-red-400 ml-1.5"></i>}
                                                                                </p>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                                                                                disabled={product.stock_status && product.stock_status.toLowerCase() === 'hết hàng'}
                                                                                className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_6px_16px_rgba(185,28,28,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_8px_22px_rgba(185,28,28,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap"
                                                                                style={!(product.stock_status && product.stock_status.toLowerCase() === 'hết hàng') ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                                                            >
                                                                                {!(product.stock_status && product.stock_status.toLowerCase() === 'hết hàng') ? (
                                                                                    <>Thêm vào giỏ</>
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
                                    </main>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="w-full py-6 flex justify-center items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(1)}
                                                disabled={currentPage === 1}
                                                title="Trang đầu"
                                                aria-label="Trang đầu"
                                                className="w-10 h-10 flex items-center justify-center bg-white/75 backdrop-blur-md border border-white/80 rounded-xl shadow-sm text-base font-bold text-stone-700 hover:bg-white hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                &laquo;
                                            </button>

                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                title="Trang trước"
                                                aria-label="Trang trước"
                                                className="w-10 h-10 flex items-center justify-center bg-white/75 backdrop-blur-md border border-white/80 rounded-xl shadow-sm text-base font-bold text-stone-700 hover:bg-white hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                &lt;
                                            </button>

                                            <div className="hidden sm:flex items-center gap-1.5">
                                                {Array.from({ length: totalPages }).map((_, idx) => {
                                                    const page = idx + 1;
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => handlePageChange(page)}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${currentPage === page ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border border-red-400/40' : 'bg-white/75 backdrop-blur-md border border-white/80 text-stone-700 hover:bg-white hover:text-red-600 shadow-sm'}`}
                                                            style={currentPage === page ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="sm:hidden px-3.5 py-2 bg-white/75 backdrop-blur-md border border-white/80 rounded-xl shadow-sm text-sm font-bold text-stone-700">
                                                {currentPage} / {totalPages}
                                            </div>

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                title="Trang sau"
                                                aria-label="Trang sau"
                                                className="w-10 h-10 flex items-center justify-center bg-white/75 backdrop-blur-md border border-white/80 rounded-xl shadow-sm text-base font-bold text-stone-700 hover:bg-white hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                &gt;
                                            </button>

                                            <button
                                                onClick={() => handlePageChange(totalPages)}
                                                disabled={currentPage === totalPages}
                                                title="Trang cuối"
                                                aria-label="Trang cuối"
                                                className="w-10 h-10 flex items-center justify-center bg-white/75 backdrop-blur-md border border-white/80 rounded-xl shadow-sm text-base font-bold text-stone-700 hover:bg-white hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                &raquo;
                                            </button>
                                        </div>
                                    )}
                                </>
                            } />
                            <Route path="/san-pham/:slug" element={<ProductDetail onAddToCart={handleAddToCart} products={products} parentLoading={loading} />} />
                            <Route path="/admin/*" element={
                                <div className="p-20 text-center flex flex-col items-center justify-center min-h-[50vh]">
                                    <ScrollToTopAdmin />
                                    <i className="fa-solid fa-shield-halved text-6xl text-primary mb-6"></i>
                                    <h2 className="text-3xl font-black text-gray-800 mb-4">Khu Vực Quản Trị</h2>
                                    <p className="text-gray-500 mb-8 max-w-md">Khu vực này dành riêng cho Admin. Vui lòng đăng nhập để thao tác thêm, sửa, xóa sản phẩm và cài đặt hệ thống.</p>
                                    {!isAdmin && (
                                        <form onSubmit={handleAdminLogin} className="w-full max-w-sm mt-4 flex flex-col gap-3">
                                            <input name="email" type="email" placeholder="Email Admin" required autoComplete="username webauthn" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" />
                                            <input name="password" type="password" placeholder="Mật khẩu" required autoComplete="current-password webauthn" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" />
                                            <button type="submit" className="bg-primary hover:bg-primaryDark text-white font-bold px-8 py-3 rounded-xl shadow-md transition-transform hover:scale-105">
                                                Đăng nhập Admin
                                            </button>
                                        </form>
                                    )}

                                    {isAdmin && (
                                        <button onClick={() => navigate('/')} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-transform hover:scale-105 flex items-center justify-center gap-3">
                                            👉 Vào trang Quản trị
                                        </button>
                                    )}
                                </div>
                            } />
                        </Routes>
                    </div>

                    {/* Decorative Top Wave */}
                    <div className="relative z-10 w-full mt-auto overflow-hidden leading-none pointer-events-none select-none -mb-px">
                        <svg className="relative block w-full h-10 sm:h-14 md:h-16" viewBox="0 0 1440 120" preserveAspectRatio="none">
                            <path
                                d="M0,32 C320,112 640,-16 960,48 C1200,96 1340,24 1440,12 L1440,120 L0,120 Z"
                                fill="rgba(185, 28, 28, 0.15)"
                            />
                            <path
                                d="M0,68 C360,12 720,116 1080,56 C1260,26 1380,64 1440,80 L1440,120 L0,120 Z"
                                fill="rgba(185, 28, 28, 0.95)"
                            />
                        </svg>
                    </div>

                    <footer
                        className="relative z-10 w-full text-white bg-red-800 backdrop-blur-xl border-t border-red-400/30 shadow-[0_-10px_35px_rgba(153,27,27,0.25)] overflow-hidden py-10 sm:py-12"
                        style={{ background: 'linear-gradient(180deg, rgba(185, 28, 28, 0.95) 0%, rgba(153, 27, 27, 0.98) 50%, rgba(127, 29, 29, 1) 100%)' }}
                    >
                        {/* Ambient Light Orbs */}
                        <div className="pointer-events-none absolute -top-24 left-1/4 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl"></div>
                        <div className="pointer-events-none absolute -bottom-24 right-1/4 w-72 h-72 bg-red-500/20 rounded-full blur-3xl"></div>

                        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
                            <div
                                className="backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-inner flex flex-col md:flex-row justify-between items-start gap-8"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                            >
                                <div className="flex flex-col space-y-2.5 tracking-wide drop-shadow-sm">
                                    <h4 className="text-base sm:text-lg font-bold text-white tracking-wider">CÔNG TY TNHH HÙNG THUẬN TOKCAY KOREA FOODS</h4>
                                    <div className="text-sm text-red-100 space-y-1.5 leading-relaxed">
                                        <p>MST: 1801801902</p>
                                        <p>Địa chỉ: 92B5, KDC Hưng Phú 1, KV9, Phường Hưng Phú, Thành phố Cần Thơ</p>
                                        <p>Điện thoại: 0902 631 632</p>
                                        <p>Email: hungthuanfood@gmail.com</p>
                                    </div>
                                    <div className="text-red-100 text-sm font-medium pt-4 border-t border-white/15">
                                        &copy; 2026 Hùng Thuận Tokcay. All rights reserved.
                                    </div>
                                </div>
                                <div className="flex flex-col md:items-end gap-4 text-sm tracking-wide drop-shadow-sm">
                                    <div className="flex flex-wrap gap-6">
                                        <a href="#" className="text-white hover:text-yellow-300 transition-colors font-medium">Chính sách bảo mật</a>
                                        <a href="#" className="text-white hover:text-yellow-300 transition-colors font-medium">Điều khoản dịch vụ</a>
                                    </div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        {isAdmin ? (
                                            <button onClick={(e) => { window.scrollTo(0, 0); handleAdminLogin(e); }} className="text-red-100 hover:text-yellow-300 transition-colors cursor-pointer font-medium outline-none text-left md:text-right w-max">
                                                Đăng xuất admin
                                            </button>
                                        ) : (
                                            <button onClick={(e) => handleAdminClick(e)} className="text-red-100 hover:text-yellow-300 transition-colors cursor-pointer font-medium outline-none text-left md:text-right w-max">
                                                Admin
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md border border-white/30 text-white select-all"
                                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
                                                title="Mật khẩu Admin hiện tại"
                                            >
                                                Pass: {adminPassword}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>

                    <CartSlideOver isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} setCart={setCart} zaloNumber={settings?.link_zalo || settings?.zalo_number} />
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
                            <AdminSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSave={handleSaveSettings} session={session} />
                            <AdminTagsModal isOpen={isTagsModalOpen} onClose={() => setIsTagsModalOpen(false)} categories={categories} products={products} fetchData={fetchData} />
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
