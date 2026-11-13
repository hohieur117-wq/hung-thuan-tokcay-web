import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import FloatingDecor from './components/FloatingDecor.jsx';
import './styles.css';


        // Tích hợp Supabase
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { experimental: { passkey: true } } });

        const isWebAuthnSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;

        const formatVND = (price) => {
            const num = Number(price);
            const safePrice = (!isNaN(num) && num >= 0) ? num : 0;
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(safePrice);
        };

        const sanitizeHttpUrl = (url, fallback = '#') => {
            if (!url) return fallback;
            try {
                const parsed = new URL(String(url).trim());
                if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                    return parsed.href;
                }
            } catch (e) {
                // Invalid URL
            }
            return fallback;
        };

        const getCleanZaloLink = (raw) => {
            if (!raw) return 'https://zalo.me/0902631632';
            const str = String(raw).trim();
            const cleanNumber = str.replace(/^https?:\/\/(www\.)?zalo\.me\//i, '').replace(/[^\d]/g, '');
            return `https://zalo.me/${cleanNumber || '0902631632'}`;
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

        const FallbackImage = "/fallback.png";
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

        const writeProductsCache = (products, settings, categories) => {
            const serialized = JSON.stringify({
                data: products,
                settings,
                categories,
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

        // Đóng modal bằng phím ESC (giữ callback luôn mới mà không cần gắn lại listener)
        const useEscapeToClose = (isOpen, onClose) => {
            const onCloseRef = useRef(onClose);
            useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
            useEffect(() => {
                if (!isOpen) return;
                const handleKeyDown = (event) => {
                    if (event.key === 'Escape') onCloseRef.current && onCloseRef.current();
                };
                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
            }, [isOpen]);
        };

        const removeAccents = (str) => {
            return str.normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                      .toLowerCase();
        };

        const LiveSearchBar = ({ resetKey, onFocusChange, onTextChange, inputRef, placeholder }) => {
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
                    if (onTextChange) onTextChange(false);
                    if (onFocusChange) onFocusChange(false);
                }
            }, [resetKey]);

            useEffect(() => {
                const handleClickOutside = (event) => {
                    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                        setIsDropdownOpen(false);
                        if (onFocusChange) onFocusChange(false);
                    }
                };
                document.addEventListener("mousedown", handleClickOutside);
                document.addEventListener("touchstart", handleClickOutside);
                return () => {
                    document.removeEventListener("mousedown", handleClickOutside);
                    document.removeEventListener("touchstart", handleClickOutside);
                };
            }, [onFocusChange]);

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
                            const cachedMatches = cacheEntry.cached.data.filter(p => {
                                if (p.is_hidden) return false;
                                const pName = removeAccents(p.name || '');
                                const pSlug = String(p.slug || '').toLowerCase();
                                return pName.includes(normalizedTerm) || (slugTerm && pSlug.includes(slugTerm));
                            });
                            // Chỉ dùng cache khi có kết quả; nếu không, truy vấn server để không bỏ sót sản phẩm mới
                            if (cachedMatches.length > 0) rawData = cachedMatches;
                        }

                        if (!rawData) {
                            const cleanSearch = trimmedTerm.replace(/[,().%]/g, '').trim();
                            const cleanSlug = slugTerm ? slugTerm.replace(/[,().%]/g, '').trim() : '';
                            if (cleanSearch) {
                                const searchFilter = cleanSlug
                                    ? `name.ilike.%${cleanSearch}%,slug.ilike.%${cleanSlug}%`
                                    : `name.ilike.%${cleanSearch}%`;
                                const { data, error } = await supabase
                                    .from('products')
                                    .select('name, slug, image_url, price')
                                    .eq('is_hidden', false)
                                    .or(searchFilter)
                                    .limit(20);
                                if (error) throw error;
                                rawData = data || [];
                            } else {
                                rawData = [];
                            }
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

            const handleInputChange = (e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (onTextChange) onTextChange(val.trim().length > 0);
            };

            return (
                <div ref={wrapperRef} className="relative w-full max-w-md">
                    <div className="flex items-center w-full rounded-full bg-white/95 focus-within:bg-white focus-within:ring-2 focus-within:ring-yellow-300 shadow-inner overflow-hidden p-1 transition-all">
                        <input
                            ref={inputRef}
                            type="search"
                            name="tokcay_search_query"
                            className="block w-full min-w-0 pl-4 pr-3 py-2 rounded-l-full border-none leading-5 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none sm:text-sm"
                            placeholder={placeholder || "Tìm kiếm sản phẩm..."}
                            value={searchTerm}
                            onChange={handleInputChange}
                            onFocus={() => {
                                if (onFocusChange) onFocusChange(true);
                                if (searchTerm.trim()) setIsDropdownOpen(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsDropdownOpen(false);
                                    if (onFocusChange) onFocusChange(false);
                                    e.target.blur();
                                }
                            }}
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
                                        if (onFocusChange) onFocusChange(false);
                                        if (onTextChange) onTextChange(false);
                                        setSearchTerm('');
                                        navigate(`/san-pham/${product.slug || product.id}`);
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
        const BlossomIcon = ({ className = 'w-5 h-5', petalColor = '#DC2626', centerColor = '#FFFFFF' }) => (
            <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
                {[0, 72, 144, 216, 288].map((deg) => (
                    <circle
                        key={deg}
                        cx="12"
                        cy="6.8"
                        r="4.7"
                        fill={petalColor}
                        transform={`rotate(${deg} 12 12)`}
                    />
                ))}
                <circle cx="12" cy="12" r="4.2" fill={petalColor} />
                {[0, 72, 144, 216, 288].map((deg) => (
                    <line
                        key={`r-${deg}`}
                        x1="12"
                        y1="12"
                        x2="12"
                        y2="8.1"
                        stroke={centerColor}
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        transform={`rotate(${deg} 12 12)`}
                    />
                ))}
                <circle cx="12" cy="12" r="2.1" fill={centerColor} />
                {[0, 72, 144, 216, 288].map((deg) => (
                    <circle
                        key={`d-${deg}`}
                        cx="12"
                        cy="7.8"
                        r="0.75"
                        fill={centerColor}
                        transform={`rotate(${deg} 12 12)`}
                    />
                ))}
            </svg>
        );

        const SEIGAIHA_TILE_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='30' viewBox='0 0 60 30'><rect width='60' height='30' fill='%238c1414'/><g fill='%238c1414' stroke='%23f2ca7e' stroke-width='1.35' stroke-opacity='0.88'><circle cx='30' cy='-15' r='28'/><circle cx='30' cy='-15' r='22'/><circle cx='30' cy='-15' r='16'/><circle cx='30' cy='-15' r='10'/><circle cx='0' cy='0' r='28'/><circle cx='0' cy='0' r='22'/><circle cx='0' cy='0' r='16'/><circle cx='0' cy='0' r='10'/><circle cx='60' cy='0' r='28'/><circle cx='60' cy='0' r='22'/><circle cx='60' cy='0' r='16'/><circle cx='60' cy='0' r='10'/><circle cx='30' cy='15' r='28'/><circle cx='30' cy='15' r='22'/><circle cx='30' cy='15' r='16'/><circle cx='30' cy='15' r='10'/><circle cx='0' cy='30' r='28'/><circle cx='0' cy='30' r='22'/><circle cx='0' cy='30' r='16'/><circle cx='0' cy='30' r='10'/><circle cx='60' cy='30' r='28'/><circle cx='60' cy='30' r='22'/><circle cx='60' cy='30' r='16'/><circle cx='60' cy='30' r='10'/><circle cx='30' cy='45' r='28'/><circle cx='30' cy='45' r='22'/><circle cx='30' cy='45' r='16'/><circle cx='30' cy='45' r='10'/></g></svg>";
        const SEIGAIHA_CRIMSON_STYLE = {
            backgroundColor: '#8c1414',
            backgroundImage: `url("data:image/svg+xml,${SEIGAIHA_TILE_SVG}")`,
            backgroundSize: '48px 24px',
            backgroundRepeat: 'repeat'
        };
        const buildSeigaihaWhiteSvg = () => {
            const centers = [[30, -15], [0, 0], [60, 0], [30, 15], [0, 30], [60, 30], [30, 45]];
            const radii = [30, 18];
            const circles = centers.map(([cx, cy]) =>
                radii.map((r) => `<circle cx='${cx}' cy='${cy}' r='${r}' fill='%23F6F0EE' stroke='%23FFFFFF' stroke-width='2.2' stroke-opacity='0.82'/>`).join('')
            ).join('');
            return `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='30' viewBox='0 0 60 30'><rect width='60' height='30' fill='%23F6F0EE'/>${circles}</svg>`;
        };
        const SEIGAIHA_WHITE_TILE_SVG = buildSeigaihaWhiteSvg();
        const SEIGAIHA_WHITE_BG_STYLE = {
            backgroundColor: '#F6F0EE',
            backgroundImage: `url("data:image/svg+xml,${SEIGAIHA_WHITE_TILE_SVG}")`,
            backgroundSize: '60px 30px',
            backgroundRepeat: 'repeat'
        };

        const Header = ({ cartCount, onOpenCart, onContactClick, onProductsClick, onLogoClick, searchResetKey }) => {
            const location = useLocation();
            const isProductsRoute = location.pathname === '/san-pham';
            const [isScrolled, setIsScrolled] = useState(false);
            const [isSearchFocused, setIsSearchFocused] = useState(false);
            const [hasSearchText, setHasSearchText] = useState(false);
            const mobileInputRef = useRef(null);

            useEffect(() => {
                let ticking = false;
                const handleScroll = () => {
                    if (!ticking) {
                        window.requestAnimationFrame(() => {
                            const y = window.scrollY;
                            setIsScrolled((prev) => {
                                if (y > 75) return true;   // Cuộn xuống qua 75px -> Thu gọn (chỉ trên Mobile)
                                if (y < 20) return false;  // Cuộn lên sát đỉnh < 20px -> Bung rộng lại
                                return prev;               // Giữ nguyên ở vùng đệm 20px - 75px để chống giật
                            });
                            ticking = false;
                        });
                        ticking = true;
                    }
                };
                window.addEventListener('scroll', handleScroll, { passive: true });
                return () => window.removeEventListener('scroll', handleScroll);
            }, []);

            // Chỉ thu gọn trên điện thoại khi cuộn xuống và không bấm vào ô tìm kiếm
            const isCompactMobile = isScrolled && !isSearchFocused && !hasSearchText;

            return (
                <header
                    className="sticky top-0 left-0 right-0 z-50 w-full bg-red-800 text-white backdrop-blur-xl border-b border-white/25 shadow-[0_8px_25px_rgba(153,27,27,0.35)]"
                    style={{ background: 'linear-gradient(90deg, rgba(153, 27, 27, 0.96) 0%, rgba(185, 28, 28, 0.94) 50%, rgba(153, 27, 27, 0.96) 100%)' }}
                >
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                        {/* Hàng 1: Chiều cao ổn định tuyệt đối trên mobile (h-14) và PC (md:h-20), chống giật layout 100% */}
                        <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">
                            {/* Cột 1: Logo (Giữ kích thước và vị trí ổn định, không giật ngang khi cuộn) */}
                            <div className="flex-shrink-0 md:flex-1 flex justify-start items-center min-w-0">
                                <a
                                    href="/"
                                    className="flex items-center cursor-pointer flex-shrink-0"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onLogoClick) onLogoClick(e);
                                    }}
                                >
                                    <img
                                        src="/logo_new.png"
                                        alt="Logo Hùng Thuận Tokcay"
                                        className="w-auto h-8 sm:h-9 md:h-12 lg:h-14 object-contain cursor-pointer drop-shadow-md flex-shrink-0"
                                    />
                                </a>
                            </div>

                            {/* Mobile Compact Search Capsule (Hiển thị mượt mà trên Điện thoại khi cuộn xuống) */}
                            <div
                                onClick={() => {
                                    setIsSearchFocused(true);
                                    setTimeout(() => {
                                        if (mobileInputRef.current) {
                                            mobileInputRef.current.focus();
                                        }
                                    }, 70);
                                }}
                                className={`md:hidden flex items-center min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer overflow-hidden ${
                                    isCompactMobile
                                        ? 'flex-1 mx-2 opacity-100 max-w-[420px] scale-100 pointer-events-auto'
                                        : 'w-0 max-w-0 mx-0 opacity-0 scale-90 pointer-events-none'
                                }`}
                            >
                                <div className="flex items-center w-full rounded-full bg-white/95 hover:bg-white text-gray-700 shadow-inner px-2.5 sm:px-3 py-1.5 border border-white/70 whitespace-nowrap min-w-0">
                                    <i className="fa-solid fa-magnifying-glass text-xs text-primary mr-1.5 sm:mr-2 flex-shrink-0"></i>
                                    <span className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">Tìm kiếm sản phẩm...</span>
                                </div>
                            </div>

                            {/* Cột 2: Desktop Search (Nằm chính giữa Header cân đối với 2 cột hai bên) */}
                            <div className="hidden md:flex md:flex-none md:w-[280px] lg:w-[410px] xl:w-[470px] justify-center items-center relative z-40 px-2 lg:px-4 min-w-0">
                                <div className="w-full">
                                    <LiveSearchBar resetKey={searchResetKey} />
                                </div>
                            </div>

                            {/* Cột 3: Navigation & Cart */}
                            <div className="flex-shrink-0 md:flex-1 flex justify-end items-center gap-1.5 sm:gap-2.5 lg:gap-3.5 min-w-0">
                                <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5 text-white font-semibold flex-shrink-0">
                                    <button type="button" onClick={onProductsClick} aria-current={isProductsRoute ? 'page' : undefined} className={`px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full border active:scale-95 transition-all duration-200 uppercase tracking-wide outline-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap drop-shadow-sm cursor-pointer flex-shrink-0 ${isProductsRoute ? 'bg-white/25 text-yellow-300 border-yellow-300/60 shadow-inner' : 'bg-white/10 hover:bg-white/20 border-white/20 hover:text-yellow-300'}`}>
                                        <i className="fa-solid fa-box-open text-[11px] lg:text-xs"></i>
                                        <span>Sản phẩm</span>
                                    </button>
                                    <button type="button" onClick={onContactClick} className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:text-yellow-300 active:scale-95 transition-all duration-200 uppercase tracking-wide outline-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap drop-shadow-sm cursor-pointer flex-shrink-0">
                                        <i className="fa-solid fa-headset text-[11px] lg:text-xs"></i>
                                        <span>Liên hệ</span>
                                    </button>
                                </nav>

                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                    <button
                                        onClick={onProductsClick}
                                        aria-current={isProductsRoute ? 'page' : undefined}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 text-sm rounded-full border backdrop-blur-md outline-none flex items-center justify-center md:hidden cursor-pointer flex-shrink-0 active:scale-95 transition-transform ${isProductsRoute ? 'bg-white/30 text-yellow-300 border-yellow-300/70 shadow-inner' : 'bg-white/15 hover:bg-white/25 border-white/30 text-white hover:text-yellow-300'}`}
                                        aria-label="Sản phẩm"
                                    >
                                        <i className="fa-solid fa-box-open"></i>
                                    </button>

                                    <button
                                        onClick={onContactClick}
                                        className="w-9 h-9 sm:w-10 sm:h-10 text-sm rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md text-white hover:text-yellow-300 outline-none flex items-center justify-center md:hidden cursor-pointer flex-shrink-0 active:scale-95 transition-transform"
                                        aria-label="Liên hệ"
                                    >
                                        <i className="fa-solid fa-headset"></i>
                                    </button>

                                    <button
                                        onClick={onOpenCart}
                                        className="relative w-9 h-9 sm:w-10 sm:h-10 text-sm md:w-11 md:h-11 md:text-xl rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md text-white hover:text-yellow-300 flex items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 transition-transform"
                                        aria-label={cartCount > 0 ? `Giỏ hàng (${cartCount} sản phẩm)` : 'Giỏ hàng'}
                                    >
                                        <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                                        {cartCount > 0 && (
                                            <span aria-hidden="true" className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold leading-none text-red-950 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full shadow-md border border-white pointer-events-none z-10">
                                                {cartCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Hàng 2: Mobile Search (Thu gọn & bung rộng mượt mà 60fps chuẩn chiều cao thực tế) */}
                        <div
                            className={`md:hidden relative z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                isCompactMobile
                                    ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden'
                                    : 'max-h-[58px] opacity-100 translate-y-0 pointer-events-auto overflow-visible'
                            }`}
                        >
                            <div className="pb-2.5 px-0.5">
                                <LiveSearchBar
                                    resetKey={searchResetKey}
                                    onFocusChange={setIsSearchFocused}
                                    onTextChange={setHasSearchText}
                                    inputRef={mobileInputRef}
                                />
                            </div>
                        </div>
                    </div>
                </header>
            );
        };

        const HeroBanner = ({ bannerMobileUrl, bannerDesktopUrl, settingsReady, isAdmin, onBannerMobileUpload, onBannerDesktopUpload }) => {
            const finalMobileBanner = bannerMobileUrl || "/hero-banner-mobile.jpg";
            const finalDesktopBanner = bannerDesktopUrl || "/hero-banner.jpg";

            return (
                <div className="relative w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mb-4 group">
                    {/* Thẻ chứa ảnh bo góc và tỏa sáng */}
                    <div className="relative w-full h-auto rounded-[2rem] shadow-[0_0_80px_-15px_rgba(220,38,38,0.4)] border border-red-200 overflow-hidden bg-white">
                        {/* Chưa nạp xong settings thì giữ chỗ đúng tỉ lệ, tránh tải ảnh mặc định thừa khi shop đã có banner riêng */}
                        {settingsReady === false ? (
                            <div className="w-full aspect-video bg-gradient-to-br from-white via-red-50/70 to-rose-100/60 animate-pulse" aria-hidden="true" />
                        ) : (
                            <picture>
                                <source media="(max-width: 767px)" srcSet={finalMobileBanner} />
                                <img
                                    src={finalDesktopBanner}
                                    className="w-full h-auto object-contain block"
                                    alt="Banner Hùng Thuận Tokcay - Nguyên liệu thực phẩm Hàn Quốc"
                                    width="1280"
                                    height="720"
                                    decoding="async"
                                    fetchpriority="high"
                                />
                            </picture>
                        )}

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

        const BackToTopButton = () => {
            const [visible, setVisible] = useState(false);

            useEffect(() => {
                const handleScroll = () => {
                    setVisible(window.scrollY > 360);
                };
                handleScroll();
                window.addEventListener('scroll', handleScroll, { passive: true });
                return () => window.removeEventListener('scroll', handleScroll);
            }, []);

            return (
                <div className={`fixed bottom-[92px] right-[30px] z-40 flex items-center gap-2 group transition-all duration-200 ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
                    <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#EED3AC] shadow-sm text-[11px] font-bold text-red-700 opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap">
                        Lên đầu trang
                    </span>
                    <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        aria-label="Lên đầu trang"
                        title="Lên đầu trang"
                        className="w-11 h-11 rounded-full bg-white/95 hover:bg-red-600 text-red-600 hover:text-white border border-[#EED3AC] hover:border-red-600 shadow-[0_6px_18px_rgba(185,28,28,0.14)] backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90 cursor-pointer"
                    >
                        <i className="fa-solid fa-chevron-up text-[9px] leading-none"></i>
                        <i className="fa-solid fa-house text-[13px] leading-none"></i>
                    </button>
                </div>
            );
        };

        const ZaloBubbleMark = ({ className = 'w-8 h-8', textColor = '#0068FF' }) => (
            <svg viewBox="0 0 36 32" className={className} aria-hidden="true">
                <path
                    fill="currentColor"
                    d="M18 2C9.16 2 2 8.04 2 15.5c0 4.02 2.08 7.62 5.38 10.08L5.8 30.2c-.22.64.42 1.22 1.02.92l5.3-2.65c1.84.62 3.82.97 5.88.97 8.84 0 16-6.04 16-13.5S26.84 2 18 2z"
                />
                <text x="18" y="18.8" textAnchor="middle" fill={textColor} fontSize="9" fontWeight="900" fontFamily="Inter, sans-serif">
                    Zalo
                </text>
            </svg>
        );

        const ZaloWidget = ({ zaloNumber }) => {
            const [isOpen, setIsOpen] = useState(false);
            const [copied, setCopied] = useState(false);
            const [qrFailed, setQrFailed] = useState(false);
            const widgetRef = useRef(null);
            const copyTimeoutRef = useRef(null);

            const zaloLink = getCleanZaloLink(zaloNumber);
            const cleanDigits = zaloLink.split('/').pop() || '0902631632';
            const displayPhone = cleanDigits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=6&data=${encodeURIComponent(zaloLink)}`;

            useEscapeToClose(isOpen, () => setIsOpen(false));

            useEffect(() => {
                if (!isOpen) return;
                const handleClickOutside = (e) => {
                    if (widgetRef.current && !widgetRef.current.contains(e.target)) {
                        setIsOpen(false);
                    }
                };
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('touchstart', handleClickOutside);
                return () => {
                    document.removeEventListener('mousedown', handleClickOutside);
                    document.removeEventListener('touchstart', handleClickOutside);
                };
            }, [isOpen]);

            useEffect(() => {
                return () => {
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                };
            }, []);

            const handleCopyPhone = async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(cleanDigits);
                    } else {
                        const input = document.createElement('input');
                        input.value = cleanDigits;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                    }
                    setCopied(true);
                    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
                } catch {
                    window.prompt('Sao chép số Zalo của shop:', cleanDigits);
                }
            };

            return (
                <div ref={widgetRef}>
                    {isOpen && (
                        <div
                            role="dialog"
                            aria-label="Hỗ trợ nhanh qua Zalo"
                            className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] max-w-[330px] animate-zalo-pop"
                        >
                            <div className="rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl border border-[#CFE2FF] shadow-[0_20px_48px_rgba(0,78,196,0.22),0_4px_16px_rgba(0,0,0,0.08)]">
                                {/* Header xanh Zalo */}
                                <div className="bg-gradient-to-r from-[#0068FF] via-[#007BFF] to-[#0052CC] text-white px-4 py-3 flex items-center justify-between gap-2 relative overflow-hidden">
                                    <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10"></div>
                                    <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                                        <div className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                                            <ZaloBubbleMark className="w-6 h-6 text-[#0068FF]" textColor="#FFFFFF" />
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0068FF]"></span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-sm leading-tight truncate">Hùng Thuận Tokcay</p>
                                            <p className="text-[11px] text-blue-100 flex items-center gap-1 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block"></span>
                                                Tư vấn sỉ & lẻ • Trả lời nhanh
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Đóng cửa sổ Zalo"
                                        className="relative z-10 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer flex-shrink-0"
                                    >
                                        <i className="fa-solid fa-xmark text-sm"></i>
                                    </button>
                                </div>

                                {/* Nội dung & QR + Copy SĐT */}
                                <div className="bg-[#FAF0E6]/75 px-4 py-3.5 space-y-3">
                                    <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm border border-[#EED3AC]/70 text-xs text-stone-700 leading-relaxed">
                                        Xin chào! Bạn cần báo giá sỉ/thùng, hỏi tồn kho hay lên đơn nhanh? Nhắn Zalo hoặc gọi trực tiếp cho shop nhé!
                                    </div>

                                    <div className="bg-white rounded-xl p-2.5 border border-[#EED3AC]/70 shadow-sm flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Hotline / Zalo</p>
                                            <p className="text-sm font-extrabold text-stone-800 tracking-tight mt-0.5">{displayPhone}</p>
                                            <button
                                                type="button"
                                                onClick={handleCopyPhone}
                                                className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${copied
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-blue-50 text-[#0068FF] hover:bg-blue-100 border border-blue-200/70'}`}
                                            >
                                                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                                                <span>{copied ? 'Đã sao chép SĐT' : 'Sao chép SĐT'}</span>
                                            </button>
                                        </div>
                                        {!qrFailed && (
                                            <div className="flex flex-col items-center flex-shrink-0">
                                                <img
                                                    src={qrUrl}
                                                    alt={`Mã QR Zalo ${displayPhone}`}
                                                    onError={() => setQrFailed(true)}
                                                    className="w-16 h-16 rounded-lg border border-stone-200 bg-white p-0.5 object-contain"
                                                />
                                                <span className="text-[9px] font-semibold text-stone-400 mt-0.5">Quét QR Zalo</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Nút hành động */}
                                <div className="px-4 pb-3.5 pt-0.5 bg-[#FAF0E6]/75 flex flex-col gap-2">
                                    <a
                                        href={zaloLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setIsOpen(false)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#0052CC] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-[0_6px_18px_rgba(0,104,255,0.32)] flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <i className="fa-solid fa-comment-dots text-sm"></i>
                                        <span>Mở khung chat Zalo ngay</span>
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[11px] opacity-90"></i>
                                    </a>
                                    <a
                                        href={`tel:${cleanDigits}`}
                                        className="w-full py-2 px-4 rounded-xl bg-white hover:bg-red-50 border border-[#EED3AC] text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <i className="fa-solid fa-phone text-[11px]"></i>
                                        <span>Gọi điện ngay ({displayPhone})</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nút Zalo nổi trang trí & hiệu ứng sóng lan tỏa */}
                    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 group">
                        {!isOpen && (
                            <button
                                type="button"
                                onClick={() => setIsOpen(true)}
                                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#CFE2FF] shadow-[0_6px_20px_rgba(0,104,255,0.16)] text-xs font-extrabold text-[#0068FF] opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-200 cursor-pointer whitespace-nowrap"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Chat Zalo ngay
                            </button>
                        )}

                        <div className="relative flex items-center justify-center">
                            {!isOpen && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 rounded-full bg-[#0068FF]/35 animate-zalo-ripple"
                                    ></span>
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 rounded-full bg-[#0068FF]/25 animate-zalo-ripple"
                                        style={{ animationDelay: '1.2s' }}
                                    ></span>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsOpen(prev => !prev)}
                                aria-label={isOpen ? 'Đóng cửa sổ Zalo' : 'Mở chat nhanh qua Zalo'}
                                aria-expanded={isOpen}
                                className={`relative w-14 h-14 rounded-full ring-4 ring-white/85 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer border border-white/80 ${isOpen
                                    ? 'bg-gradient-to-br from-stone-700 to-stone-900 shadow-[0_10px_24px_rgba(0,0,0,0.28)]'
                                    : 'bg-gradient-to-br from-[#0088FF] via-[#0068FF] to-[#004EC4] shadow-[0_10px_28px_rgba(0,104,255,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]'}`}
                            >
                                {isOpen ? (
                                    <i className="fa-solid fa-xmark text-white text-xl transition-transform duration-200"></i>
                                ) : (
                                    <ZaloBubbleMark className="w-8 h-8 text-white animate-zalo-wiggle drop-shadow-sm" textColor="#0068FF" />
                                )}

                                {!isOpen && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm"
                                    ></span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const ContactModal = ({ isOpen, onClose, settings }) => {
            const [copiedPhone, setCopiedPhone] = useState(false);
            const copyPhoneTimerRef = useRef(null);

            useEscapeToClose(isOpen, onClose);

            useEffect(() => {
                return () => {
                    if (copyPhoneTimerRef.current) clearTimeout(copyPhoneTimerRef.current);
                };
            }, []);

            if (!isOpen) return null;

            // Các link mặc định theo yêu cầu
            const defaultFb = "https://www.facebook.com/share/18g7FWfpAP/";
            const defaultMaps = "https://maps.app.goo.gl/7XXZpNfJ3nQ6UUia6";
            const defaultZalo = "0902631632";

            const fbLink = sanitizeHttpUrl(settings?.facebook_url, defaultFb);
            const mapsLink = sanitizeHttpUrl(settings?.maps_url, defaultMaps);
            const zaloLink = getCleanZaloLink(settings?.link_zalo || settings?.zalo_number || defaultZalo);
            const cleanDigits = zaloLink.split('/').pop() || defaultZalo;
            const displayPhone = cleanDigits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');

            const handleCopyHotline = async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(cleanDigits);
                    } else {
                        const input = document.createElement('input');
                        input.value = cleanDigits;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand('copy');
                        document.body.removeChild(input);
                    }
                    setCopiedPhone(true);
                    if (copyPhoneTimerRef.current) clearTimeout(copyPhoneTimerRef.current);
                    copyPhoneTimerRef.current = setTimeout(() => setCopiedPhone(false), 2000);
                } catch {
                    window.prompt('Sao chép số hotline / Zalo:', cleanDigits);
                }
            };

            return (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center modal-overlay p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Liên hệ với chúng tôi"
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FAF0E6] border-2 border-[#E6C27E] shadow-[0_24px_60px_rgba(127,29,29,0.34),0_6px_18px_rgba(0,0,0,0.14)] animate-fade-in relative"
                    >
                        {/* Header họa tiết Seigaiha đỏ & viền vàng đồng bộ thương hiệu */}
                        <div className="relative px-5 py-5 sm:px-6 text-white overflow-hidden border-b-2 border-[#E6C27E]/85" style={SEIGAIHA_CRIMSON_STYLE}>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#7f1d1d]/85 via-[#991b1b]/60 to-[#7f1d1d]/85"></div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Đóng cửa sổ liên hệ"
                                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 border border-[#E6C27E]/60 text-white flex items-center justify-center transition-all duration-200 hover:rotate-90 cursor-pointer backdrop-blur-sm"
                            >
                                <i className="fa-solid fa-xmark text-base"></i>
                            </button>
                            <div className="relative z-10 pr-10">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 border border-[#E6C27E]/65 text-[10px] font-bold tracking-wider uppercase text-[#FDE68A] mb-2">
                                    <BlossomIcon className="w-3 h-3" petalColor="#FFFFFF" centerColor="#FDE047" />
                                    <span>Hùng Thuận Tokcay Korea Foods</span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide drop-shadow-sm">
                                    Liên Hệ Với Chúng Tôi
                                </h3>
                                <p className="text-xs text-red-100/95 mt-0.5">
                                    Báo giá sỉ/lẻ nguyên liệu Hàn Quốc & giao nhanh Cần Thơ – ĐBSCL
                                </p>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Thẻ thông tin cửa hàng */}
                            <div className="rounded-2xl bg-white/95 border border-[#EED3AC] shadow-sm divide-y divide-[#FAF0E6] text-xs sm:text-sm text-stone-700">
                                <div className="flex items-center justify-between gap-2.5 p-3">
                                    <a href={`tel:${cleanDigits}`} className="flex items-center gap-3 min-w-0 group">
                                        <span className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            <i className="fa-solid fa-phone text-xs"></i>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Hotline / Sỉ & Lẻ</p>
                                            <p className="font-extrabold text-stone-800 group-hover:text-red-700 transition-colors">{displayPhone}</p>
                                        </div>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleCopyHotline}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-all cursor-pointer ${copiedPhone
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-[#FAF0E6] text-red-700 hover:bg-red-50 border border-[#EED3AC]'}`}
                                    >
                                        <i className={`fa-solid ${copiedPhone ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                                        <span>{copiedPhone ? 'Đã chép' : 'Sao chép'}</span>
                                    </button>
                                </div>

                                <div className="flex items-start gap-3 p-3">
                                    <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                                        <i className="fa-solid fa-location-dot text-xs"></i>
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Địa chỉ kho hàng</p>
                                        <p className="text-stone-700 font-medium leading-snug">92B5, KDC Hưng Phú 1, KV9, P. Hưng Phú, TP. Cần Thơ</p>
                                    </div>
                                </div>

                                <a href="mailto:hungthuanfood@gmail.com" className="flex items-center gap-3 p-3 hover:bg-red-50/40 rounded-b-2xl transition-colors group">
                                    <span className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                        <i className="fa-solid fa-envelope text-xs"></i>
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Email</p>
                                        <p className="text-stone-700 font-medium truncate group-hover:text-sky-700">hungthuanfood@gmail.com</p>
                                    </div>
                                </a>
                            </div>

                            {/* Kênh kết nối nhanh */}
                            <div className="space-y-2.5">
                                <a
                                    href={zaloLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-2xl text-white bg-gradient-to-r from-[#007BFF] to-[#0052CC] hover:brightness-110 shadow-[0_8px_20px_rgba(0,104,255,0.28)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <ZaloBubbleMark className="w-6 h-6 text-[#0068FF]" textColor="#FFFFFF" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-sm sm:text-base leading-tight">Chat Zalo ngay</p>
                                            <p className="text-[11px] text-blue-100 truncate">Nhắn đặt hàng & nhận báo giá sỉ/thùng</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-85 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0"></i>
                                </a>

                                <a
                                    href={fbLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-2xl text-white bg-gradient-to-r from-[#1877F2] to-[#0F5CC0] hover:brightness-110 shadow-[0_8px_20px_rgba(24,119,242,0.24)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
                                            <i className="fa-brands fa-facebook-f text-lg text-white"></i>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-sm sm:text-base leading-tight">Trang Facebook</p>
                                            <p className="text-[11px] text-blue-100 truncate">Theo dõi hàng mới & tin ưu đãi</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs opacity-85 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0"></i>
                                </a>

                                <a
                                    href={mapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-2xl text-stone-800 bg-white/95 hover:bg-emerald-50/70 border border-[#EED3AC] hover:border-emerald-300 shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                            <i className="fa-solid fa-map-location-dot text-lg"></i>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-sm sm:text-base leading-tight text-stone-800">Bản đồ Google Maps</p>
                                            <p className="text-[11px] text-stone-500 truncate">Chỉ đường đến kho Cần Thơ</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const CartSlideOver = ({ isOpen, onClose, cart, setCart, zaloNumber }) => {
            const [checkoutCopied, setCheckoutCopied] = useState(false);
            useEscapeToClose(isOpen, onClose);

            useEffect(() => {
                if (!isOpen) setCheckoutCopied(false);
            }, [isOpen]);

            const updateQuantity = (id, newQty) => {
                if (newQty < 1) {
                    setCart(cart.filter(item => item.id !== id));
                } else {
                    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
                }
            };
            const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

            const handleCheckout = async () => {
                if (cart.length === 0) return;
                let message = "Xin chào shop, tôi muốn đặt hàng:\n";
                cart.forEach((item, index) => {
                    message += `${index + 1}. ${item.name} - SL: ${item.qty} x ${formatVND(item.price)} = ${formatVND(item.price * item.qty)}\n`;
                });
                message += `Tổng tạm tính: ${formatVND(total)}`;

                const rawZalo = String(zaloNumber || '0902631632').replace(/^https?:\/\/(www\.)?zalo\.me\//i, '').replace(/[^\d]/g, '').trim();
                const cleanZalo = rawZalo || '0902631632';

                // Zalo không hỗ trợ điền sẵn nội dung qua ?text=, nên mở chat trước rồi copy đơn vào clipboard
                window.open(`https://zalo.me/${cleanZalo}`, '_blank', 'noopener,noreferrer');
                try {
                    await navigator.clipboard.writeText(message);
                    setCheckoutCopied(true);
                    setTimeout(() => setCheckoutCopied(false), 6000);
                } catch (err) {
                    window.prompt('Sao chép nội dung đơn hàng bên dưới rồi dán vào Zalo:', message);
                }
            };

            return (
                <div className={`fixed inset-0 z-[60] transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" onClick={onClose}></div>
                    <div role="dialog" aria-modal="true" aria-label="Giỏ hàng" className={`fixed inset-y-0 right-0 max-w-md w-full bg-white/85 backdrop-blur-2xl border-l border-white/80 shadow-2xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
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
                            <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                                <p>Tổng tiền:</p>
                                <p className="text-red-700 text-xl">{formatVND(total)}</p>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-700/25 active:scale-[0.99] flex items-center justify-center gap-2"
                                disabled={cart.length === 0}
                            >
                                <i className="fa-solid fa-comment-dots"></i>
                                Đặt hàng qua Zalo
                            </button>
                            <p className={`mt-2.5 text-center text-[11px] leading-relaxed transition-colors ${checkoutCopied ? 'text-emerald-700 font-semibold' : 'text-stone-500'}`}>
                                {checkoutCopied
                                    ? '✅ Đã sao chép đơn hàng — chỉ cần dán (Ctrl+V) vào khung chat Zalo để gửi shop.'
                                    : 'Nội dung đơn hàng sẽ được sao chép sẵn để bạn dán vào Zalo.'}
                            </p>
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

            const drawWatermark = (ctx, width, height, bottomY) => {
                const fontSize = Math.max(16, Math.round(width * 0.052));
                ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const text = 'www.tokcayfood.com';
                const x = width / 2;
                const marginInside = height * 0.035;
                const watermarkY = Math.min(height - 12, Math.max(fontSize + 12, bottomY - marginInside));

                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = fontSize * 0.25;
                ctx.lineJoin = 'round';
                ctx.strokeText(text, x, watermarkY);

                ctx.fillStyle = '#b91c1c';
                ctx.fillText(text, x, watermarkY);
            };

            const getImageSourceBlob = async () => {
                if (processedImage) return processedImage;
                if (rawImage) return rawImage;
                const targetUrl = previewUrl || imageUrl;
                if (!targetUrl) return null;
                try {
                    const res = await fetch(targetUrl);
                    return await res.blob();
                } catch (e) {
                    return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth || img.width;
                            canvas.height = img.naturalHeight || img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
                        };
                        img.onerror = () => reject(new Error('Không thể tải ảnh.'));
                        img.src = targetUrl;
                    });
                }
            };

            const compressImageBeforeAI = (blobOrFile, maxWidth = 1000, maxHeight = 1000) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blobOrFile);
                    reader.onload = (event) => {
                        const img = new Image();
                        img.src = event.target.result;
                        img.onload = () => {
                            let width = img.width;
                            let height = img.height;
                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            canvas.toBlob((blob) => {
                                resolve(blob);
                            }, 'image/jpeg', 0.9);
                        };
                        img.onerror = reject;
                    };
                    reader.onerror = reject;
                });
            };

            const handleProcessImage = async () => {
                const sourceBlob = await getImageSourceBlob();
                if (!sourceBlob) {
                    alert('Vui lòng chọn ảnh hoặc dán link ảnh trước khi xử lý!');
                    return;
                }
                if (cancelRef) cancelRef.current = false;
                setIsProcessing(true);
                try {
                    const compressedBlob = await compressImageBeforeAI(sourceBlob);
                    if (cancelRef && cancelRef.current) return;

                    let bgRemovedBlob = null;
                    try {
                        const { removeBackground } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
                        if (cancelRef && cancelRef.current) return;

                        const removalPromise = removeBackground(compressedBlob, {
                            model: 'isnet_quint8',
                            publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
                            debug: false
                        });
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 25000)
                        );
                        bgRemovedBlob = await Promise.race([removalPromise, timeoutPromise]);
                    } catch (removalErr) {
                        console.warn('AI tách nền không khả dụng trên thiết bị/mạng hiện tại, tự động chuyển sang chế độ căn chuẩn 1:1 và đóng mộc Tokcay:', removalErr);
                    }

                    if (cancelRef && cancelRef.current) return;

                    const activeBlob = bgRemovedBlob || compressedBlob;
                    const img = new Image();
                    img.src = URL.createObjectURL(activeBlob);
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    if (cancelRef && cancelRef.current) return;

                    const size = Math.max(img.width, img.height);
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    // Pure white background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, size, size);

                    // Center product
                    const offsetX = (size - img.width) / 2;
                    const offsetY = (size - img.height) / 2;
                    ctx.drawImage(img, offsetX, offsetY, img.width, img.height);

                    const productBottomY = bgRemovedBlob ? getProductBottomY(ctx, size, size) : size;
                    drawWatermark(ctx, size, size, productBottomY);

                    canvas.toBlob((blob) => {
                        if (cancelRef && cancelRef.current) return;
                        setProcessedImage(blob);
                        onFileChange(blob); // Pass processed blob up
                        setIsProcessing(false);
                    }, 'image/webp', 0.85);

                    URL.revokeObjectURL(img.src);
                } catch (error) {
                    if (cancelRef && cancelRef.current) return;
                    console.error('Processing error:', error);
                    alert('Lỗi xử lý ảnh: ' + error.message);
                    setIsProcessing(false);
                }
            };

            const hasImage = Boolean(rawImage || processedImage || previewUrl || imageUrl);

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
                                    disabled={!hasImage || isProcessing}
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


        const AdminProductModal = ({ isOpen, onClose, product, onSave, uniqueTags, products = [], onSwitchToEdit }) => {
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

            useEscapeToClose(isOpen, handleClose);

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

            // Bộ lọc thông minh phát hiện sản phẩm trùng / gần giống khi thêm hoặc sửa
            const duplicateAnalysis = useMemo(() => {
                if (!isOpen || !Array.isArray(products) || products.length === 0) {
                    return { exactMatches: [], similarMatches: [] };
                }

                const currentNameSlug = generateSlug(formData.name || '');
                const currentSlug = (formData.slug || '').trim().toLowerCase();
                if (!currentNameSlug && !currentSlug) {
                    return { exactMatches: [], similarMatches: [] };
                }

                const nameTokens = currentNameSlug.split('-').filter(t => t.length >= 2);
                const exactMatches = [];
                const similarCandidates = [];

                for (const item of products) {
                    if (product && item.id === product.id) continue;

                    const itemNameSlug = generateSlug(item.name || '');
                    const itemSlug = (item.slug || '').trim().toLowerCase();

                    const isExactName = Boolean(currentNameSlug && itemNameSlug && currentNameSlug === itemNameSlug);
                    const isExactSlug = Boolean(currentSlug && itemSlug && currentSlug === itemSlug);

                    if (isExactName || isExactSlug) {
                        exactMatches.push({
                            ...item,
                            matchReason: isExactName ? 'Trùng tên sản phẩm' : 'Trùng đường dẫn URL (slug)'
                        });
                        continue;
                    }

                    if (currentNameSlug.length < 4 || !itemNameSlug) continue;

                    const itemTokens = itemNameSlug.split('-').filter(t => t.length >= 2);
                    const overlapCount = nameTokens.filter(t => itemTokens.includes(t)).length;
                    const minTokenLen = Math.min(nameTokens.length, itemTokens.length);
                    const maxTokenLen = Math.max(nameTokens.length, itemTokens.length);

                    let score = 0;
                    if (itemNameSlug.includes(currentNameSlug) || (itemNameSlug.length >= 4 && currentNameSlug.includes(itemNameSlug))) {
                        score = 0.9;
                    } else if (nameTokens.length >= 2 && overlapCount >= Math.max(2, Math.ceil(minTokenLen * 0.65))) {
                        score = maxTokenLen > 0 ? overlapCount / maxTokenLen : 0;
                    }

                    if (score > 0) {
                        similarCandidates.push({ item, score });
                    }
                }

                similarCandidates.sort((a, b) => b.score - a.score);
                return {
                    exactMatches,
                    similarMatches: similarCandidates.slice(0, 5).map(entry => entry.item)
                };
            }, [isOpen, products, product, formData.name, formData.slug]);

            if (!isOpen) return null;

            const getImageInlineData = async (source) => {
                if (source instanceof Blob || source instanceof File) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const result = reader.result || '';
                            const commaIndex = result.indexOf(',');
                            const base64data = commaIndex !== -1 ? result.slice(commaIndex + 1) : result;
                            resolve({
                                inlineData: {
                                    data: base64data,
                                    mimeType: source.type || 'image/jpeg'
                                }
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(source);
                    });
                }
                if (typeof source === 'string') {
                    if (source.startsWith('data:')) {
                        const commaIdx = source.indexOf(',');
                        const meta = source.slice(0, commaIdx);
                        const data = source.slice(commaIdx + 1);
                        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/jpeg';
                        return { inlineData: { data, mimeType } };
                    }
                    try {
                        const response = await fetch(source);
                        const blob = await response.blob();
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const result = reader.result || '';
                                const commaIndex = result.indexOf(',');
                                const base64data = commaIndex !== -1 ? result.slice(commaIndex + 1) : result;
                                resolve({
                                    inlineData: {
                                        data: base64data,
                                        mimeType: blob.type || 'image/jpeg'
                                    }
                                });
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (fetchErr) {
                        return new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth || img.width;
                                canvas.height = img.naturalHeight || img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                                const base64 = dataUrl.split(',')[1];
                                resolve({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
                            };
                            img.onerror = () => reject(new Error('Không thể tải ảnh qua URL do chính sách bảo mật (CORS). Vui lòng chọn ảnh trực tiếp từ máy tính.'));
                            img.src = source;
                        });
                    }
                }
                throw new Error('Định dạng ảnh không hợp lệ.');
            };

            const generateDescriptionFromImage = async () => {
                const imageSource = selectedFile || formData.image_url;
                if (!imageSource) {
                    alert("Chưa có ảnh! Vui lòng chọn ảnh từ máy hoặc dán link ảnh trước khi dùng AI phân tích.");
                    return;
                }
                setIsGenerating(true);
                try {
                    const imagePart = await getImageInlineData(imageSource);

                    // Toàn bộ logic gọi AI được đóng gói hoàn toàn trên Serverless Backend (/api/generate-description)
                    // Tuyệt đối không để lộ Gemini API Key ra trình duyệt web hay mã nguồn client
                    const apiRes = await fetch('/api/generate-description', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageBase64: imagePart.inlineData.data,
                            mimeType: imagePart.inlineData.mimeType
                        })
                    });

                    const contentType = apiRes.headers.get('content-type') || '';
                    if (!apiRes.ok || !contentType.includes('application/json')) {
                        const errData = await apiRes.json().catch(() => null);
                        throw new Error(errData?.error || `Lỗi kết nối máy chủ (${apiRes.status})`);
                    }

                    const apiData = await apiRes.json();
                    if (!apiData.text) {
                        throw new Error(apiData.error || "Không nhận được phản hồi từ AI.");
                    }

                    setFormData(prev => ({ ...prev, description: apiData.text }));
                } catch (error) {
                    console.error("AI Error:", error);
                    alert("Lỗi AI: " + error.message);
                } finally {
                    setIsGenerating(false);
                }
            };

            const handleSubmit = async (e) => {
                e.preventDefault();
                if (uploading || isProcessing) return;

                if (duplicateAnalysis.exactMatches.length > 0) {
                    const matched = duplicateAnalysis.exactMatches[0];
                    const cleanCurrentSlug = (formData.slug || '').trim().toLowerCase();
                    const matchedSlug = (matched.slug || '').trim().toLowerCase();

                    if (cleanCurrentSlug && matchedSlug && cleanCurrentSlug === matchedSlug) {
                        alert(`Đường dẫn URL (slug) "${cleanCurrentSlug}" đã thuộc về sản phẩm "${matched.name}". Vui lòng chuyển sang sửa sản phẩm đó hoặc đổi tên/slug khác để tránh trùng lặp!`);
                        return;
                    }

                    const proceed = window.confirm(
                        `Phát hiện sản phẩm đã có trong kho:\n- "${matched.name}" (Giá: ${formatVND(matched.price)}${matched.is_hidden ? ', Đang ẩn' : ''})\n\nBạn có chắc vẫn muốn lưu thêm một sản phẩm trùng tên nữa không?`
                    );
                    if (!proceed) return;
                }

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
                    <div role="dialog" aria-modal="true" aria-label={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                            <button type="button" onClick={handleClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <form id="admin-product-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto hide-scroll flex-1">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên sản phẩm *</label>
                                <input
                                    required
                                    type="text"
                                    className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:border-transparent outline-none transition-all ${duplicateAnalysis.exactMatches.length > 0 ? 'border-red-400 bg-red-50/30 focus:ring-red-400' : 'border-gray-300 focus:ring-primary'}`}
                                    value={formData.name}
                                    onChange={e => {
                                        const newName = e.target.value;
                                        setFormData(prev => {
                                            if (!product || prev.slug === '') {
                                                return { ...prev, name: newName, slug: generateSlug(newName) };
                                            }
                                            return { ...prev, name: newName };
                                        });
                                    }}
                                />
                                {(duplicateAnalysis.exactMatches.length > 0 || duplicateAnalysis.similarMatches.length > 0) && (() => {
                                    const isExact = duplicateAnalysis.exactMatches.length > 0;
                                    const matchedList = isExact ? duplicateAnalysis.exactMatches : duplicateAnalysis.similarMatches;
                                    return (
                                        <div
                                            role="status"
                                            className={`mt-2.5 rounded-xl border p-3 space-y-2 ${isExact ? 'bg-red-50/90 border-red-300 text-red-900' : 'bg-amber-50/85 border-amber-200 text-amber-900'}`}
                                        >
                                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                                <span className="flex items-center gap-1.5">
                                                    <i className={`fa-solid ${isExact ? 'fa-triangle-exclamation text-red-600' : 'fa-magnifying-glass text-amber-600'}`}></i>
                                                    {isExact
                                                        ? 'Sản phẩm này đã có trong kho! Tránh thêm trùng:'
                                                        : `Có ${matchedList.length} sản phẩm tên gần giống đã tồn tại:`}
                                                </span>
                                            </div>
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
                                                {matchedList.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between gap-2.5 bg-white/95 rounded-lg p-2 border border-stone-200/80 shadow-xs">
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <img
                                                                src={item.image_url || FallbackImage}
                                                                onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                                                alt={item.name}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="w-9 h-9 rounded-md object-cover border border-stone-200 flex-shrink-0"
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-stone-800 truncate" title={item.name}>{item.name}</p>
                                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                                                                    <span className="font-bold text-red-600">{formatVND(item.price)}</span>
                                                                    {item.matchReason && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-[10px]">
                                                                            {item.matchReason}
                                                                        </span>
                                                                    )}
                                                                    {item.is_hidden && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold text-[10px]">
                                                                            Đang ẩn
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {onSwitchToEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onSwitchToEdit(item)}
                                                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold whitespace-nowrap flex-shrink-0 shadow-xs transition-colors cursor-pointer"
                                                            >
                                                                Chuyển sang sửa
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
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
                            <button type="submit" form="admin-product-form" disabled={uploading || isProcessing} className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primaryDark shadow-md transition-colors disabled:opacity-50">
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

            useEscapeToClose(isOpen, onClose);

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
                    <div role="dialog" aria-modal="true" aria-label="Cài đặt chung" className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
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

        const TagsSlider = ({ uniqueTags, selectedTags = [], onTagToggle, isAdmin, onManageTags }) => {
            const sliderRef = useRef(null);
            const [canScrollLeft, setCanScrollLeft] = useState(false);
            const [canScrollRight, setCanScrollRight] = useState(false);

            const updateScrollEdges = () => {
                const el = sliderRef.current;
                if (!el || window.innerWidth < 768) {
                    setCanScrollLeft(false);
                    setCanScrollRight(false);
                    return;
                }
                const maxScroll = el.scrollWidth - el.clientWidth;
                setCanScrollLeft(el.scrollLeft > 4);
                setCanScrollRight(maxScroll - el.scrollLeft > 4);
            };

            const scrollLeft = () => {
                if (sliderRef.current) sliderRef.current.scrollBy({ left: -240, behavior: 'smooth' });
            };
            const scrollRight = () => {
                if (sliderRef.current) sliderRef.current.scrollBy({ left: 240, behavior: 'smooth' });
            };

            useEffect(() => {
                updateScrollEdges();
                const el = sliderRef.current;
                if (!el) return;
                const handleNativeWheel = (e) => {
                    if (window.innerWidth >= 768 && e.deltaY !== 0) {
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                    }
                };
                el.addEventListener('wheel', handleNativeWheel, { passive: false });
                el.addEventListener('scroll', updateScrollEdges, { passive: true });
                window.addEventListener('resize', updateScrollEdges, { passive: true });
                return () => {
                    el.removeEventListener('wheel', handleNativeWheel);
                    el.removeEventListener('scroll', updateScrollEdges);
                    window.removeEventListener('resize', updateScrollEdges);
                };
            }, [uniqueTags]);

            const handleWheel = (e) => {
                if (window.innerWidth >= 768 && e.deltaY !== 0 && sliderRef.current && !e.defaultPrevented) {
                    sliderRef.current.scrollLeft += e.deltaY;
                }
            };

            const maskGradient = canScrollLeft && canScrollRight
                ? 'linear-gradient(to right, transparent 0%, black 22px, black calc(100% - 22px), transparent 100%)'
                : canScrollLeft
                    ? 'linear-gradient(to right, transparent 0%, black 22px, black 100%)'
                    : canScrollRight
                        ? 'linear-gradient(to right, black 0%, black calc(100% - 22px), transparent 100%)'
                        : undefined;

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
                    <div className="flex items-center justify-center gap-2.5 sm:gap-4 mb-3.5 px-2">
                        <div className="flex items-center flex-1 max-w-[52px] sm:max-w-[190px]">
                            <span className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-red-600/75 to-red-600"></span>
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 18 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                className="w-[16px] h-[11px] -ml-px flex-shrink-0 text-red-600"
                            >
                                <path d="M0.8 6 L9 1.6 L16.6 6 L9 10.4 Z" />
                            </svg>
                        </div>
                        <h3 className="inline-flex items-center justify-center gap-2 text-base sm:text-xl md:text-2xl font-extrabold text-center text-red-700 uppercase tracking-wide drop-shadow-xs whitespace-nowrap">
                            <BlossomIcon className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 drop-shadow-sm" petalColor="#DC2626" centerColor="#FFFFFF" />
                            <span>DANH MỤC SẢN PHẨM</span>
                        </h3>
                        <div className="flex items-center flex-1 max-w-[52px] sm:max-w-[190px]">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 18 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                className="w-[16px] h-[11px] -mr-px flex-shrink-0 text-red-600 -scale-x-100"
                            >
                                <path d="M0.8 6 L9 1.6 L16.6 6 L9 10.4 Z" />
                            </svg>
                            <span className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-red-600/75 to-red-600"></span>
                        </div>
                    </div>
                    <div className="relative rounded-2xl md:rounded-full p-2.5 md:p-1.5 bg-gradient-to-b from-white/95 to-[#FFF7EC]/90 backdrop-blur-md border border-[#EED3AC] shadow-[0_6px_22px_rgba(185,28,28,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] w-full max-w-full overflow-hidden md:flex md:items-center md:gap-1.5 box-border">
                        <button
                            type="button"
                            onClick={scrollLeft}
                            disabled={!canScrollLeft}
                            aria-label="Cuộn sang trái"
                            className={`hidden md:flex flex-shrink-0 w-9 h-9 rounded-full items-center justify-center border transition-all duration-200 z-10 ${canScrollLeft ? 'bg-white text-stone-700 border-[#EED3AC]/90 shadow-[0_3px_10px_rgba(185,28,28,0.1)] hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_6px_14px_rgba(220,38,38,0.28)] active:scale-90 cursor-pointer' : 'bg-white/50 text-stone-300 border-stone-200/60 cursor-default'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"/></svg>
                        </button>

                        <div
                            ref={sliderRef}
                            onWheel={handleWheel}
                            style={maskGradient ? { maskImage: maskGradient, WebkitMaskImage: maskGradient } : undefined}
                            className="grid grid-cols-2 gap-2 w-full md:flex md:flex-1 md:min-w-0 md:flex-nowrap md:items-center md:justify-start md:overflow-x-auto no-scrollbar md:scroll-smooth md:py-0.5 md:px-1 md:snap-x md:snap-mandatory"
                        >
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={onManageTags}
                                    className="col-span-2 md:col-span-1 w-full md:w-auto md:flex-shrink-0 md:snap-start whitespace-nowrap flex items-center justify-center text-center font-semibold border rounded-xl md:rounded-full transition-all duration-200 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm bg-yellow-100/90 text-yellow-800 border-yellow-300 hover:bg-yellow-200 backdrop-blur-sm cursor-pointer mb-1 md:mb-0"
                                >
                                    <i className="fa-solid fa-gear mr-1"></i> Quản lý
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => onTagToggle('')}
                                title="Tất cả sản phẩm"
                                className={`w-full md:w-auto md:flex-shrink-0 md:snap-start truncate flex items-center justify-center text-center px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl md:rounded-full font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${selectedTags.length === 0 ? 'text-white bg-red-600 shadow-[0_4px_14px_rgba(220,38,38,0.32)] border border-red-400/40' : 'bg-white/95 hover:bg-red-50/90 text-stone-700 hover:text-red-700 border border-stone-200/80 hover:border-red-200 shadow-xs hover:-translate-y-0.5'}`}
                                style={selectedTags.length === 0 ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96) 0%, rgba(185, 28, 28, 0.96) 100%)' } : undefined}
                            >
                                Tất cả sản phẩm
                            </button>
                            {uniqueTags.map(tag => {
                                const isActive = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => onTagToggle(tag)}
                                        title={tag}
                                        className={`w-full md:w-auto md:flex-shrink-0 md:snap-start truncate flex items-center justify-center text-center px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl md:rounded-full font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${isActive ? 'text-white bg-red-600 shadow-[0_4px_14px_rgba(220,38,38,0.32)] border border-red-400/40' : 'bg-white/95 hover:bg-red-50/90 text-stone-700 hover:text-red-700 border border-stone-200/80 hover:border-red-200 shadow-xs hover:-translate-y-0.5'}`}
                                        style={isActive ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96) 0%, rgba(185, 28, 28, 0.96) 100%)' } : undefined}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={scrollRight}
                            disabled={!canScrollRight}
                            aria-label="Cuộn sang phải"
                            className={`hidden md:flex flex-shrink-0 w-9 h-9 rounded-full items-center justify-center border transition-all duration-200 z-10 ${canScrollRight ? 'bg-white text-stone-700 border-[#EED3AC]/90 shadow-[0_3px_10px_rgba(185,28,28,0.1)] hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_6px_14px_rgba(220,38,38,0.28)] active:scale-90 cursor-pointer' : 'bg-white/50 text-stone-300 border-stone-200/60 cursor-default'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
            );
        };

        const AdminTagsModal = ({ isOpen, onClose, categories, products = [], fetchData }) => {
            const [newTag, setNewTag] = useState('');
            const [isLoading, setIsLoading] = useState(false);

            useEscapeToClose(isOpen, onClose);

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
                    <div role="dialog" aria-modal="true" aria-label="Quản lý danh mục" className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in flex flex-col max-h-[90vh]">
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

        const ProductDetail = ({ onAddToCart, onContactClick, products = [], parentLoading = false, settings = null }) => {
            const { slug } = useParams();
            const [product, setProduct] = useState(null);
            const [relatedProducts, setRelatedProducts] = useState([]);
            const [loading, setLoading] = useState(true);
            const [showFullDetails, setShowFullDetails] = useState(false);
            const [quantity, setQuantity] = useState(1);
            const navigate = useNavigate();
            const detailTopRef = useRef(null);
            const relatedRowRef = useRef(null);
            const [relatedScrollState, setRelatedScrollState] = useState({ left: false, right: false });

            const updateRelatedScroll = () => {
                const el = relatedRowRef.current;
                if (!el) return;
                setRelatedScrollState({
                    left: el.scrollLeft > 4,
                    right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
                });
            };

            const scrollRelatedBy = (dir) => {
                const el = relatedRowRef.current;
                if (!el) return;
                const amount = Math.max(el.clientWidth * 0.65, 220);
                el.scrollBy({ left: dir * amount, behavior: 'smooth' });
            };

            useEffect(() => {
                setShowFullDetails(false);
                setQuantity(1);
                if (relatedRowRef.current) relatedRowRef.current.scrollLeft = 0;
            }, [product?.id, slug]);

            useEffect(() => {
                const timer = setTimeout(updateRelatedScroll, 60);
                window.addEventListener('resize', updateRelatedScroll);

                const el = relatedRowRef.current;
                const handleWheel = (e) => {
                    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
                    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.deltaY === 0) return;

                    const canScrollLeft = el.scrollLeft > 1;
                    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
                    if ((e.deltaY < 0 && canScrollLeft) || (e.deltaY > 0 && canScrollRight)) {
                        e.preventDefault();
                        e.stopPropagation();
                        el.scrollLeft += e.deltaY;
                    }
                };

                if (el) {
                    el.addEventListener('wheel', handleWheel, { passive: false });
                }

                return () => {
                    clearTimeout(timer);
                    window.removeEventListener('resize', updateRelatedScroll);
                    if (el) {
                        el.removeEventListener('wheel', handleWheel);
                    }
                };
            }, [relatedProducts]);

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
                    return (sameCategory.length > 0 ? sameCategory : visibleList).slice(0, 16);
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

            // SEO: cập nhật title/meta description + Structured Data (JSON-LD) theo từng sản phẩm
            useEffect(() => {
                if (!product) return;
                const previousTitle = document.title;
                const metaDescription = document.querySelector('meta[name="description"]');
                const previousDescription = metaDescription ? metaDescription.getAttribute('content') : null;
                const cleanDescription = (product.description || '').replace(/\s+/g, ' ').trim();
                const desc = cleanDescription.slice(0, 160);

                document.title = `${product.name} - ${formatVND(product.price)} | Hùng Thuận Tokcay`;
                if (metaDescription && desc) metaDescription.setAttribute('content', desc);

                const jsonLd = document.createElement('script');
                jsonLd.type = 'application/ld+json';
                jsonLd.text = JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: product.name,
                    image: [product.image_url].filter(Boolean),
                    description: cleanDescription || undefined,
                    sku: product.sku || undefined,
                    offers: {
                        '@type': 'Offer',
                        price: Number(product.price) || 0,
                        priceCurrency: 'VND',
                        availability: (product.stock_status || '').toLowerCase() === 'hết hàng'
                            ? 'https://schema.org/OutOfStock'
                            : 'https://schema.org/InStock',
                        url: window.location.href,
                    },
                });
                document.head.appendChild(jsonLd);

                return () => {
                    document.title = previousTitle;
                    if (metaDescription && previousDescription !== null) {
                        metaDescription.setAttribute('content', previousDescription);
                    }
                    jsonLd.remove();
                };
            }, [product]);

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
            const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700 border border-red-200/80' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
            const productTags = Array.isArray(product.tags) ? product.tags.filter(Boolean) : [];
            const zaloWholesaleLink = getCleanZaloLink(settings?.link_zalo || settings?.zalo_number || '0902631632');

            return (
                <div ref={detailTopRef} className="w-full pb-12 animate-fade-in">
                    {/* Khung chi tiết sản phẩm: nền gợn sóng trắng toàn khung đi kèm lớp glass mờ, bọc gợn sóng đỏ bên khung ảnh */}
                    <div
                        className="relative overflow-hidden rounded-[28px] border border-white/90 shadow-[0_12px_36px_rgba(185,28,28,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] flex flex-col md:flex-row p-3.5 sm:p-5 md:p-7 gap-6 lg:gap-8 mb-8"
                        style={SEIGAIHA_WHITE_BG_STYLE}
                    >
                        <div className="pointer-events-none absolute inset-0 bg-white/40 backdrop-blur-[1.5px]"></div>
                        {/* Cột trái: Khung gợn sóng bọc khung ảnh sản phẩm bên trong */}
                        <div className="relative z-10 w-full md:w-1/2 flex flex-col">
                            <div
                                className="relative flex flex-col rounded-[22px] p-2 sm:p-2.5 border border-[#E6C27E]/95 shadow-[0_10px_28px_rgba(139,21,21,0.14)] overflow-hidden"
                                style={SEIGAIHA_CRIMSON_STYLE}
                            >
                                <div className="relative z-10 w-full aspect-square flex items-center justify-center rounded-[14px] border border-[#E6C27E]/85 bg-white shadow-inner overflow-hidden">
                                    <img
                                        src={product.image_url || FallbackImage}
                                        onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                        alt={product.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-contain rounded-xl transition-transform duration-500 hover:scale-[1.03]"
                                    />
                                </div>
                            </div>

                            {productTags.length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-stone-600 mr-1">Danh mục:</span>
                                    {productTags.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => navigate(`/san-pham?tag=${encodeURIComponent(tag)}`)}
                                            className="px-2.5 py-1 rounded-full bg-white/75 hover:bg-red-50 text-red-700 border border-red-200/70 text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cột phải: Thông tin & mô tả sản phẩm đặt trực tiếp trên nền gợn sóng trắng + glass */}
                        <div className="relative z-10 w-full md:w-1/2 flex flex-col">
                                <div className="flex flex-wrap items-center gap-2.5 mb-4">
                                    <button onClick={handleBack} className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-stone-200 rounded-full shadow-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs sm:text-sm font-semibold transition-all active:scale-95 w-max cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg> Quay lại
                                    </button>
                                    <button onClick={handleShare} className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-stone-200 rounded-full shadow-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs sm:text-sm font-semibold transition-all active:scale-95 w-max cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg> Chia sẻ
                                    </button>
                                </div>

                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 mb-4 leading-tight tracking-tight">{product.name}</h1>

                                {/* Giá bán lẻ & Giá sỉ sạch sẽ */}
                                <div className="rounded-2xl border border-[#E6D2B5]/90 bg-white/75 backdrop-blur-sm px-4 py-3.5 mb-5 shadow-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-red-600/90 mb-0.5">Giá bán lẻ</span>
                                            <p className="text-3xl sm:text-4xl font-black text-red-600 leading-none">{formatVND(product.price)}</p>
                                        </div>
                                        <a
                                            href={zaloWholesaleLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold shadow-xs transition-all"
                                        >
                                            <i className="fa-solid fa-comments"></i>
                                            Giá sỉ / thùng: Liên hệ Zalo
                                        </a>
                                    </div>
                                </div>

                                {/* Thông tin chi tiết */}
                                <div className="mb-5">
                                    <button
                                        type="button"
                                        onClick={() => setShowFullDetails(prev => !prev)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-red-50/70 border border-red-200/80 text-red-700 font-semibold text-sm flex items-center justify-between shadow-xs transition-all duration-200 cursor-pointer select-none"
                                    >
                                        <span className="flex items-center gap-2">
                                            <i className="fa-solid fa-circle-info text-red-500"></i>
                                            {showFullDetails ? 'Thu gọn thông tin chi tiết' : 'Nhấn để xem thêm thông tin chi tiết'}
                                        </span>
                                        <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-300 ${showFullDetails ? 'rotate-180' : ''}`}></i>
                                    </button>

                                    {showFullDetails && (
                                        <div className="mt-2.5 p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E6D2B5]/90 text-stone-700 text-sm leading-relaxed shadow-inner transition-all duration-300 animate-fadeIn">
                                            {product.description ? (
                                                <div className="whitespace-pre-line leading-relaxed text-gray-700">{product.description}</div>
                                            ) : (
                                                <p className="italic text-gray-500">Sản phẩm được phân phối chính hãng bởi Hùng Thuận Tokcay Korea Foods. Liên hệ Zalo hoặc Hotline để được tư vấn quy cách thùng và hạn sử dụng mới nhất.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Khối cam kết Tokcay */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
                                    <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E6D2B5]/85 shadow-xs">
                                        <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-sm flex-shrink-0">
                                            <i className="fa-solid fa-award"></i>
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">Chuẩn vị Hàn Quốc</p>
                                            <p className="text-[11px] text-stone-500">Nguồn hàng chính hãng</p>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E6D2B5]/85 shadow-xs">
                                        <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-sm flex-shrink-0">
                                            <i className="fa-solid fa-snowflake"></i>
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">Bảo quản chuẩn kho</p>
                                            <p className="text-[11px] text-stone-500">Giao hàng nhanh chóng</p>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E6D2B5]/85 shadow-xs">
                                        <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm flex-shrink-0">
                                            <i className="fa-solid fa-boxes-stacked"></i>
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">Hỗ trợ giá sỉ tốt</p>
                                            <p className="text-[11px] text-stone-500">Cho quán ăn & đại lý</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tình trạng + Số lượng + Nút thêm vào giỏ */}
                                <div className="mt-auto pt-5 border-t border-stone-100">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-sm sm:text-base text-gray-600 font-medium">Tình trạng:</span>
                                            <span className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${colorClass}`}>
                                                {product.stock_status || 'Hàng sẵn tại kho'}
                                            </span>
                                        </div>
                                        {onContactClick && (
                                            <button
                                                type="button"
                                                onClick={onContactClick}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-2 cursor-pointer"
                                            >
                                                Cần tư vấn đơn sỉ?
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-stretch gap-2.5 sm:gap-3">
                                        {!isOutOfStock && (
                                            <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                    className="w-10 sm:w-11 h-full flex items-center justify-center text-stone-700 hover:bg-red-50 hover:text-red-600 font-bold text-lg transition-colors cursor-pointer"
                                                    aria-label="Giảm số lượng"
                                                >
                                                    -
                                                </button>
                                                <span className="w-9 text-center font-extrabold text-stone-800 text-sm sm:text-base select-none">{quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setQuantity(q => q + 1)}
                                                    className="w-10 sm:w-11 h-full flex items-center justify-center text-stone-700 hover:bg-red-50 hover:text-red-600 font-bold text-lg transition-colors cursor-pointer"
                                                    aria-label="Tăng số lượng"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => onAddToCart(product, quantity)}
                                            disabled={isOutOfStock}
                                            className="flex-1 py-3.5 sm:py-4 px-5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_6px_16px_rgba(185,28,28,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_8px_22px_rgba(185,28,28,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg cursor-pointer"
                                            style={!isOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                        >
                                            <i className="fa-solid fa-cart-plus"></i>
                                            {isOutOfStock ? 'Sản phẩm hết hàng' : 'Thêm vào giỏ hàng'}
                                        </button>
                                    </div>
                                </div>
                        </div>
                    </div>

                    {/* SẢN PHẨM CÙNG DANH MỤC - dải ngang toàn chiều rộng, thẻ nhỏ gọn & cuộn mượt */}
                    {relatedProducts.length > 0 && (
                        <div className="relative mt-6 w-full rounded-2xl bg-[#FAF0E6]/70 backdrop-blur-xl border border-[#E5D3BE]/90 shadow-[0_6px_22px_rgba(185,28,28,0.05),inset_0_1px_1px_rgba(255,255,255,0.75)] pt-5 sm:pt-6 pb-2.5 sm:pb-3 px-2.5 sm:px-4">
                            <div
                                className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-0.5 rounded-full text-white font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md border border-[#F3D5A5]/70 whitespace-nowrap z-10"
                                style={{ background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #b91c1c 100%)' }}
                            >
                                <BlossomIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" petalColor="#FFFFFF" centerColor="#FDE047" />
                                <span>SẢN PHẨM CÙNG DANH MỤC</span>
                            </div>

                            <div className="relative group/slider">
                                {relatedScrollState.left && (
                                    <button
                                        type="button"
                                        onClick={() => scrollRelatedBy(-1)}
                                        aria-label="Cuộn sang trái"
                                        className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white/90 hover:bg-white text-red-600 border border-red-200/80 shadow-md absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all hover:scale-105 cursor-pointer"
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                )}

                                <div
                                    ref={relatedRowRef}
                                    onScroll={updateRelatedScroll}
                                    className="flex flex-nowrap items-stretch gap-2 sm:gap-2.5 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar py-1.5 px-0.5"
                                    style={{
                                        WebkitMaskImage: relatedScrollState.left && relatedScrollState.right
                                            ? 'linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)'
                                            : relatedScrollState.right
                                            ? 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)'
                                            : relatedScrollState.left
                                            ? 'linear-gradient(to right, transparent 0%, black 20px, black 100%)'
                                            : 'none',
                                        maskImage: relatedScrollState.left && relatedScrollState.right
                                            ? 'linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)'
                                            : relatedScrollState.right
                                            ? 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)'
                                            : relatedScrollState.left
                                            ? 'linear-gradient(to right, transparent 0%, black 20px, black 100%)'
                                            : 'none',
                                    }}
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
                                                className="group flex-shrink-0 w-[116px] sm:w-[126px] md:w-[132px] p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-white/80 via-red-50/40 to-rose-100/35 hover:from-white/90 hover:via-red-50/55 hover:to-rose-100/50 backdrop-blur-sm border border-red-200/55 shadow-[0_4px_14px_rgba(185,28,28,0.05)] hover:shadow-[0_10px_22px_rgba(185,28,28,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="aspect-square overflow-hidden rounded-lg bg-white/90 p-1.5 mb-1 border border-red-100/60 flex items-center justify-center">
                                                        <img
                                                            src={relProduct.image_url || FallbackImage}
                                                            onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                                            alt={relProduct.name}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <h5 className="text-[11px] font-semibold text-stone-800 line-clamp-2 leading-tight mb-0.5 min-h-[1.75rem] group-hover:text-primary transition-colors" title={relProduct.name}>
                                                        {relProduct.name}
                                                    </h5>
                                                </div>
                                                <div className="mt-auto pt-0.5">
                                                    <p className="text-xs font-extrabold text-red-600 mb-1">
                                                        {formatVND(relProduct.price)}
                                                    </p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onAddToCart(relProduct);
                                                        }}
                                                        disabled={relOutOfStock}
                                                        className="w-full py-0.5 sm:py-1 px-2 rounded-full text-[10px] sm:text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_3px_10px_rgba(185,28,28,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_5px_14px_rgba(185,28,28,0.38)] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                        style={!relOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                                    >
                                                        {!relOutOfStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {relatedScrollState.right && (
                                    <button
                                        type="button"
                                        onClick={() => scrollRelatedBy(1)}
                                        aria-label="Cuộn sang phải"
                                        className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white/90 hover:bg-white text-red-600 border border-red-200/80 shadow-md absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 transition-all hover:scale-105 cursor-pointer"
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-center mt-1.5">
                                <Link to="/san-pham" className="text-[10px] sm:text-[11px] font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/60 hover:bg-white/90 border border-red-200/60 transition-all">
                                    Xem tất cả sản phẩm <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                </Link>
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

        const AdminLoginForm = ({ onSubmit }) => {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [showPassword, setShowPassword] = useState(false);
            const passwordInputRef = useRef(null);

            const trimmedEmail = email.trim();
            const suggestedGmail = (() => {
                if (!trimmedEmail || /\s/.test(trimmedEmail)) return '';
                if (!trimmedEmail.includes('@')) return `${trimmedEmail}@gmail.com`;
                const atIdx = trimmedEmail.indexOf('@');
                const localPart = trimmedEmail.slice(0, atIdx);
                const domainPart = trimmedEmail.slice(atIdx + 1).toLowerCase();
                if (localPart && domainPart !== 'gmail.com' && 'gmail.com'.startsWith(domainPart)) {
                    return `${localPart}@gmail.com`;
                }
                return '';
            })();

            const applyGmailSuggestion = (moveFocusToPassword = false) => {
                if (suggestedGmail) {
                    setEmail(suggestedGmail);
                }
                if (moveFocusToPassword && passwordInputRef.current) {
                    passwordInputRef.current.focus();
                }
            };

            const handleEmailBlur = () => {
                if (trimmedEmail && !/\s/.test(trimmedEmail) && !trimmedEmail.includes('@')) {
                    setEmail(`${trimmedEmail}@gmail.com`);
                }
            };

            const handleEmailKeyDown = (e) => {
                if (!suggestedGmail) return;
                if (e.key === 'Tab' && !e.shiftKey) {
                    setEmail(suggestedGmail);
                } else if (e.key === 'ArrowRight' && e.target.selectionStart === email.length) {
                    e.preventDefault();
                    setEmail(suggestedGmail);
                }
            };

            return (
                <form
                    onSubmit={(e) => {
                        const normalized = (trimmedEmail && !/\s/.test(trimmedEmail) && !trimmedEmail.includes('@'))
                            ? `${trimmedEmail}@gmail.com`
                            : trimmedEmail;
                        if (normalized !== email) {
                            setEmail(normalized);
                            if (e.target?.email) e.target.email.value = normalized;
                        }
                        onSubmit(e);
                    }}
                    className="w-full max-w-sm mt-4 flex flex-col gap-3.5 text-left"
                >
                    <div>
                        <label htmlFor="admin-email-input" className="block text-xs font-bold text-stone-600 mb-1.5 ml-1">
                            Email Admin
                        </label>
                        <div className="relative">
                            <input
                                id="admin-email-input"
                                name="email"
                                type="text"
                                inputMode="email"
                                placeholder="Nhập tên email (tự điền @gmail.com)"
                                required
                                autoComplete="username webauthn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                onKeyDown={handleEmailKeyDown}
                                className={`w-full pl-4 ${suggestedGmail ? 'pr-28' : 'pr-4'} py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm transition-all`}
                            />
                            {suggestedGmail && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        applyGmailSuggestion(true);
                                    }}
                                    title={`Điền nhanh ${suggestedGmail}`}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                                >
                                    +@gmail.com
                                </button>
                            )}
                        </div>
                        {suggestedGmail && (
                            <p className="mt-1 ml-1 text-[11px] text-stone-500">
                                Gợi ý: <button type="button" onMouseDown={(e) => { e.preventDefault(); applyGmailSuggestion(true); }} className="font-bold text-red-600 hover:underline cursor-pointer">{suggestedGmail}</button> (tự điền khi chuyển ô hoặc nhấn Tab)
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="admin-password-input" className="block text-xs font-bold text-stone-600 mb-1.5 ml-1">
                            Mật khẩu
                        </label>
                        <div className="relative">
                            <input
                                ref={passwordInputRef}
                                id="admin-password-input"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nhập mật khẩu"
                                required
                                autoComplete="current-password webauthn"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="mt-1 w-full bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl shadow-[0_6px_18px_rgba(220,38,38,0.28)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96) 0%, rgba(185, 28, 28, 0.96) 100%)' }}
                    >
                        Đăng nhập Admin
                    </button>
                </form>
            );
        };

        const ProductCard = ({
            product,
            layout = 'grid',
            isAdmin,
            pinnedProductIds,
            editingPriceId,
            editingPriceValue,
            setEditingPriceId,
            setEditingPriceValue,
            onTogglePin,
            onEdit,
            onToggleVisibility,
            onDelete,
            onQuickToggleStock,
            onQuickPriceSave,
            onAddToCart
        }) => {
            const colorClass = product.statusColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
            const isOutOfStock = Boolean(product.stock_status && product.stock_status.toLowerCase() === 'hết hàng');
            const isPinned = pinnedProductIds.includes(Number(product.id));
            const CardLink = isAdmin ? 'div' : Link;
            const cardLinkProps = isAdmin ? {} : { to: `/san-pham/${product.slug || product.id}` };
            const isList = layout === 'list';

            const renderAdminActions = () => (
                isAdmin && (
                    <div className={`${isList ? 'flex items-center gap-1.5 flex-wrap' : 'absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-1.5 z-10'}`}>
                        <button
                            type="button"
                            onClick={(e) => onTogglePin(e, product)}
                            className={`${isList ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-8 sm:h-8'} flex items-center justify-center backdrop-blur rounded-full shadow-md transition-colors cursor-pointer ${isPinned ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/90 text-gray-700 hover:bg-amber-500 hover:text-white'}`}
                            title={isPinned ? 'Bỏ ghim khỏi đầu trang' : 'Ghim sản phẩm lên đầu trang'}
                        >
                            <i className="fa-solid fa-thumbtack text-[11px] sm:text-xs"></i>
                        </button>
                        <button type="button" onClick={(e) => onEdit(e, product)} className={`${isList ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-8 sm:h-8'} flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-primary hover:text-white text-gray-700 transition-colors cursor-pointer`} title="Chỉnh sửa chi tiết">
                            <i className="fa-solid fa-pen text-[11px] sm:text-xs"></i>
                        </button>
                        <button type="button" onClick={(e) => onToggleVisibility(e, product)} className={`${isList ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-8 sm:h-8'} flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md transition-colors cursor-pointer ${product.is_hidden ? 'hover:bg-green-500 hover:text-white text-green-600' : 'hover:bg-gray-800 hover:text-white text-gray-600'}`} title={product.is_hidden ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}>
                            <i className={`fa-solid ${product.is_hidden ? 'fa-eye' : 'fa-eye-slash'} text-[11px] sm:text-xs`}></i>
                        </button>
                        <button type="button" onClick={(e) => onDelete(e, product)} className={`${isList ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-8 sm:h-8'} flex items-center justify-center bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-red-600 hover:text-white text-red-500 transition-colors cursor-pointer`} title="Xóa sản phẩm">
                            <i className="fa-solid fa-trash-can text-[11px] sm:text-xs"></i>
                        </button>
                    </div>
                )
            );

            const renderPriceBlock = () => (
                isAdmin && editingPriceId === product.id ? (
                    <div className="mb-2.5 flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <input
                            type="number"
                            inputMode="numeric"
                            autoFocus
                            className="w-full min-w-[76px] border border-red-400 rounded-md px-2 py-1 text-xs sm:text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-400 bg-white"
                            value={editingPriceValue}
                            onChange={e => setEditingPriceValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') onQuickPriceSave(e, product);
                                if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                            onBlur={e => onQuickPriceSave(e, product)}
                        />
                        <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); onQuickPriceSave(e, product); }}
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
                        className={`mb-2.5 tracking-tight w-full flex items-center flex-wrap md:flex-nowrap whitespace-nowrap overflow-hidden text-ellipsis ${isList ? 'sm:justify-end' : ''} ${isAdmin ? 'cursor-pointer hover:bg-red-50/80 rounded px-1 -mx-1 transition-colors' : ''}`}
                    >
                        <span className="text-gray-500 text-xs md:text-sm font-medium mr-1">Giá bán lẻ: </span>
                        <span className="text-sm md:text-base font-bold text-red-600">{formatVND(product.price)}</span>
                        {isAdmin && <i className="fa-solid fa-pen-to-square text-[11px] text-red-400 ml-1.5"></i>}
                    </p>
                )
            );

            if (isList) {
                const tags = Array.isArray(product.tags) ? product.tags.filter(Boolean).slice(0, 3) : [];
                return (
                    <div
                        className={`group bg-gradient-to-r from-white/90 via-red-50/30 to-rose-50/40 hover:from-white hover:to-rose-50/60 backdrop-blur-sm border ${isPinned ? 'border-red-400/80 ring-1 ring-red-300/50' : 'border-red-200/60'} shadow-[0_6px_20px_rgba(185,28,28,0.05)] hover:shadow-[0_12px_28px_rgba(185,28,28,0.12)] transition-all duration-300 rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch p-3 sm:p-4 gap-3 sm:gap-5 ${product.is_hidden ? 'opacity-60 grayscale-[0.2]' : ''}`}
                    >
                        <div className="flex items-start gap-3 sm:gap-5 flex-1 min-w-0">
                            <CardLink {...cardLinkProps} className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-white p-2 flex items-center justify-center border border-red-100/80 cursor-pointer">
                                <img
                                    src={product.image_url || FallbackImage}
                                    onError={(e) => { e.target.onerror = null; e.target.src = FallbackImage; }}
                                    alt={product.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                />
                                {isPinned && (
                                    <span className="absolute top-1.5 left-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow bg-red-600">
                                        <i className="fa-solid fa-thumbtack"></i>
                                    </span>
                                )}
                            </CardLink>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                        {isPinned && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Nổi bật</span>
                                        )}
                                        {product.is_hidden && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-white">Đang ẩn</span>
                                        )}
                                        {tags.map(t => (
                                            <span key={t} className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    <CardLink {...cardLinkProps}>
                                        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors cursor-pointer" title={product.name}>
                                            {product.name}
                                        </h3>
                                    </CardLink>
                                    {product.description && (
                                        <p className="hidden sm:line-clamp-2 text-xs text-stone-500 mb-2 leading-relaxed">
                                            {product.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5 mt-1">
                                    <span
                                        onClick={isAdmin ? (e) => onQuickToggleStock(e, product) : undefined}
                                        title={isAdmin ? 'Admin: Nhấn 1 chạm để đổi nhanh Còn hàng / Hết hàng' : undefined}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium ${colorClass} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-red-300 active:scale-95 transition-all select-none' : ''}`}
                                    >
                                        {product.stock_status || 'Hàng sẵn tại kho'}
                                        {isAdmin && <i className="fa-solid fa-rotate text-[10px] opacity-75"></i>}
                                    </span>
                                    <span className="text-[11px] sm:text-xs text-blue-600">
                                        Giá sỉ/thùng: <strong className="font-bold">liên hệ Zalo</strong>
                                    </span>
                                </div>
                                {isAdmin && <div className="mt-2">{renderAdminActions()}</div>}
                            </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:w-64 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 sm:border-l border-red-100/70 sm:pl-4">
                            <div className="min-w-0 max-w-full sm:w-full">{renderPriceBlock()}</div>
                            <div className="flex items-center gap-2 flex-shrink-0 sm:w-full">
                                {!isAdmin && (
                                    <Link to={`/san-pham/${product.slug || product.id}`} className="hidden sm:inline-flex flex-shrink-0 items-center justify-center px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold whitespace-nowrap transition-colors">
                                        Chi tiết
                                    </Link>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(product); }}
                                    disabled={isOutOfStock}
                                    className="sm:flex-1 flex-shrink-0 py-2 px-3 sm:px-3.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_6px_16px_rgba(185,28,28,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_8px_22px_rgba(185,28,28,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap"
                                    style={!isOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                                >
                                    {!isOutOfStock ? (
                                        <><i className="fa-solid fa-cart-plus"></i> Thêm vào giỏ</>
                                    ) : (
                                        <><i className="fa-solid fa-ban"></i> Hết hàng</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div
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
                        {renderAdminActions()}
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
                                onClick={isAdmin ? (e) => onQuickToggleStock(e, product) : undefined}
                                title={isAdmin ? 'Admin: Nhấn 1 chạm để đổi nhanh Còn hàng / Hết hàng' : undefined}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs sm:text-sm font-medium ${colorClass} ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-red-300 active:scale-95 transition-all select-none' : ''}`}
                            >
                                {product.stock_status || 'Hàng sẵn tại kho'}
                                {isAdmin && <i className="fa-solid fa-rotate text-[10px] opacity-75"></i>}
                            </span>
                        </div>
                        <div className="mt-auto pt-3">
                            <p className="whitespace-nowrap overflow-hidden text-ellipsis w-full text-[11px] sm:text-xs md:text-sm text-blue-600 mb-1">Giá sỉ/thùng: <span className="font-bold cursor-pointer no-underline text-blue-600">liên hệ Zalo</span></p>
                            {renderPriceBlock()}
                            <button
                                onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(product); }}
                                disabled={isOutOfStock}
                                className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 backdrop-blur-md border border-red-400/40 shadow-[0_6px_16px_rgba(185,28,28,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_8px_22px_rgba(185,28,28,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap"
                                style={!isOutOfStock ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : { background: '#9ca3af' }}
                            >
                                {!isOutOfStock ? (
                                    <><i className="fa-solid fa-cart-plus"></i> Thêm vào giỏ</>
                                ) : (
                                    <><i className="fa-solid fa-ban"></i> Hết hàng</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const ProductCatalogSection = ({
            isFullPage = false,
            isAdmin,
            productsSectionRef,
            allTags,
            selectedTags = [],
            onTagToggle,
            onManageTags,
            filteredProducts,
            currentProducts,
            loading,
            showFilters,
            setShowFilters,
            priceMin,
            setPriceMin,
            priceMax,
            setPriceMax,
            handlePresetPrice,
            stockFilter,
            setStockFilter,
            sortOrder,
            setSortOrder,
            viewMode,
            setViewMode,
            pageSizeMode,
            setPageSizeMode,
            handleResetFilters,
            safePage,
            totalPages,
            handlePageChange,
            pinnedProductIds,
            editingPriceId,
            setEditingPriceId,
            editingPriceValue,
            setEditingPriceValue,
            handleTogglePinProduct,
            handleEditClick,
            handleToggleVisibility,
            handleDeleteProduct,
            handleQuickToggleStock,
            handleQuickPriceSave,
            handleAddToCart,
            setEditingProduct,
            setIsProductModalOpen,
            handleExportPriceListExcel,
            handlePrintPriceListPDF,
            setIsSettingsModalOpen
        }) => {
            const hasActiveFilters = Boolean(selectedTags.length > 0 || priceMin || priceMax || stockFilter || sortOrder);
            const sortLabels = {
                '': 'Sắp xếp',
                'asc': 'Giá tăng dần',
                'desc': 'Giá giảm dần',
                'name_asc': 'Tên A - Z'
            };
            const cycleSortOrder = () => {
                const order = ['', 'asc', 'desc', 'name_asc'];
                const next = order[(order.indexOf(sortOrder) + 1) % order.length];
                setSortOrder(next);
            };

            const handlePageSizeSelect = (mode) => {
                setPageSizeMode(mode);
                if (productsSectionRef?.current) {
                    const y = productsSectionRef.current.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            };

            const renderPaginationControls = () => {
                let startPage = Math.max(1, safePage - 2);
                let endPage = Math.min(totalPages, safePage + 2);

                if (safePage <= 3) {
                    endPage = Math.min(totalPages, 5);
                }
                if (safePage >= totalPages - 2) {
                    startPage = Math.max(1, totalPages - 4);
                }

                const pageNumbers = [];
                for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(i);
                }

                return (
                    <>
                        <button
                            type="button"
                            onClick={() => handlePageChange(1)}
                            disabled={safePage === 1}
                            title="Trang đầu"
                            aria-label="Trang đầu"
                            className="h-7 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center whitespace-nowrap flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="sm:hidden">« Đầu</span>
                            <span className="hidden sm:inline">Trang đầu</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePageChange(safePage - 1)}
                            disabled={safePage === 1}
                            title="Trang trước"
                            aria-label="Trang trước"
                            className="h-7 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center whitespace-nowrap flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="sm:hidden">‹ Trước</span>
                            <span className="hidden sm:inline">Trang trước</span>
                        </button>

                        <span className="h-3.5 sm:h-4 w-px bg-stone-200/80 mx-0.5 flex-shrink-0" aria-hidden="true"></span>

                        <div className="hidden sm:flex items-center gap-1">
                            {startPage > 1 && (
                                <span className="px-1.5 h-9 inline-flex items-center justify-center text-sm font-bold text-stone-400 select-none" aria-hidden="true">
                                    ...
                                </span>
                            )}
                            {pageNumbers.map(pageNum => (
                                <button
                                    type="button"
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    aria-current={safePage === pageNum ? 'page' : undefined}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${safePage === pageNum
                                        ? 'text-white shadow-[0_4px_12px_rgba(220,38,38,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] scale-[1.03]'
                                        : 'text-stone-600 hover:bg-red-50 hover:text-red-600'}`}
                                    style={safePage === pageNum ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96) 0%, rgba(185, 28, 28, 0.96) 100%)' } : undefined}
                                >
                                    {pageNum}
                                </button>
                            ))}
                            {endPage < totalPages && (
                                <span className="px-1.5 h-9 inline-flex items-center justify-center text-sm font-bold text-stone-400 select-none" aria-hidden="true">
                                    ...
                                </span>
                            )}
                        </div>

                        <div className="sm:hidden px-2 h-7 inline-flex items-center justify-center rounded-full bg-red-50/90 border border-red-200/70 text-[10.5px] font-extrabold text-red-700 whitespace-nowrap flex-shrink-0">
                            {safePage}/{totalPages}
                        </div>

                        <span className="h-3.5 sm:h-4 w-px bg-stone-200/80 mx-0.5 flex-shrink-0" aria-hidden="true"></span>

                        <button
                            type="button"
                            onClick={() => handlePageChange(safePage + 1)}
                            disabled={safePage === totalPages}
                            title="Trang sau"
                            aria-label="Trang sau"
                            className="h-7 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center whitespace-nowrap flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="sm:hidden">Sau ›</span>
                            <span className="hidden sm:inline">Trang sau</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={safePage === totalPages}
                            title="Trang cuối"
                            aria-label="Trang cuối"
                            className="h-7 sm:h-9 px-1.5 sm:px-3 rounded-full flex items-center justify-center whitespace-nowrap flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                            <span className="sm:hidden">Cuối »</span>
                            <span className="hidden sm:inline">Trang cuối</span>
                        </button>
                    </>
                );
            };

            return (
                <main id="products-section" className="flex-1 py-4 sm:py-6 w-full min-h-[460px]" ref={productsSectionRef}>
                    {isFullPage && (
                        <div
                            className="relative mb-6 rounded-3xl overflow-hidden border-2 border-[#E6C27E] shadow-[0_12px_32px_rgba(139,21,21,0.16)] text-white px-5 py-5 sm:px-8 sm:py-7"
                            style={SEIGAIHA_CRIMSON_STYLE}
                        >
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#7f1d1d]/80 via-[#8f1616]/55 to-[#7f1d1d]/75"></div>
                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-[#E6C27E]/60 text-[11px] font-bold tracking-wider uppercase mb-2 text-[#FDE68A]">
                                        <BlossomIcon className="w-3.5 h-3.5" petalColor="#FFFFFF" centerColor="#FDE047" />
                                        <span>KHO HÀNG ĐẦY ĐỦ • TOKCAY KOREA FOODS</span>
                                    </div>
                                    <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">Tất Cả Sản Phẩm Tokcay</h1>
                                    <p className="text-xs sm:text-sm text-red-100 mt-1">Xem đầy đủ mặt hàng, lọc nhanh theo danh mục, tầm giá, tình trạng & chọn kiểu hiển thị.</p>
                                </div>
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-[#E6C27E]/60 text-xs sm:text-sm font-semibold whitespace-nowrap w-max transition-all backdrop-blur-sm"
                                >
                                    <i className="fa-solid fa-house text-xs"></i> Về trang chủ
                                </Link>
                            </div>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="mb-8 p-5 bg-primaryLight border border-red-200 rounded-xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 animate-fade-in">
                            <div className="flex items-center flex-wrap gap-3 text-primaryDark font-bold text-lg">
                                <span className="relative flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                                </span>
                                <span>Chế độ Quản Trị (Admin)</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                                <button type="button" onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="flex items-center gap-2 bg-white border border-gray-300 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer">
                                    <i className="fa-solid fa-plus text-primary"></i> Thêm sản phẩm
                                </button>
                                {onManageTags && (
                                    <button type="button" onClick={onManageTags} className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-amber-800 hover:bg-amber-100 shadow-sm transition-colors cursor-pointer">
                                        <i className="fa-solid fa-tags text-amber-600"></i> Quản lý danh mục
                                    </button>
                                )}
                                <button type="button" onClick={handleExportPriceListExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer" title="Tải xuống Bảng Giá file Excel (.XLSX)">
                                    <i className="fa-solid fa-file-excel"></i> Xuất Excel
                                </button>
                                <button type="button" onClick={handlePrintPriceListPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }} title="In Bảng Báo Giá hoặc Lưu thành PDF">
                                    <i className="fa-solid fa-print"></i> In Bảng Giá / PDF
                                </button>
                                <button type="button" onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 bg-gray-800 text-white px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-900 shadow-sm transition-colors cursor-pointer">
                                    <i className="fa-solid fa-gear"></i> Cài đặt chung
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TÁCH BIỆT 2 HÀNG ĐỘC LẬP: HÀNG 1 (Danh mục) & HÀNG 2 (Số lượng + View Switch + Bộ lọc/Sắp xếp) */}
                    <div className="flex flex-col w-full max-w-7xl mx-auto px-1 sm:px-2 gap-3 mb-4">
                        {/* HÀNG 1: Thanh Tag Danh mục (ẩn ở trang /san-pham đầy đủ vì đã có trong Bộ lọc) */}
                        {!isFullPage && (
                            <TagsSlider
                                uniqueTags={allTags}
                                selectedTags={selectedTags}
                                onTagToggle={onTagToggle}
                                isAdmin={isAdmin}
                                onManageTags={onManageTags}
                            />
                        )}

                        {/* HÀNG 2: Thanh đếm số SP & Bộ lọc / Sắp xếp / Chọn hiển thị Lưới vs Dọc */}
                        <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 relative z-20 text-xs sm:text-sm text-stone-600">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-stone-500">
                                    Hiển thị <strong className="text-red-600 font-semibold">{filteredProducts.length}</strong> sản phẩm
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 relative ml-auto">
                                {/* Nút chuyển chế độ hiển thị Dạng lưới / Dạng dọc */}
                                <div className="inline-flex items-center rounded-full bg-white/85 border border-red-100 p-0.5 shadow-sm" role="group" aria-label="Chế độ hiển thị">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        aria-pressed={viewMode === 'grid'}
                                        title="Hiển thị dạng lưới"
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-600 hover:text-red-600'}`}
                                        style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                    >
                                        <i className="fa-solid fa-table-cells-large text-[11px]"></i>
                                        <span className="hidden sm:inline">Lưới</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        aria-pressed={viewMode === 'list'}
                                        title="Hiển thị dạng dọc"
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${viewMode === 'list' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-600 hover:text-red-600'}`}
                                        style={viewMode === 'list' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                    >
                                        <i className="fa-solid fa-list text-[11px]"></i>
                                        <span className="hidden sm:inline">Dọc</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm border font-medium shadow-sm transition-all cursor-pointer select-none ${showFilters || selectedTags.length > 0 || priceMin || priceMax || stockFilter ? 'bg-red-600 text-white border-red-400/40' : 'bg-white/80 hover:bg-red-50 border-red-100 text-stone-700 hover:text-red-600'}`}
                                    style={showFilters || selectedTags.length > 0 || priceMin || priceMax || stockFilter ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' } : undefined}
                                >
                                    <i className="fa-solid fa-sliders text-xs"></i>
                                    <span>Bộ lọc</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={cycleSortOrder}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-red-50/80 backdrop-blur-sm border border-red-100/80 text-stone-700 hover:text-red-600 font-medium shadow-sm transition-all cursor-pointer select-none"
                                >
                                    <span>{sortLabels[sortOrder] || 'Sắp xếp'}</span>
                                    {sortOrder === 'asc' ? (
                                        <span className="text-red-600 font-bold leading-none">↑</span>
                                    ) : sortOrder === 'desc' ? (
                                        <span className="text-red-600 font-bold leading-none">↓</span>
                                    ) : sortOrder === 'name_asc' ? (
                                        <span className="text-red-600 font-bold text-[11px] leading-none">A-Z</span>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-500">
                                            <path d="m21 16-4 4-4-4" />
                                            <path d="M17 20V4" />
                                            <path d="m3 8 4-4 4 4" />
                                            <path d="M7 4v16" />
                                        </svg>
                                    )}
                                </button>

                                {/* Khung Bộ Lọc nổi độc lập */}
                                {showFilters && (
                                    <div className="absolute right-0 top-full mt-2 z-40 w-[min(20rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto overscroll-contain touch-pan-y bg-white/[0.98] backdrop-blur-2xl border border-red-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-4 sm:p-5 animate-fade-in">
                                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2.5">
                                            <h3 className="text-base font-extrabold text-gray-800 uppercase tracking-wide">Bộ Lọc</h3>
                                            <button type="button" onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-red-600 bg-gray-100 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                                        </div>

                                        {/* Tình trạng kho */}
                                        <div className="mb-4 border-b border-gray-100 pb-4">
                                            <h4 className="font-bold text-gray-700 mb-2.5 text-xs uppercase tracking-wider">Tình Trạng Kho</h4>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { v: '', label: 'Tất cả' },
                                                    { v: 'in', label: 'Còn hàng' },
                                                    { v: 'out', label: 'Hết hàng' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.v}
                                                        type="button"
                                                        onClick={() => setStockFilter(opt.v)}
                                                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${stockFilter === opt.v ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-red-300'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Tag Filter - hỗ trợ chọn nhiều dòng sản phẩm */}
                                        <div className="mb-4 border-b border-gray-100 pb-4">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Dòng Sản Phẩm</h4>
                                                {selectedTags.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onTagToggle('')}
                                                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                                                    >
                                                        Bỏ chọn ({selectedTags.length})
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-2.5 max-h-40 overflow-y-auto overscroll-contain touch-pan-y hide-scroll">
                                                {allTags.map(tag => (
                                                    <label key={tag} className="flex items-center gap-2.5 cursor-pointer group">
                                                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                            checked={selectedTags.includes(tag)}
                                                            onChange={() => onTagToggle(tag)}
                                                        />
                                                        <span className="text-gray-600 text-xs sm:text-sm font-medium group-hover:text-primary transition-colors">{tag}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Filter */}
                                        <div className="mb-4">
                                            <h4 className="font-bold text-gray-700 mb-2.5 text-xs uppercase tracking-wider">Khoảng Giá</h4>
                                            <div className="flex items-center gap-2 mb-3">
                                                <input type="number" inputMode="numeric" placeholder="Từ" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                                                <span className="text-gray-400">-</span>
                                                <input type="number" inputMode="numeric" placeholder="Đến" className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
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

                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={handleResetFilters}
                                                className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors cursor-pointer"
                                            >
                                                <i className="fa-solid fa-rotate-left mr-1.5"></i> Đặt lại bộ lọc
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Thanh chip bộ lọc nhanh trên trang /san-pham (hoặc khi có filter đang bật) */}
                        {(isFullPage || hasActiveFilters) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {isFullPage && (
                                        <>
                                            {[
                                                { v: '', label: 'Tất cả kho' },
                                                { v: 'in', label: 'Còn hàng' },
                                                { v: 'out', label: 'Tạm hết' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.v || 'all-stock'}
                                                    type="button"
                                                    onClick={() => setStockFilter(opt.v)}
                                                    className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${stockFilter === opt.v ? 'bg-stone-800 text-white border-stone-800' : 'bg-white/75 text-stone-600 border-red-100 hover:border-red-300'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={handleResetFilters}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] sm:text-xs font-semibold cursor-pointer"
                                        >
                                            <i className="fa-solid fa-xmark text-[10px]"></i> Xóa bộ lọc
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* KHU VỰC HIỂN THỊ SẢN PHẨM (Lưới hoặc Dọc) */}
                    <div className="w-full max-w-7xl mx-auto pb-10 mb-8">
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full" aria-busy="true" aria-label="Đang tải sản phẩm">
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <div key={index} className="bg-white/60 border border-red-100/60 rounded-2xl overflow-hidden animate-pulse">
                                        <div className="aspect-square bg-red-50/80"></div>
                                        <div className="p-4 sm:p-5 space-y-2.5">
                                            <div className="h-3.5 bg-red-50 rounded w-full"></div>
                                            <div className="h-3.5 bg-red-50 rounded w-2/3"></div>
                                            <div className="h-5 bg-red-50 rounded w-1/2 mt-3"></div>
                                            <div className="h-9 bg-red-50 rounded-xl mt-2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-20 sm:py-28 text-gray-500 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/80 flex flex-col items-center px-4">
                                <i className="fa-solid fa-box-open text-6xl text-gray-300 mb-4"></i>
                                <p className="text-lg font-semibold text-stone-700">Không tìm thấy sản phẩm nào phù hợp.</p>
                                <p className="text-sm text-stone-500 mt-1.5">Thử từ khóa khác hoặc xóa bớt bộ lọc để xem toàn bộ sản phẩm.</p>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold bg-red-600 hover:bg-red-700 shadow-md active:scale-95 transition-all cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)' }}
                                >
                                    <i className="fa-solid fa-rotate-left"></i> Xóa bộ lọc & tìm kiếm
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={viewMode === 'list' ? 'flex flex-col gap-3 sm:gap-4 w-full' : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full justify-center'}>
                                    {currentProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            layout={viewMode}
                                            isAdmin={isAdmin}
                                            pinnedProductIds={pinnedProductIds}
                                            editingPriceId={editingPriceId}
                                            editingPriceValue={editingPriceValue}
                                            setEditingPriceId={setEditingPriceId}
                                            setEditingPriceValue={setEditingPriceValue}
                                            onTogglePin={handleTogglePinProduct}
                                            onEdit={handleEditClick}
                                            onToggleVisibility={handleToggleVisibility}
                                            onDelete={handleDeleteProduct}
                                            onQuickToggleStock={handleQuickToggleStock}
                                            onQuickPriceSave={handleQuickPriceSave}
                                            onAddToCart={handleAddToCart}
                                        />
                                    ))}
                                </div>

                                {/* Sticky bottom dock cho trang /san-pham đầy đủ: chọn số lượng hiển thị + phân trang dính theo phía dưới */}
                                {isFullPage && filteredProducts.length > 0 && (
                                    <div className="sticky bottom-3 sm:bottom-4 z-30 w-full mt-6 pb-2 flex justify-start lg:justify-center pr-[68px] lg:pr-0 pointer-events-none">
                                        <nav
                                            aria-label="Điều khiển số lượng và phân trang sản phẩm"
                                            className="pointer-events-auto inline-flex flex-col lg:flex-row items-center gap-1.5 lg:gap-2.5 px-2 sm:px-3.5 py-1.5 rounded-2xl lg:rounded-full bg-white/95 backdrop-blur-xl border border-[#EED3AC] shadow-[0_12px_32px_rgba(185,28,28,0.14),0_2px_10px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-full overflow-x-auto no-scrollbar"
                                        >
                                            <div className="inline-flex items-center gap-1.5 flex-shrink-0">
                                                <span className="hidden sm:inline text-xs font-semibold text-stone-500 whitespace-nowrap pl-0.5">
                                                    Hiển thị:
                                                </span>
                                                <div className="inline-flex items-center gap-0.5 bg-[#FAF0E6]/90 border border-[#EED3AC]/80 rounded-full p-0.5 text-[10.5px] sm:text-xs" role="group" aria-label="Số lượng sản phẩm mỗi trang">
                                                    {[{ v: 'all', label: 'Tất cả' }, { v: '15', label: '15/tr' }, { v: '30', label: '30/tr' }].map(opt => (
                                                        <button
                                                            key={opt.v}
                                                            type="button"
                                                            onClick={() => handlePageSizeSelect(opt.v)}
                                                            aria-pressed={pageSizeMode === opt.v}
                                                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${pageSizeMode === opt.v
                                                                ? 'text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]'
                                                                : 'text-stone-600 hover:text-red-600 hover:bg-white/70'}`}
                                                            style={pageSizeMode === opt.v ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96) 0%, rgba(185, 28, 28, 0.96) 100%)' } : undefined}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {totalPages === 1 && (
                                                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-red-50/85 border border-red-200/70 text-[10.5px] sm:text-xs font-bold text-red-700 whitespace-nowrap">
                                                        <span className="sm:hidden">1/1</span>
                                                        <span className="hidden sm:inline">Trang 1 / 1</span>
                                                    </span>
                                                )}
                                            </div>

                                            {totalPages > 1 && (
                                                <>
                                                    <span className="lg:hidden w-full h-px bg-[#EED3AC]/50 flex-shrink-0" aria-hidden="true"></span>
                                                    <span className="hidden lg:block h-5 w-px bg-[#EED3AC]/80 flex-shrink-0" aria-hidden="true"></span>
                                                    <div className="inline-flex items-center gap-0.5 sm:gap-1 max-w-full overflow-x-auto no-scrollbar">
                                                        {renderPaginationControls()}
                                                    </div>
                                                </>
                                            )}
                                        </nav>
                                    </div>
                                )}

                                {/* Pagination cho trang chủ */}
                                {!isFullPage && totalPages > 1 && (
                                    <nav aria-label="Phân trang sản phẩm" className="w-full pt-6 pb-3 flex justify-center px-2">
                                        <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-[#EED3AC]/90 shadow-[0_8px_24px_rgba(185,28,28,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-full overflow-x-auto no-scrollbar">
                                            {renderPaginationControls()}
                                        </div>
                                    </nav>
                                )}

                                {/* Nút Xem tất cả sản phẩm ngay dưới danh sách ở trang chủ */}
                                {!isFullPage && filteredProducts.length > 0 && (
                                    <div className={`w-full flex justify-center px-2 ${totalPages > 1 ? 'pb-6 pt-1' : 'py-6'}`}>
                                        <Link
                                            to="/san-pham"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 hover:bg-red-600 text-red-700 hover:text-white border border-[#EED3AC] hover:border-red-600 shadow-[0_6px_18px_rgba(185,28,28,0.08)] hover:shadow-[0_10px_24px_rgba(220,38,38,0.28)] font-bold text-xs sm:text-sm transition-all duration-200 group"
                                        >
                                            <span>Xem tất cả {filteredProducts.length} sản phẩm</span>
                                            <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-0.5"></i>
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            );
        };

        // --- Main App ---
        const App = () => {
            const navigate = useNavigate();
            const [products, setProducts] = useState([]);
            const [settings, setSettings] = useState(null);
            const [loading, setLoading] = useState(true);

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
            const rawPage = parseInt(searchParams.get('page') || '1', 10);
            const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
            const ITEMS_PER_PAGE = 15;

            // Filter & View Mode States
            const [showFilters, setShowFilters] = useState(false);
            const [selectedTags, setSelectedTags] = useState(() => {
                const rawTag = searchParams.get('tag');
                return rawTag ? rawTag.split(',').map(s => s.trim()).filter(Boolean) : [];
            });
            const [priceMin, setPriceMin] = useState('');
            const [priceMax, setPriceMax] = useState('');
            const [stockFilter, setStockFilter] = useState('');
            const [sortOrder, setSortOrder] = useState('');
            const [viewMode, setViewMode] = useState('grid');
            const [pageSizeMode, setPageSizeMode] = useState('all');
            const [searchResetKey, setSearchResetKey] = useState(0);
            const location = useLocation();
            const isFullProductsRoute = location.pathname === '/san-pham';
            const [cartToast, setCartToast] = useState(null);
            const cartToastTimerRef = useRef(null);

            useEffect(() => {
                if (location.pathname === '/san-pham') {
                    document.title = 'Tất Cả Sản Phẩm | Hùng Thuận Tokcay';
                } else if (location.pathname === '/') {
                    document.title = 'Hùng Thuận Tokcay - Nguyên liệu thực phẩm Hàn Quốc tại Cần Thơ';
                }
            }, [location.pathname]);

            useEffect(() => {
                return () => {
                    if (cartToastTimerRef.current) clearTimeout(cartToastTimerRef.current);
                };
            }, []);

            useEffect(() => {
                const tagFromUrl = searchParams.get('tag');
                if (tagFromUrl !== null) {
                    setSelectedTags(tagFromUrl ? tagFromUrl.split(',').map(s => s.trim()).filter(Boolean) : []);
                }
            }, [searchParams]);

            // Modals
            const [isContactModalOpen, setIsContactModalOpen] = useState(false);

            // Admin State
            const [isAdmin, setIsAdmin] = useState(false);
            const [session, setSession] = useState(null);

            useEffect(() => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    setSession(session);
                    setIsAdmin(Boolean(session && session.user));
                });
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    setSession(session);
                    setIsAdmin(Boolean(session && session.user));
                });
                return () => subscription.unsubscribe();
            }, []);
            const [editingProduct, setEditingProduct] = useState(null);
            const [isProductModalOpen, setIsProductModalOpen] = useState(false);
            const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
            const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

            useEffect(() => {
                const hasOpenModal = isCartOpen || isContactModalOpen || isProductModalOpen || isSettingsModalOpen || isTagsModalOpen;
                if (hasOpenModal) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
                return () => {
                    document.body.style.overflow = '';
                };
            }, [isCartOpen, isContactModalOpen, isProductModalOpen, isSettingsModalOpen, isTagsModalOpen]);

            const [categories, setCategories] = useState([]);
            const [localBanner, setLocalBanner] = useState(null);

            const productsSectionRef = useRef(null);

            const fetchData = async (forceRefresh = false) => {
                let isSilentRevalidate = false;
                if (!forceRefresh) {
                    const cached = readProductsCache();
                    if (cached && Array.isArray(cached.data)) {
                        setProducts(cached.data);
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

            const filtersInitializedRef = useRef(false);

            useEffect(() => {
                // Không reset trang ở lần render đầu để link chia sẻ ?page=2 vẫn giữ nguyên
                if (!filtersInitializedRef.current) {
                    filtersInitializedRef.current = true;
                    return;
                }
                if (currentPage !== 1) {
                    setSearchParams({ page: '1' });
                }
            }, [selectedTags, priceMin, priceMax, stockFilter, sortOrder, pageSizeMode]);

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

            // Hợp nhất danh mục trong bảng tags với tags thực tế của sản phẩm
            // để không bị thiếu bộ lọc khi sản phẩm có tag chưa được tạo trong bảng tags
            const allTags = useMemo(() => {
                const merged = new Set((categories || []).filter(Boolean));
                (products || []).forEach(p => {
                    if (Array.isArray(p.tags)) {
                        p.tags.forEach(t => { if (t) merged.add(t); });
                    }
                });
                return Array.from(merged).sort((a, b) => a.localeCompare(b, 'vi'));
            }, [categories, products]);

            const filteredProducts = useMemo(() => {
                let result = products.filter(p => {
                    if (!isAdmin && p.is_hidden) return false;
                    if (selectedTags.length > 0 && (!p.tags || !selectedTags.some(t => p.tags.includes(t)))) return false;
                    const price = p.price || 0;
                    if (priceMin && price < Number(priceMin)) return false;
                    if (priceMax && price > Number(priceMax)) return false;
                    if (stockFilter !== '') {
                        const isOut = Boolean(p.stock_status && p.stock_status.toLowerCase() === 'hết hàng');
                        if (stockFilter === 'in' && isOut) return false;
                        if (stockFilter === 'out' && !isOut) return false;
                    }
                    return true;
                });

                if (sortOrder === 'asc') {
                    result.sort((a, b) => (a.price || 0) - (b.price || 0));
                } else if (sortOrder === 'desc') {
                    result.sort((a, b) => (b.price || 0) - (a.price || 0));
                } else if (sortOrder === 'name_asc') {
                    result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
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
            }, [products, isAdmin, selectedTags, priceMin, priceMax, stockFilter, sortOrder, pinnedProductIds]);

            const effectiveItemsPerPage = isFullProductsRoute
                ? (pageSizeMode === 'all' ? Math.max(1, filteredProducts.length) : Number(pageSizeMode) || ITEMS_PER_PAGE)
                : ITEMS_PER_PAGE;
            const totalPages = Math.max(1, Math.ceil(filteredProducts.length / effectiveItemsPerPage));
            const safePage = Math.min(currentPage, totalPages);
            const currentProducts = filteredProducts.slice((safePage - 1) * effectiveItemsPerPage, safePage * effectiveItemsPerPage);

            // Handlers
            const handleAddToCart = (product, quantity = 1) => {
                if (product.stock_status && product.stock_status.toLowerCase() === 'hết hàng') return;
                const qtyToAdd = Math.max(1, Number(quantity) || 1);
                const nextCartCount = cart.reduce((sum, item) => sum + item.qty, 0) + qtyToAdd;
                setCart(prev => {
                    const existing = prev.find(i => i.id === product.id);
                    if (existing) {
                        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qtyToAdd } : i);
                    }
                    return [...prev, { ...product, qty: qtyToAdd }];
                });
                setCartToast({ name: product.name, qty: qtyToAdd, count: nextCartCount });
                if (cartToastTimerRef.current) clearTimeout(cartToastTimerRef.current);
                cartToastTimerRef.current = setTimeout(() => setCartToast(null), 3200);
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

            const handleAdminLogin = async (e) => {
                if (e && e.preventDefault) e.preventDefault();
                
                if (e && e.target && e.target.email) {
                    const rawEmail = String(e.target.email.value || '').trim();
                    const emailInput = (rawEmail && !/\s/.test(rawEmail) && !rawEmail.includes('@'))
                        ? `${rawEmail}@gmail.com`
                        : rawEmail;
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

            // 4. Admin Export Price List to Excel (XLSX, formatted table)
            const handleExportPriceListExcel = async () => {
                const exportList = filteredProducts.length > 0 ? filteredProducts : products;
                const mod = await import('xlsx-js-style');
                const XLSX = mod.default || mod;

                const headers = ['STT', 'Mã SP', 'Tên sản phẩm', 'Danh mục', 'Giá bán lẻ (VNĐ)', 'Tình trạng kho', 'Nổi bật', 'Link sản phẩm'];
                const today = new Date();
                const todayStr = today.toLocaleDateString('vi-VN');

                const aoa = [
                    ['BẢNG BÁO GIÁ SẢN PHẨM - HÙNG THUẬN TOKCAY KOREA FOODS'],
                    [`Ngày xuất: ${todayStr}  •  Tổng số mặt hàng: ${exportList.length}`],
                    headers,
                    ...exportList.map((p, idx) => {
                        const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : '';
                        const isPinned = pinnedProductIds.includes(Number(p.id)) ? 'Đã ghim' : '';
                        const link = `${window.location.origin}/san-pham/${p.slug || p.id}`;
                        return [
                            idx + 1,
                            p.sku || `SP-${p.id}`,
                            p.name || '',
                            tagsStr,
                            Number(p.price) || 0,
                            p.stock_status || 'Hàng sẵn tại kho',
                            isPinned,
                            link
                        ];
                    })
                ];

                const ws = XLSX.utils.aoa_to_sheet(aoa);
                const lastRow = aoa.length; // 1-based row index of the last data row
                const lastCol = headers.length - 1;

                ws['!cols'] = [
                    { wch: 6 },   // STT
                    { wch: 15 },  // Mã SP
                    { wch: 42 },  // Tên sản phẩm
                    { wch: 26 },  // Danh mục
                    { wch: 17 },  // Giá bán lẻ
                    { wch: 20 },  // Tình trạng kho
                    { wch: 11 },  // Nổi bật
                    { wch: 52 }   // Link
                ];

                ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }, { hpt: 30 }];
                for (let r = 3; r < lastRow; r++) ws['!rows'][r] = { hpt: 22 };

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }
                ];

                const border = {
                    top: { style: 'thin', color: { rgb: 'D6D3D1' } },
                    bottom: { style: 'thin', color: { rgb: 'D6D3D1' } },
                    left: { style: 'thin', color: { rgb: 'D6D3D1' } },
                    right: { style: 'thin', color: { rgb: 'D6D3D1' } }
                };

                const setStyle = (r, c, style) => {
                    const ref = XLSX.utils.encode_cell({ r, c });
                    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
                    ws[ref].s = style;
                };

                // Tiêu đề
                setStyle(0, 0, {
                    font: { bold: true, sz: 15, color: { rgb: 'B91C1C' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                });
                setStyle(1, 0, {
                    font: { italic: true, sz: 10, color: { rgb: '57534E' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                });

                // Dòng tiêu đề cột
                for (let c = 0; c <= lastCol; c++) {
                    setStyle(2, c, {
                        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
                        fill: { patternType: 'solid', fgColor: { rgb: 'B91C1C' } },
                        alignment: { horizontal: c === 4 ? 'right' : 'center', vertical: 'center', wrapText: true },
                        border
                    });
                }

                // Dữ liệu
                for (let r = 3; r < lastRow; r++) {
                    const evenFill = r % 2 === 1 ? { patternType: 'solid', fgColor: { rgb: 'FAF9F7' } } : undefined;
                    for (let c = 0; c <= lastCol; c++) {
                        const isPrice = c === 4;
                        const linkCell = c === 7 ? ws[XLSX.utils.encode_cell({ r, c })] : null;
                        if (linkCell) {
                            linkCell.l = { Target: linkCell.v, Tooltip: linkCell.v };
                        }
                        setStyle(r, c, {
                            font: {
                                sz: 11,
                                bold: isPrice,
                                color: { rgb: isPrice ? 'B91C1C' : c === 7 ? '0068FF' : '1C1917' },
                                underline: c === 7
                            },
                            fill: evenFill,
                            numFmt: isPrice ? '#,##0' : undefined,
                            alignment: {
                                horizontal: isPrice ? 'right' : [0, 1, 5, 6].includes(c) ? 'center' : 'left',
                                vertical: 'center',
                                wrapText: c === 2 || c === 3 || c === 7
                            },
                            border
                        });
                    }
                }

                ws['!autofilter'] = { ref: `A3:${XLSX.utils.encode_col(lastCol)}${lastRow}` };

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Bang Gia');
                XLSX.writeFile(wb, `Bang-Gia-Hung-Thuan-Tokcay-${today.toLocaleDateString('en-CA')}.xlsx`, { compression: true });
            };

            // 5. Admin Print / Save PDF Price List
            const handlePrintPriceListPDF = () => {
                const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, (m) => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[m]));
                const sanitizeImageUrl = (url) => {
                    if (!url) return FallbackImage;
                    const clean = String(url).trim();
                    if (clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('data:image/')) {
                        return escapeHtml(clean);
                    }
                    return FallbackImage;
                };

                const exportList = (filteredProducts.length > 0 ? filteredProducts : products)
                    .filter(p => !p.is_hidden)
                    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' }));
                const todayStr = escapeHtml(new Date().toLocaleDateString('vi-VN'));
                const printWin = window.open('', '_blank', 'width=1000,height=800');
                if (!printWin) {
                    alert('Vui lòng cho phép mở cửa sổ bật lên (Pop-up) để in bảng giá.');
                    return;
                }
                const rowsHtml = exportList.map((p, idx) => {
                    const tagsStr = escapeHtml(Array.isArray(p.tags) ? p.tags.join(', ') : '');
                    const priceStr = escapeHtml(formatVND(p.price));
                    const rawStock = p.stock_status || 'Hàng sẵn tại kho';
                    const isOut = rawStock.toLowerCase() === 'hết hàng';
                    const stockStr = escapeHtml(rawStock);
                    const safeName = escapeHtml(p.name || '');
                    const safeImage = sanitizeImageUrl(p.image_url);
                    return `
                        <tr>
                            <td style="text-align:center;font-weight:600;">${idx + 1}</td>
                            <td style="text-align:center;">
                                <img src="${safeImage}" style="width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid #eee;" />
                            </td>
                            <td style="font-weight:700;color:#1c1917;">${safeName}</td>
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
                const nextTags = (tag === '' || tag === 'ALL')
                    ? []
                    : selectedTags.includes(tag)
                        ? selectedTags.filter(t => t !== tag)
                        : [...selectedTags, tag];
                setSelectedTags(nextTags);
                if (searchParams.has('tag')) {
                    const nextParams = new URLSearchParams(searchParams);
                    if (nextTags.length > 0) nextParams.set('tag', nextTags.join(','));
                    else nextParams.delete('tag');
                    nextParams.delete('page');
                    setSearchParams(nextParams);
                }
            };

            const handlePresetPrice = (min, max) => {
                setPriceMin(min);
                setPriceMax(max);
            };

            const handleResetFilters = () => {
                setSelectedTags([]);
                setPriceMin('');
                setPriceMax('');
                setStockFilter('');
                setSortOrder('');
                setShowFilters(false);
                setSearchResetKey(prev => prev + 1);
                setSearchParams({});
            };

            const handleProductsNavClick = () => {
                setSelectedTags([]);
                setPriceMin('');
                setPriceMax('');
                setStockFilter('');
                setSortOrder('');
                setShowFilters(false);
                setSearchResetKey(prev => prev + 1);
                sessionStorage.removeItem('homeScrollY');
                navigate('/san-pham');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            const handleLogoClick = (e) => {
                if (e && e.preventDefault) e.preventDefault();
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

                    <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                        <Routes>
                            <Route path="/" element={
                                <>
                                    <HomeScrollRestoration />
                                    <HeroBanner
                                        bannerMobileUrl={settings?.banner_mobile_url}
                                        bannerDesktopUrl={settings?.banner_desktop_url}
                                        settingsReady={settings !== null || !loading}
                                        isAdmin={isAdmin}
                                        onBannerMobileUpload={(e) => handleAppBannerUpload(e, 'mobile')}
                                        onBannerDesktopUpload={(e) => handleAppBannerUpload(e, 'desktop')}
                                    />
                                    <ProductCatalogSection
                                        isFullPage={false}
                                        isAdmin={isAdmin}
                                        productsSectionRef={productsSectionRef}
                                        allTags={allTags}
                                        selectedTags={selectedTags}
                                        onTagToggle={handleTagToggle}
                                        onManageTags={() => setIsTagsModalOpen(true)}
                                        filteredProducts={filteredProducts}
                                        currentProducts={currentProducts}
                                        loading={loading}
                                        showFilters={showFilters}
                                        setShowFilters={setShowFilters}
                                        priceMin={priceMin}
                                        setPriceMin={setPriceMin}
                                        priceMax={priceMax}
                                        setPriceMax={setPriceMax}
                                        handlePresetPrice={handlePresetPrice}
                                        stockFilter={stockFilter}
                                        setStockFilter={setStockFilter}
                                        sortOrder={sortOrder}
                                        setSortOrder={setSortOrder}
                                        viewMode={viewMode}
                                        setViewMode={setViewMode}
                                        pageSizeMode={pageSizeMode}
                                        setPageSizeMode={setPageSizeMode}
                                        handleResetFilters={handleResetFilters}
                                        safePage={safePage}
                                        totalPages={totalPages}
                                        handlePageChange={handlePageChange}
                                        pinnedProductIds={pinnedProductIds}
                                        editingPriceId={editingPriceId}
                                        setEditingPriceId={setEditingPriceId}
                                        editingPriceValue={editingPriceValue}
                                        setEditingPriceValue={setEditingPriceValue}
                                        handleTogglePinProduct={handleTogglePinProduct}
                                        handleEditClick={handleEditClick}
                                        handleToggleVisibility={handleToggleVisibility}
                                        handleDeleteProduct={handleDeleteProduct}
                                        handleQuickToggleStock={handleQuickToggleStock}
                                        handleQuickPriceSave={handleQuickPriceSave}
                                        handleAddToCart={handleAddToCart}
                                        setEditingProduct={setEditingProduct}
                                        setIsProductModalOpen={setIsProductModalOpen}
                                        handleExportPriceListExcel={handleExportPriceListExcel}
                                        handlePrintPriceListPDF={handlePrintPriceListPDF}
                                        setIsSettingsModalOpen={setIsSettingsModalOpen}
                                    />
                                </>
                            } />
                            <Route path="/san-pham" element={
                                <ProductCatalogSection
                                    isFullPage={true}
                                    isAdmin={isAdmin}
                                    productsSectionRef={productsSectionRef}
                                    allTags={allTags}
                                    selectedTags={selectedTags}
                                    onTagToggle={handleTagToggle}
                                    onManageTags={() => setIsTagsModalOpen(true)}
                                    filteredProducts={filteredProducts}
                                    currentProducts={currentProducts}
                                    loading={loading}
                                    showFilters={showFilters}
                                    setShowFilters={setShowFilters}
                                    priceMin={priceMin}
                                    setPriceMin={setPriceMin}
                                    priceMax={priceMax}
                                    setPriceMax={setPriceMax}
                                    handlePresetPrice={handlePresetPrice}
                                    stockFilter={stockFilter}
                                    setStockFilter={setStockFilter}
                                    sortOrder={sortOrder}
                                    setSortOrder={setSortOrder}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    pageSizeMode={pageSizeMode}
                                    setPageSizeMode={setPageSizeMode}
                                    handleResetFilters={handleResetFilters}
                                    safePage={safePage}
                                    totalPages={totalPages}
                                    handlePageChange={handlePageChange}
                                    pinnedProductIds={pinnedProductIds}
                                    editingPriceId={editingPriceId}
                                    setEditingPriceId={setEditingPriceId}
                                    editingPriceValue={editingPriceValue}
                                    setEditingPriceValue={setEditingPriceValue}
                                    handleTogglePinProduct={handleTogglePinProduct}
                                    handleEditClick={handleEditClick}
                                    handleToggleVisibility={handleToggleVisibility}
                                    handleDeleteProduct={handleDeleteProduct}
                                    handleQuickToggleStock={handleQuickToggleStock}
                                    handleQuickPriceSave={handleQuickPriceSave}
                                    handleAddToCart={handleAddToCart}
                                    setEditingProduct={setEditingProduct}
                                    setIsProductModalOpen={setIsProductModalOpen}
                                    handleExportPriceListExcel={handleExportPriceListExcel}
                                    handlePrintPriceListPDF={handlePrintPriceListPDF}
                                    setIsSettingsModalOpen={setIsSettingsModalOpen}
                                />
                            } />
                            <Route path="/san-pham/:slug" element={<ProductDetail onAddToCart={handleAddToCart} onContactClick={() => setIsContactModalOpen(true)} products={products} parentLoading={loading} settings={settings} />} />
                            <Route path="/admin/*" element={
                                <div className="px-4 py-10 sm:p-16 text-center flex flex-col items-center justify-center min-h-[55vh]">
                                    <ScrollToTopAdmin />
                                    <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-xl border border-[#EED3AC] shadow-[0_14px_40px_rgba(185,28,28,0.1)] p-6 sm:p-8 flex flex-col items-center">
                                        <span className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200/70 text-red-600 flex items-center justify-center mb-4 shadow-xs">
                                            <i className="fa-solid fa-shield-halved text-3xl"></i>
                                        </span>
                                        <h2 className="text-2xl sm:text-3xl font-black text-stone-800 mb-2">Khu Vực Quản Trị</h2>
                                        <p className="text-xs sm:text-sm text-stone-500 mb-2 max-w-sm">
                                            Dành riêng cho Admin để thêm, sửa, xóa sản phẩm và cài đặt hệ thống.
                                        </p>
                                        {!isAdmin && <AdminLoginForm onSubmit={handleAdminLogin} />}

                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => navigate('/')}
                                                className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                                                <span>Vào trang Quản trị</span>
                                            </button>
                                        )}
                                    </div>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>

                    {cartToast && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[65] w-[calc(100vw-2rem)] max-w-md animate-fade-in"
                        >
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-emerald-200 shadow-[0_12px_32px_rgba(16,185,129,0.18),0_4px_12px_rgba(0,0,0,0.08)]">
                                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <i className="fa-solid fa-check text-xs"></i>
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-bold text-stone-800 truncate">
                                        Đã thêm {cartToast.qty > 1 ? `x${cartToast.qty} ` : ''}{cartToast.name}
                                    </p>
                                    <p className="text-[11px] text-stone-500">Giỏ hàng hiện có {cartToast.count} sản phẩm</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCartToast(null);
                                        setIsCartOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold whitespace-nowrap flex-shrink-0 shadow-xs transition-colors cursor-pointer"
                                >
                                    Xem giỏ ({cartToast.count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCartToast(null)}
                                    aria-label="Đóng thông báo"
                                    className="w-6 h-6 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    <CartSlideOver isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} setCart={setCart} zaloNumber={settings?.link_zalo || settings?.zalo_number} />
                    <BackToTopButton />
                    <ZaloWidget zaloNumber={settings?.link_zalo || settings?.zalo_number} />
                    <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} settings={settings} />

                    {isAdmin && (
                        <>
                            <AdminProductModal
                                isOpen={isProductModalOpen}
                                onClose={() => setIsProductModalOpen(false)}
                                product={editingProduct}
                                onSave={handleSaveProduct}
                                uniqueTags={allTags}
                                products={products}
                                onSwitchToEdit={(existingProd) => setEditingProduct(existingProd)}
                            />
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
