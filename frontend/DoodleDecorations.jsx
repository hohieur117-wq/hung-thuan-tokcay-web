import React from 'react';

const NoodleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h16M2 10a10 10 0 0 0 20 0H2z" />
    <path d="M7 10V6M10 10V4M14 10V4M17 10V6" />
  </svg>
);

const GarlicIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8 6 6 10 6 15a6 6 0 0 0 12 0c0-5-2-9-6-13z" />
    <path d="M12 2v20M9 10c0 4 1.5 6 3 8M15 10c0 4-1.5 6-3 8" />
  </svg>
);

const SkewerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 9l4-4 2 2-4 4M9 15l-4 4-2-2 4-4" />
    <rect x="7" y="7" width="10" height="10" rx="3" transform="rotate(45 12 12)" />
    <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  </svg>
);

const TempleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20M4 20V10M20 20V10M8 20v-5a2 2 0 0 1 4 0v5" />
    <path d="M2 10l10-6 10 6" />
  </svg>
);

const ChiliIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 4c0 2-2 3-2 5a5 5 0 0 1-10 0C6 7 4 6 4 4" />
    <path d="M12 12c-3 0-5 3-5 7 0 2 2 3 5 3s5-1 5-3c0-4-2-7-5-7z" />
  </svg>
);

const TextIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 6h4v4H5zM12 6h7M15 6v12M5 14h4v4H5z" />
  </svg>
);

export const DoodleDecorations = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none hidden lg:flex justify-between overflow-hidden">
      {/* Lề Trái - Màu đỏ nhạt, độ mờ thấp 20% */}
      <div className="w-32 h-[90vh] my-auto flex flex-col justify-around items-center text-red-700 opacity-20">
        <div className="animate-[bounce_4s_infinite]"><NoodleIcon className="w-16 h-16" /></div>
        <div className="animate-[pulse_5s_infinite] ml-8"><GarlicIcon className="w-12 h-12" /></div>
        <div className="animate-[bounce_6s_infinite]"><TextIcon className="w-14 h-14" /></div>
      </div>

      {/* Lề Phải - Màu đỏ nhạt, độ mờ thấp 20% */}
      <div className="w-32 h-[90vh] my-auto flex flex-col justify-around items-center text-red-700 opacity-20">
        <div className="animate-[pulse_6s_infinite] mr-8"><SkewerIcon className="w-14 h-14" /></div>
        <div className="animate-[bounce_5s_infinite]"><TempleIcon className="w-20 h-20" /></div>
        <div className="animate-[pulse_4s_infinite]"><ChiliIcon className="w-10 h-10" /></div>
      </div>
    </div>
  );
};
