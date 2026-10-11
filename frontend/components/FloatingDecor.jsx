import React, { useEffect, useRef } from 'react';

// HỆ THỐNG 30 ICONS - 3 LỚP CHIỀU SÂU + KÍNH MỜ (3-Layer Depth-of-Field Parallax & Ambient Glass)
// Chỉ sử dụng đúng 9 ảnh đã tách nền (/decor-clean/decor-1.png -> decor-9.png)

// LỚP 1 - LỚP XA (FAR LAYER - Giữa trang: 10 items)
// Chia vào 4 trục ngang: 20%, 38%, 58%, 76% | Rải đều từ 8% đến 135% | Speed cố định: -0.07
const FAR_LAYER_ITEMS = [
    { id: 'far-1', src: '/decor-clean/decor-1.png', left: '20%', top: '8%', rotate: -18, speed: -0.07, delay: '0s', duration: '7.6s' },
    { id: 'far-2', src: '/decor-clean/decor-3.png', left: '58%', top: '22%', rotate: 16, speed: -0.07, delay: '1.1s', duration: '8.2s' },
    { id: 'far-3', src: '/decor-clean/decor-6.png', left: '38%', top: '36%', rotate: -21, speed: -0.07, delay: '2.3s', duration: '7.9s' },
    { id: 'far-4', src: '/decor-clean/decor-8.png', left: '76%', top: '50%', rotate: 24, speed: -0.07, delay: '0.7s', duration: '8.4s' },
    { id: 'far-5', src: '/decor-clean/decor-2.png', left: '20%', top: '64%', rotate: 15, speed: -0.07, delay: '1.8s', duration: '7.5s' },
    { id: 'far-6', src: '/decor-clean/decor-9.png', left: '58%', top: '78%', rotate: -19, speed: -0.07, delay: '2.9s', duration: '8.1s' },
    { id: 'far-7', src: '/decor-clean/decor-4.png', left: '38%', top: '92%', rotate: 22, speed: -0.07, delay: '0.4s', duration: '7.7s' },
    { id: 'far-8', src: '/decor-clean/decor-7.png', left: '76%', top: '106%', rotate: -17, speed: -0.07, delay: '1.5s', duration: '8.3s' },
    { id: 'far-9', src: '/decor-clean/decor-5.png', left: '20%', top: '120%', rotate: 20, speed: -0.07, delay: '2.6s', duration: '7.8s' },
    { id: 'far-10', src: '/decor-clean/decor-1.png', left: '58%', top: '135%', rotate: -23, speed: -0.07, delay: '0.9s', duration: '8.0s' },
];

// LỚP 2 - LỚP TRUNG (MID LAYER - Rìa trong: 10 items)
// Lề trái (7%-11% - 5 items) & Lề phải (7%-11% - 5 items) | Speed cố định: -0.15
const MID_LAYER_ITEMS = [
    // Bên trái: 10%, 36%, 62%, 88%, 114%
    { id: 'mid-L1', src: '/decor-clean/decor-2.png', left: '8.5%', top: '10%', rotate: 18, speed: -0.15, delay: '0.3s', duration: '6.8s' },
    { id: 'mid-L2', src: '/decor-clean/decor-5.png', left: '10.5%', top: '36%', rotate: -16, speed: -0.15, delay: '1.6s', duration: '7.1s' },
    { id: 'mid-L3', src: '/decor-clean/decor-8.png', left: '7.5%', top: '62%', rotate: 23, speed: -0.15, delay: '2.4s', duration: '6.6s' },
    { id: 'mid-L4', src: '/decor-clean/decor-3.png', left: '9.8%', top: '88%', rotate: -20, speed: -0.15, delay: '0.8s', duration: '7.3s' },
    { id: 'mid-L5', src: '/decor-clean/decor-6.png', left: '8.0%', top: '114%', rotate: 15, speed: -0.15, delay: '2.0s', duration: '6.9s' },

    // Bên phải (so le nhẹ với bên trái): 16%, 42%, 68%, 94%, 120%
    { id: 'mid-R1', src: '/decor-clean/decor-7.png', right: '8.8%', top: '16%', rotate: -22, speed: -0.15, delay: '1.2s', duration: '7.0s' },
    { id: 'mid-R2', src: '/decor-clean/decor-4.png', right: '10.6%', top: '42%', rotate: 19, speed: -0.15, delay: '2.7s', duration: '6.7s' },
    { id: 'mid-R3', src: '/decor-clean/decor-1.png', right: '7.6%', top: '68%', rotate: -15, speed: -0.15, delay: '0.5s', duration: '7.2s' },
    { id: 'mid-R4', src: '/decor-clean/decor-9.png', right: '9.4%', top: '94%', rotate: 25, speed: -0.15, delay: '1.9s', duration: '6.8s' },
    { id: 'mid-R5', src: '/decor-clean/decor-2.png', right: '8.2%', top: '120%', rotate: -18, speed: -0.15, delay: '3.0s', duration: '7.1s' },
];

