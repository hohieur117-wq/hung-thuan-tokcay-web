import React, { useState, useEffect } from 'react';

const DECOR_ITEMS = [
    // Left margin (8 items distributed from 6% to 90%)
    { id: 1, src: '/decor-clean/decor-1.png', left: '2.2%', top: '6%', width: '86px', rotate: -18, speed: -0.18 },
    { id: 2, src: '/decor-clean/decor-2.png', left: '4.5%', top: '18%', width: '98px', rotate: 14, speed: -0.28 },
    { id: 3, src: '/decor-clean/decor-3.png', left: '1.8%', top: '31%', width: '104px', rotate: -12, speed: -0.22 },
    { id: 4, src: '/decor-clean/decor-4.png', left: '3.8%', top: '44%', width: '92px', rotate: 21, speed: -0.35 },
    { id: 5, src: '/decor-clean/decor-5.png', left: '2.0%', top: '57%', width: '106px', rotate: -24, speed: -0.16 },
    { id: 6, src: '/decor-clean/decor-6.png', left: '4.8%', top: '69%', width: '78px', rotate: 16, speed: -0.31 },
    { id: 7, src: '/decor-clean/decor-7.png', left: '2.5%', top: '80%', width: '94px', rotate: -19, speed: -0.25 },
    { id: 8, src: '/decor-clean/decor-8.png', left: '4.2%', top: '91%', width: '84px', rotate: 25, speed: -0.40 },

    // Right margin (8 items distributed from 8% to 92%)
    { id: 9, src: '/decor-clean/decor-9.png', right: '2.4%', top: '8%', width: '88px', rotate: 19, speed: -0.24 },
    { id: 10, src: '/decor-clean/decor-1.png', right: '4.6%', top: '20%', width: '76px', rotate: -22, speed: -0.34 },
    { id: 11, src: '/decor-clean/decor-2.png', right: '1.9%', top: '33%', width: '102px', rotate: 15, speed: -0.19 },
    { id: 12, src: '/decor-clean/decor-3.png', right: '4.0%', top: '46%', width: '96px', rotate: -16, speed: -0.29 },
    { id: 13, src: '/decor-clean/decor-4.png', right: '2.1%', top: '59%', width: '108px', rotate: 23, speed: -0.42 },
    { id: 14, src: '/decor-clean/decor-5.png', right: '4.9%', top: '71%', width: '90px', rotate: -14, speed: -0.21 },
    { id: 15, src: '/decor-clean/decor-8.png', right: '2.6%', top: '82%', width: '82px', rotate: 27, speed: -0.36 },
    { id: 16, src: '/decor-clean/decor-9.png', right: '3.9%', top: '92%', width: '95px', rotate: -21, speed: -0.27 },
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
            {DECOR_ITEMS.map((item) => (
                <img
                    key={item.id}
                    src={item.src}
                    alt=""
                    draggable={false}
                    className="hidden lg:block absolute will-change-transform"
                    style={{
                        top: item.top,
                        ...(item.left ? { left: item.left } : { right: item.right }),
                        width: item.width,
                        height: 'auto',
                        opacity: 0.9,
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.08))',
                        transform: `translate3d(0, ${scrollY * item.speed}px, 0) rotate(${item.rotate}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

export default FloatingDecor;
