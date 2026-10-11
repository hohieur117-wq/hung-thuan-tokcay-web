import React, { useState, useEffect } from 'react';

// NHÓM 1: HAI BÊN LỀ (Left & Right Columns)
// Chia đều theo từng tầng dọc (cách nhau 14% - 15%) và đồng bộ tốc độ cuộn trong cùng cột
// để khoảng cách giữa các icon luôn cố định, tuyệt đối không bao giờ đuổi kịp hoặc đè lên nhau.
const SIDE_DECOR_ITEMS = [
    // Cột trái (Left: 1% - 4%, đồng bộ speed: -0.14)
    { id: 'L1', src: '/decor-clean/decor-1.png', left: '1.5%', top: '6%', rotate: -18, speed: -0.14 },
    { id: 'L2', src: '/decor-clean/decor-2.png', left: '3.2%', top: '20%', rotate: 15, speed: -0.14 },
    { id: 'L3', src: '/decor-clean/decor-3.png', left: '1.2%', top: '34%', rotate: -12, speed: -0.14 },
    { id: 'L4', src: '/decor-clean/decor-4.png', left: '2.8%', top: '48%', rotate: 20, speed: -0.14 },
    { id: 'L5', src: '/decor-clean/decor-5.png', left: '1.6%', top: '62%', rotate: -22, speed: -0.14 },
    { id: 'L6', src: '/decor-clean/decor-6.png', left: '3.5%', top: '76%', rotate: 16, speed: -0.14 },
    { id: 'L7', src: '/decor-clean/decor-7.png', left: '1.8%', top: '90%', rotate: -19, speed: -0.14 },
    { id: 'L8', src: '/decor-clean/decor-8.png', left: '3.0%', top: '105%', rotate: 23, speed: -0.14 },
    { id: 'L9', src: '/decor-clean/decor-9.png', left: '1.4%', top: '120%', rotate: -15, speed: -0.14 },

    // Cột phải (Right: 1% - 4%, đồng bộ speed: -0.15)
    { id: 'R1', src: '/decor-clean/decor-9.png', right: '1.6%', top: '8%', rotate: 19, speed: -0.15 },
    { id: 'R2', src: '/decor-clean/decor-8.png', right: '3.4%', top: '22%', rotate: -21, speed: -0.15 },
    { id: 'R3', src: '/decor-clean/decor-7.png', right: '1.3%', top: '36%', rotate: 14, speed: -0.15 },
    { id: 'R4', src: '/decor-clean/decor-6.png', right: '2.9%', top: '50%', rotate: -17, speed: -0.15 },
    { id: 'R5', src: '/decor-clean/decor-5.png', right: '1.5%', top: '64%', rotate: 22, speed: -0.15 },
    { id: 'R6', src: '/decor-clean/decor-4.png', right: '3.6%', top: '78%', rotate: -14, speed: -0.15 },
    { id: 'R7', src: '/decor-clean/decor-3.png', right: '1.8%', top: '92%', rotate: 24, speed: -0.15 },
    { id: 'R8', src: '/decor-clean/decor-2.png', right: '3.1%', top: '107%', rotate: -20, speed: -0.15 },
    { id: 'R9', src: '/decor-clean/decor-1.png', right: '1.5%', top: '122%', rotate: 16, speed: -0.15 },
];

// NHÓM 2: KHU VỰC GIỮA TRANG (Center Subtle Decor cho Mobile & khe hở giữa các phần)
// Độ mờ siêu dịu (0.10 - 0.14) và đồng bộ speed (-0.12) để lấp ló tinh tế mà không che sản phẩm
const CENTER_DECOR_ITEMS = [
    { id: 'C1', src: '/decor-clean/decor-3.png', left: '25%', top: '15%', rotate: -14, speed: -0.12, opacity: 0.12 },
    { id: 'C2', src: '/decor-clean/decor-8.png', left: '68%', top: '42%', rotate: 18, speed: -0.12, opacity: 0.11 },
    { id: 'C3', src: '/decor-clean/decor-1.png', left: '45%', top: '70%', rotate: -21, speed: -0.12, opacity: 0.13 },
    { id: 'C4', src: '/decor-clean/decor-6.png', left: '28%', top: '95%', rotate: 15, speed: -0.12, opacity: 0.10 },
    { id: 'C5', src: '/decor-clean/decor-9.png', left: '65%', top: '115%', rotate: -16, speed: -0.12, opacity: 0.12 },
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
            {/* Nhóm 1: Hai bên lề (Hiển thị cả trên Mobile & Desktop, opacity 0.18 trên Mobile và 0.25 trên Desktop) */}
            {SIDE_DECOR_ITEMS.map((item) => (
                <img
                    key={item.id}
                    src={item.src}
                    alt=""
                    draggable={false}
                    className="block absolute w-10 sm:w-16 md:w-20 opacity-[0.18] md:opacity-[0.25] will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        height: 'auto',
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.08))',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
                    }}
                />
            ))}

            {/* Nhóm 2: Khu vực giữa trang (Độ mờ siêu dịu 0.10 - 0.14 cho khe hở & giao diện Điện thoại) */}
            {CENTER_DECOR_ITEMS.map((item) => (
                <img
                    key={item.id}
                    src={item.src}
                    alt=""
                    draggable={false}
                    className="block absolute w-9 sm:w-14 md:w-16 will-change-transform"
                    style={{
                        top: item.top,
                        left: item.left,
                        height: 'auto',
                        opacity: item.opacity,
                        filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.05))',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

export default FloatingDecor;
