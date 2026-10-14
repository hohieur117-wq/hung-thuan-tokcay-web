import React, { useEffect, useRef } from 'react';

// =========================================================================================
// HỆ THỐNG FLOATING ICONS 3 LỚP CHIỀU SÂU (3-LAYER DEPTH OF FIELD PARALLAX - TỐI ƯU MOBILE & PC)
// 1. LỚP XA (Far Layer): Nhỏ nhất (16px Mobile / 36px PC), mờ xa (opacity 0.16-0.18), cuộn chậm (-0.07)
// 2. LỚP TRUNG (Mid Layer): Kích thước vừa (20px Mobile / 48px PC), rõ vừa (opacity 0.24-0.27), cuộn vừa (-0.15)
// 3. LỚP GẦN (Near Layer): Cận cảnh gọn gàng (24px Mobile / 58px PC), rõ nét (opacity 0.30-0.36), cuộn nhanh (-0.25)
//
// ĐẶC BIỆT:
// - Đã fix triệt để lỗi "icon to chà bá" trên điện thoại bằng clamp() CSS + Tailwind arbitrary pixel widths.
// - Trên Mobile: icon chỉ nhỏ từ 16px đến 24px, tinh tế và không chiếm diện tích màn hình điện thoại.
// - Chống đè icon 100%: 7 rãnh tọa độ X độc lập, cùng rãnh cùng tốc độ cuộn.
// =========================================================================================

// LỚP 1: LỚP XA (FAR LAYER - 11 items ở giữa trang | Speed cố định: -0.07)
const FAR_LAYER_ITEMS = [
    // Rãnh giữa trái: left 24%
    { id: 'far-1', src: '/decor-clean/decor-1.png', left: '24%', top: '10%', rotate: -15 },
    { id: 'far-2', src: '/decor-clean/decor-6.png', left: '24%', top: '52%', rotate: 18 },
    { id: 'far-3', src: '/decor-clean/decor-4.png', left: '24%', top: '94%', rotate: -12 },
    { id: 'far-4', src: '/decor-clean/decor-9.png', left: '24%', top: '134%', rotate: 16 },

    // Rãnh chính giữa: left 49%
    { id: 'far-5', src: '/decor-clean/decor-3.png', left: '49%', top: '22%', rotate: 16 },
    { id: 'far-6', src: '/decor-clean/decor-8.png', left: '49%', top: '64%', rotate: -20 },
    { id: 'far-7', src: '/decor-clean/decor-2.png', left: '49%', top: '106%', rotate: 14 },

    // Rãnh giữa phải: left 74%
    { id: 'far-8', src: '/decor-clean/decor-5.png', left: '74%', top: '16%', rotate: -18 },
    { id: 'far-9', src: '/decor-clean/decor-7.png', left: '74%', top: '58%', rotate: 22 },
    { id: 'far-10', src: '/decor-clean/decor-1.png', left: '74%', top: '100%', rotate: -16 },
    { id: 'far-11', src: '/decor-clean/decor-3.png', left: '74%', top: '140%', rotate: 20 },
];

// LỚP 2: LỚP TRUNG (MID LAYER - 10 items rìa trong 2 bên | Speed cố định: -0.15)
const MID_LAYER_ITEMS = [
    // Rìa trong bên trái: left 9.5%
    { id: 'mid-L1', src: '/decor-clean/decor-2.png', left: '9.5%', top: '12%', rotate: 18 },
    { id: 'mid-L2', src: '/decor-clean/decor-5.png', left: '9.5%', top: '42%', rotate: -16 },
    { id: 'mid-L3', src: '/decor-clean/decor-8.png', left: '9.5%', top: '72%', rotate: 22 },
    { id: 'mid-L4', src: '/decor-clean/decor-3.png', left: '9.5%', top: '102%', rotate: -20 },
    { id: 'mid-L5', src: '/decor-clean/decor-6.png', left: '9.5%', top: '132%', rotate: 15 },

    // Rìa trong bên phải: right 9.5%
    { id: 'mid-R1', src: '/decor-clean/decor-7.png', right: '9.5%', top: '18%', rotate: -22 },
    { id: 'mid-R2', src: '/decor-clean/decor-4.png', right: '9.5%', top: '48%', rotate: 19 },
    { id: 'mid-R3', src: '/decor-clean/decor-1.png', right: '9.5%', top: '78%', rotate: -15 },
    { id: 'mid-R4', src: '/decor-clean/decor-9.png', right: '9.5%', top: '108%', rotate: 24 },
    { id: 'mid-R5', src: '/decor-clean/decor-2.png', right: '9.5%', top: '136%', rotate: -18 },
];

