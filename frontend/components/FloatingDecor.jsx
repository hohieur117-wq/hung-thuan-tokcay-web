import React, { useEffect, useRef } from 'react';

// HỆ THỐNG FLOATING ICONS NỔI KHỐI 3D (3D Pop Effect & Synchronized Parallax)
// Chỉ sử dụng đúng 9 ảnh đã tách nền (/decor-clean/decor-1.png -> decor-9.png)

// 1. KHU VỰC CHÍNH GIỮA (CENTER ZONE: 14 items chia vào 5 rãnh dọc, speed đồng bộ theo rãnh -0.10 đến -0.14)
const CENTER_LAYER_ITEMS = [
    // Rãnh 1: left 18% (speed: -0.11)
    { id: 'center-1', src: '/decor-clean/decor-1.png', left: '18%', top: '8%', rotate: -16, speed: -0.11, delay: '0.2s', duration: '7.5s' },
    { id: 'center-2', src: '/decor-clean/decor-6.png', left: '18%', top: '54%', rotate: 20, speed: -0.11, delay: '1.4s', duration: '8.1s' },
    { id: 'center-3', src: '/decor-clean/decor-4.png', left: '18%', top: '98%', rotate: -14, speed: -0.11, delay: '2.5s', duration: '7.2s' },

    // Rãnh 2: left 33% (speed: -0.13)
    { id: 'center-4', src: '/decor-clean/decor-3.png', left: '33%', top: '22%', rotate: 18, speed: -0.13, delay: '1.0s', duration: '7.8s' },
    { id: 'center-5', src: '/decor-clean/decor-9.png', left: '33%', top: '68%', rotate: -22, speed: -0.13, delay: '2.1s', duration: '8.4s' },
    { id: 'center-6', src: '/decor-clean/decor-2.png', left: '33%', top: '114%', rotate: 15, speed: -0.13, delay: '0.6s', duration: '7.4s' },

    // Rãnh 3: left 48% (speed: -0.10)
    { id: 'center-7', src: '/decor-clean/decor-5.png', left: '48%', top: '14%', rotate: -18, speed: -0.10, delay: '0.8s', duration: '8.0s' },
    { id: 'center-8', src: '/decor-clean/decor-7.png', left: '48%', top: '60%', rotate: 24, speed: -0.10, delay: '2.3s', duration: '7.6s' },
    { id: 'center-9', src: '/decor-clean/decor-8.png', left: '48%', top: '124%', rotate: -20, speed: -0.10, delay: '1.7s', duration: '8.2s' },

    // Rãnh 4: left 63% (speed: -0.14)
    { id: 'center-10', src: '/decor-clean/decor-2.png', left: '63%', top: '28%', rotate: 22, speed: -0.14, delay: '0.5s', duration: '7.3s' },
    { id: 'center-11', src: '/decor-clean/decor-1.png', left: '63%', top: '76%', rotate: -17, speed: -0.14, delay: '1.9s', duration: '8.3s' },
    { id: 'center-12', src: '/decor-clean/decor-6.png', left: '63%', top: '118%', rotate: 19, speed: -0.14, delay: '2.8s', duration: '7.7s' },

    // Rãnh 5: left 78% (speed: -0.12)
    { id: 'center-13', src: '/decor-clean/decor-8.png', left: '78%', top: '18%', rotate: -24, speed: -0.12, delay: '1.2s', duration: '7.9s' },
    { id: 'center-14', src: '/decor-clean/decor-3.png', left: '78%', top: '86%', rotate: 16, speed: -0.12, delay: '0.4s', duration: '8.5s' },
];

// 2. LỚP TRUNG (MID LAYER - Rìa trong 2 bên: 10 items | Speed: -0.15)
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

// 3. LỚP GẦN (NEAR LAYER - Sát 2 lề ngoài cùng: 10 items | Speed: -0.26)
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
                @keyframes pop3dFloat {
                    0%, 100% {
                        transform: perspective(600px) rotateX(8deg) rotateY(-8deg) scale(1.04) translate3d(0, 0px, 0);
                    }
                    50% {
                        transform: perspective(600px) rotateX(5deg) rotateY(-5deg) scale(1.07) translate3d(0, -8px, 0) rotate(2deg);
                    }
                }
            `}</style>

            {/* 1. KHU VỰC CHÍNH GIỮA (CENTER ZONE - 14 items, speed đồng bộ theo rãnh -0.10 đến -0.14, opacity 0.22 - 0.25, rõ nét) */}
            {CENTER_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-10 sm:w-13 md:w-15 lg:w-18 opacity-[0.22] sm:opacity-[0.25] will-change-transform"
                    style={{
                        top: item.top,
                        left: item.left,
                        filter: 'blur(0px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{
                            filter: 'drop-shadow(0 12px 18px rgba(120, 40, 20, 0.16)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.10)) contrast(1.06) saturate(1.1)',
                            animation: `pop3dFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                            transformStyle: 'preserve-3d',
                        }}
                    />
                </div>
            ))}

            {/* 2. LỚP TRUNG (MID LAYER - 10 items rìa trong, speed -0.15, opacity 0.22 - 0.25) */}
            {MID_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-11 sm:w-14 md:w-16 lg:w-20 opacity-[0.22] md:opacity-[0.25] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{
                            filter: 'drop-shadow(0 12px 18px rgba(120, 40, 20, 0.16)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.10)) contrast(1.06) saturate(1.1)',
                            animation: `pop3dFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                            transformStyle: 'preserve-3d',
                        }}
                    />
                </div>
            ))}

            {/* 3. LỚP GẦN (NEAR LAYER - 10 items sát 2 lề, speed -0.26, opacity 0.26 Mobile / 0.32 PC, rõ nét 100%) */}
            {NEAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-12 sm:w-16 md:w-20 lg:w-24 opacity-[0.26] md:opacity-[0.32] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        filter: 'blur(0px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * ${item.speed}), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto block select-none pointer-events-none"
                        style={{
                            filter: 'drop-shadow(0 12px 18px rgba(120, 40, 20, 0.16)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.10)) contrast(1.06) saturate(1.1)',
                            animation: `pop3dFloat ${item.duration} ease-in-out ${item.delay} infinite`,
                            transformStyle: 'preserve-3d',
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default FloatingDecor;
