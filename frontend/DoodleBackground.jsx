import React, { useState, useEffect } from 'react';

const doodles = [
    { id: 1, side: 'left', top: '5%', left: '2%', speed: 0.3, bgPos: '0% 0%', size: 'w-24 h-24' },
    { id: 2, side: 'right', top: '15%', right: '3%', speed: -0.15, bgPos: '25% 33%', size: 'w-20 h-20' },
    { id: 3, side: 'left', top: '30%', left: '6%', speed: 0.1, bgPos: '0% 66%', size: 'w-28 h-28' },
    { id: 4, side: 'right', top: '45%', right: '5%', speed: 0.4, bgPos: '50% 0%', size: 'w-16 h-16' },
    { id: 5, side: 'left', top: '60%', left: '1%', speed: -0.2, bgPos: '0% 100%', size: 'w-24 h-20' },
    { id: 6, side: 'right', top: '75%', right: '2%', speed: 0.25, bgPos: '100% 100%', size: 'w-20 h-20' },
    { id: 7, side: 'left', top: '85%', left: '7%', speed: 0.05, bgPos: '75% 33%', size: 'w-20 h-20' },
    { id: 8, side: 'right', top: '90%', right: '6%', speed: -0.3, bgPos: '25% 66%', size: 'w-24 h-24' },
    { id: 9, side: 'left', top: '12%', left: '8%', speed: 0.2, bgPos: '50% 100%', size: 'w-16 h-16' },
    { id: 10, side: 'right', top: '28%', right: '1%', speed: -0.1, bgPos: '100% 0%', size: 'w-24 h-24' },
    { id: 11, side: 'left', top: '50%', left: '4%', speed: 0.15, bgPos: '50% 66%', size: 'w-20 h-20' },
    { id: 12, side: 'right', top: '68%', right: '8%', speed: -0.25, bgPos: '75% 100%', size: 'w-16 h-16' },
];

export const DoodleBackground = () => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block overflow-hidden h-[200vh]">
            {doodles.map(item => (
                <div 
                    key={item.id}
                    className={`absolute ${item.size} mix-blend-multiply opacity-40 grayscale transition-transform duration-75 ease-out bg-no-repeat`}
                    style={{
                        top: item.top,
                        [item.side]: item.side === 'left' ? item.left : item.right,
                        backgroundImage: "url('/korean-doodle.png')",
                        backgroundSize: '500% 400%',
                        backgroundPosition: item.bgPos,
                        transform: `translateY(${scrollY * item.speed}px)`
                    }}
                />
            ))}
        </div>
    );
};