// LỚP 3: LỚP GẦN (NEAR LAYER - 10 items sát 2 lề ngoài cùng | Speed cố định: -0.25)
const NEAR_LAYER_ITEMS = [
    // Sát mép bên trái: left 1.8%
    { id: 'near-L1', src: '/decor-clean/decor-9.png', left: '1.8%', top: '5%', rotate: -25 },
    { id: 'near-L2', src: '/decor-clean/decor-4.png', left: '1.8%', top: '35%', rotate: 21 },
    { id: 'near-L3', src: '/decor-clean/decor-6.png', left: '1.8%', top: '65%', rotate: -17 },
    { id: 'near-L4', src: '/decor-clean/decor-7.png', left: '1.8%', top: '95%', rotate: 26 },
    { id: 'near-L5', src: '/decor-clean/decor-3.png', left: '1.8%', top: '125%', rotate: -22 },

    // Sát mép bên phải: right 1.8%
    { id: 'near-R1', src: '/decor-clean/decor-5.png', right: '1.8%', top: '8%', rotate: 23 },
    { id: 'near-R2', src: '/decor-clean/decor-8.png', right: '1.8%', top: '38%', rotate: -24 },
    { id: 'near-R3', src: '/decor-clean/decor-2.png', right: '1.8%', top: '68%', rotate: 19 },
    { id: 'near-R4', src: '/decor-clean/decor-1.png', right: '1.8%', top: '98%', rotate: -26 },
    { id: 'near-R5', src: '/decor-clean/decor-4.png', right: '1.8%', top: '128%', rotate: 20 },
];

const FloatingDecor = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        let ticking = false;
        let rafId = null;

        const updateScroll = () => {
            if (containerRef.current) {
                const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
                containerRef.current.style.setProperty('--scroll-y', `${Math.round(currentScrollY)}px`);
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
            style={{
                '--scroll-y': '0px',
            }}
            aria-hidden="true"
        >
            {/* LỚP 1: LỚP XA (FAR LAYER - Nhỏ gọn, cuộn chậm -0.07, mờ nhẹ) */}
            {FAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-[16px] sm:w-[22px] md:w-[28px] lg:w-[36px] opacity-[0.16] sm:opacity-[0.19] will-change-transform"
                    style={{
                        top: item.top,
                        left: item.left,
                        width: 'clamp(16px, 2.5vw, 36px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * -0.07), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto max-w-full block select-none pointer-events-none"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            transform: 'perspective(500px) rotateX(6deg) rotateY(-6deg) scale(0.96)',
                            filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.08))',
                        }}
                    />
                </div>
            ))}

            {/* LỚP 2: LỚP TRUNG (MID LAYER - Kích thước vừa, cuộn vừa -0.15, rìa trong 2 bên) */}
            {MID_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-[20px] sm:w-[28px] md:w-[38px] lg:w-[48px] opacity-[0.24] md:opacity-[0.27] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        width: 'clamp(20px, 3.4vw, 48px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * -0.15), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto max-w-full block select-none pointer-events-none"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            transform: 'perspective(600px) rotateX(8deg) rotateY(-8deg) scale(1.02)',
                            filter: 'drop-shadow(0 6px 10px rgba(110, 30, 20, 0.14))',
                        }}
                    />
                </div>
            ))}

            {/* LỚP 3: LỚP GẦN (NEAR LAYER - Nổi bật cận cảnh, cuộn nhanh -0.25, sát mép ngoài) */}
            {NEAR_LAYER_ITEMS.map((item) => (
                <div
                    key={item.id}
                    className="block absolute w-[24px] sm:w-[34px] md:w-[46px] lg:w-[58px] opacity-[0.30] md:opacity-[0.36] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        width: 'clamp(24px, 4.2vw, 58px)',
                        transform: `translate3d(0, calc(var(--scroll-y, 0px) * -0.25), 0) rotate(${item.rotate}deg)`,
                    }}
                >
                    <img
                        src={item.src}
                        alt=""
                        draggable={false}
                        className="w-full h-auto max-w-full block select-none pointer-events-none"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            transform: 'perspective(600px) rotateX(10deg) rotateY(-10deg) scale(1.06)',
                            filter: 'drop-shadow(0 8px 14px rgba(90, 25, 15, 0.18))',
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default FloatingDecor;
