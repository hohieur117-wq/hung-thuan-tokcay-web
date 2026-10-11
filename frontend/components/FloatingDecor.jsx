import React, { useState, useEffect } from 'react';

// KIẾN TRÚC 3 LỚP XA - TRUNG - GẦN (3-Layer Depth-of-Field Parallax)
// Mỗi lớp có trục ngang (X) tách biệt hoàn toàn và đồng bộ tốc độ cuộn (speed) trong nội bộ lớp,
// đảm bảo 100% không bao giờ xảy ra hiện tượng icon đuổi kịp hoặc đè lên nhau khi cuộn trang.

// LỚP 1 - LỚP XA (FAR LAYER - Vùng giữa trang cho Mobile, Tablet, PC)
// Trục X: 22%, 48%, 74% | Tầng dọc: 12%, 35%, 58%, 82%, 108%, 130% | Speed cố định: -0.06
const FAR_LAYER_ITEMS = [
    { id: 'far-1', src: '/decor-clean/decor-3.png', left: '22%', top: '12%', rotate: -16, speed: -0.06, delay: '0s', duration: '7.5s' },
    { id: 'far-2', src: '/decor-clean/decor-8.png', left: '74%', top: '35%', rotate: 19, speed: -0.06, delay: '1.2s', duration: '8.2s' },
    { id: 'far-3', src: '/decor-clean/decor-1.png', left: '48%', top: '58%', rotate: -22, speed: -0.06, delay: '2.4s', duration: '7.8s' },
    { id: 'far-4', src: '/decor-clean/decor-6.png', left: '22%', top: '82%', rotate: 15, speed: -0.06, delay: '0.8s', duration: '8.6s' },
    { id: 'far-5', src: '/decor-clean/decor-9.png', left: '74%', top: '108%', rotate: -18, speed: -0.06, delay: '1.9s', duration: '7.4s' },
    { id: 'far-6', src: '/decor-clean/decor-4.png', left: '48%', top: '130%', rotate: 21, speed: -0.06, delay: '3.1s', duration: '8.0s' },
];

// LỚP 2 - LỚP TRUNG (MID LAYER - Rìa trong cho Tablet & PC, mép màn hình cho Mobile)
// Trục X: left 8%-12%, right 8%-12% | Tầng dọc: 18%, 44%, 70%, 96%, 122% | Speed cố định: -0.14
const MID_LAYER_ITEMS = [
    { id: 'mid-1', src: '/decor-clean/decor-2.png', left: '9.5%', top: '18%', rotate: 17, speed: -0.14, delay: '0.4s', duration: '6.8s' },
    { id: 'mid-2', src: '/decor-clean/decor-7.png', right: '9.5%', top: '18%', rotate: -20, speed: -0.14, delay: '1.7s', duration: '7.2s' },
    { id: 'mid-3', src: '/decor-clean/decor-5.png', left: '11%', top: '44%', rotate: -14, speed: -0.14, delay: '2.6s', duration: '6.5s' },
    { id: 'mid-4', src: '/decor-clean/decor-1.png', right: '10.5%', top: '70%', rotate: 23, speed: -0.14, delay: '0.9s', duration: '7.4s' },
    { id: 'mid-5', src: '/decor-clean/decor-8.png', left: '8.5%', top: '96%', rotate: 19, speed: -0.14, delay: '2.1s', duration: '6.9s' },
    { id: 'mid-6', src: '/decor-clean/decor-3.png', right: '8.8%', top: '122%', rotate: -15, speed: -0.14, delay: '1.3s', duration: '7.1s' },
];

// LỚP 3 - LỚP GẦN (NEAR LAYER - Sát 2 bên lề ngoài cùng)
// Trục X: left 1%-3.5%, right 1%-3.5% | Tầng dọc: 6%, 28%, 52%, 76%, 102%, 128% | Speed cố định: -0.25
const NEAR_LAYER_ITEMS = [
    { id: 'near-1', src: '/decor-clean/decor-1.png', left: '1.5%', top: '6%', rotate: -24, speed: -0.25, delay: '0.2s', duration: '5.8s' },
    { id: 'near-2', src: '/decor-clean/decor-9.png', right: '1.6%', top: '6%', rotate: 22, speed: -0.25, delay: '1.5s', duration: '6.2s' },
    { id: 'near-3', src: '/decor-clean/decor-4.png', left: '2.4%', top: '28%', rotate: 18, speed: -0.25, delay: '2.8s', duration: '6.0s' },
    { id: 'near-4', src: '/decor-clean/decor-2.png', right: '2.2%', top: '52%', rotate: -25, speed: -0.25, delay: '0.7s', duration: '5.6s' },
    { id: 'near-5', src: '/decor-clean/decor-6.png', left: '1.4%', top: '76%', rotate: -19, speed: -0.25, delay: '1.9s', duration: '6.4s' },
    { id: 'near-6', src: '/decor-clean/decor-5.png', right: '1.8%', top: '76%', rotate: 26, speed: -0.25, delay: '3.0s', duration: '5.9s' },
    { id: 'near-7', src: '/decor-clean/decor-7.png', left: '2.8%', top: '102%', rotate: 21, speed: -0.25, delay: '1.1s', duration: '6.3s' },
    { id: 'near-8', src: '/decor-clean/decor-9.png', right: '2.5%', top: '128%', rotate: -23, speed: -0.25, delay: '2.3s', duration: '6.1s' },
];

const FloatingDecor = () => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        let ticking = false;

        const updateScroll = () => {
            setScrollY(window.scrollY || window.pageYOffset || 0);
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateScroll);
                ticking = true;
            }
        };

        updateScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
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

            {/* LỚP 1: LỚP XA (FAR LAYER - Giữa trang, blur nhẹ 1.5px, opacity 0.10 trên Mobile / 0.12 trên PC) */}
            {FAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-9 sm:w-11 md:w-13 lg:w-14 opacity-[0.10] md:opacity-[0.12] will-change-transform"
                    style={{
                        top: item.top,
                        left: item.left,
                        filter: 'blur(1.5px)',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
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

            {/* LỚP 2: LỚP TRUNG (MID LAYER - Rìa trong, blur 0.4px, opacity 0.20) */}
            {MID_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-11 sm:w-14 md:w-16 lg:w-20 opacity-[0.20] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0.4px) drop-shadow(0 4px 8px rgba(0,0,0,0.04))',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
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

            {/* LỚP 3: LỚP GẦN (NEAR LAYER - Sát 2 lề ngoài cùng, rõ nét 100%, opacity 0.22 trên Mobile / 0.28 trên PC) */}
            {NEAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-12 sm:w-16 md:w-20 lg:w-24 opacity-[0.22] md:opacity-[0.28] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0px) drop-shadow(0 10px 15px rgba(0,0,0,0.08))',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
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