// LỚP 3 - LỚP GẦN (NEAR LAYER - Sát 2 lề ngoài cùng: 10 items)
// Lề trái (1%-3.5% - 5 items) & Lề phải (1%-3.5% - 5 items) | Speed cố định: -0.26
const NEAR_LAYER_ITEMS = [
    // Bên trái: 4%, 28%, 54%, 80%, 106%
    { id: 'near-L1', src: '/decor-clean/decor-9.png', left: '1.4%', top: '4%', rotate: -25, speed: -0.26, delay: '0.2s', duration: '5.8s' },
    { id: 'near-L2', src: '/decor-clean/decor-4.png', left: '2.8%', top: '28%', rotate: 21, speed: -0.26, delay: '1.4s', duration: '6.1s' },
    { id: 'near-L3', src: '/decor-clean/decor-6.png', left: '1.2%', top: '54%', rotate: -17, speed: -0.26, delay: '2.5s', duration: '5.7s' },
    { id: 'near-L4', src: '/decor-clean/decor-7.png', left: '3.1%', top: '80%', rotate: 26, speed: -0.26, delay: '0.9s', duration: '6.3s' },
    { id: 'near-L5', src: '/decor-clean/decor-3.png', left: '1.8%', top: '106%', rotate: -22, speed: -0.26, delay: '2.1s', duration: '5.9s' },

    // Bên phải: 8%, 32%, 58%, 84%, 110%
    { id: 'near-R1', src: '/decor-clean/decor-5.png', right: '1.5%', top: '8%', rotate: 23, speed: -0.26, delay: '0.6s', duration: '6.0s' },
    { id: 'near-R2', src: '/decor-clean/decor-8.png', right: '3.0%', top: '32%', rotate: -24, speed: -0.26, delay: '1.8s', duration: '5.6s' },
    { id: 'near-R3', src: '/decor-clean/decor-2.png', right: '1.3%', top: '58%', rotate: 19, speed: -0.26, delay: '2.9s', duration: '6.2s' },
    { id: 'near-R4', src: '/decor-clean/decor-1.png', right: '2.7%', top: '84%', rotate: -26, speed: -0.26, delay: '1.1s', duration: '5.8s' },
    { id: 'near-R5', src: '/decor-clean/decor-4.png', right: '1.6%', top: '110%', rotate: 20, speed: -0.26, delay: '2.3s', duration: '6.1s' },
];

const FloatingDecor = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        let ticking = false;
        let rafId = null;

        const updateScroll = () => {
            if (containerRef.current) {
                const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
                containerRef.current.style.setProperty('--scroll-y', `${currentScrollY}px`);
            }
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                rafId = window.requestAnimationFrame(updateScroll);
                ticking = true;
            }
        };

        updateScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 h-[100lvh] z-0 pointer-events-none overflow-hidden select-none"
            style={{ '--scroll-y': '0px' }}
            aria-hidden="true"
        >
            <style>{`
                @keyframes dofFloat {
                    0%, 100% {
                        transform: translate3d(0, 0px, 0) rotate(0deg);
                    }
                    50% {
                        transform: translate3d(0, -6px, 0) rotate(3deg);
                    }
                }
            `}</style>

            {/* LỚP 1: LỚP XA (FAR LAYER - 10 items giữa trang, speed -0.07, opacity 0.14, blur 1.5px) */}
            {FAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-9 sm:w-11 md:w-13 lg:w-15 opacity-[0.14] will-change-transform"
                    style={{
                        top: item.top,
                        left: item.left,
                        filter: 'blur(1.5px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block"
                        style={{
                            animation: `dofFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                        }}
                    />
                </div>
            ))}

            {/* TẦNG NỀN KÍNH MỜ (Ambient Glass Backdrop - Đè lên Lớp Xa nhưng nằm dưới Lớp Trung & Lớp Gần) */}
            <div className="fixed inset-0 h-[100lvh] pointer-events-none bg-white/25 backdrop-blur-[1.5px] bg-gradient-to-br from-red-50/30 via-white/20 to-orange-50/20" />

            {/* LỚP 2: LỚP TRUNG (MID LAYER - 10 items rìa trong, speed -0.15, opacity 0.22, blur 0.5px) */}
            {MID_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-11 sm:w-14 md:w-16 lg:w-20 opacity-[0.22] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0.5px) drop-shadow(0 4px 8px rgba(0,0,0,0.05))',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block"
                        style={{
                            animation: `dofFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                        }}
                    />
                </div>
            ))}

            {/* LỚP 3: LỚP GẦN (NEAR LAYER - 10 items sát 2 lề, speed -0.26, opacity 0.24 Mobile / 0.32 PC, rõ nét 100%) */}
            {NEAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-12 sm:w-16 md:w-20 lg:w-24 opacity-[0.24] md:opacity-[0.32] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0px) drop-shadow(0 10px 15px rgba(0,0,0,0.08))',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block"
                        style={{
                            animation: `dofFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default FloatingDecor;

