import React from 'react';

export default function Topbar({ userName = 'Người dùng', userRole = 'Vai trò' }) {
  return (
    <div className="hidden md:flex justify-between items-center px-margin-desktop py-stack-md bg-white border-b border-outline-variant sticky top-0 z-30">
      <div className="flex-1 max-w-2xl relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input
          className="w-full bg-surface-container-low border-none rounded-full py-3 pl-12 pr-12 focus:ring-2 focus:ring-secondary focus:bg-white transition-all font-body-md text-body-md text-on-surface placeholder:text-outline"
          placeholder="Tìm kiếm tài liệu, tác giả, ISBN..."
          type="text"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary-container transition-colors"
          title="Tìm kiếm thông minh (AI)"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </button>
      </div>

      <div className="flex items-center gap-stack-md ml-stack-lg">
        <button className="relative p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <div className="flex items-center gap-stack-sm cursor-pointer hover:opacity-80 transition-opacity">
          <img
            alt="User profile avatar"
            className="w-10 h-10 rounded-full border border-outline-variant"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB2EB1pXnatRAnrbYjoIzN46inAhUlGTLV4yAsmXcW1DWSUu0sa6kL3eax1zHc5GbwKA2-KE0lge00UcyYQ6y8wSPMkwzxnAv3Uvoe_1s_SNFaRahGITuOLwptHyErBZr9MQyH2XSGkeHMG33n-Tx9_MWyw01XsyFD5FoK2MILMujFhDzjw3AKCGw96YfDAEk4ZW2OFECCQNpG45tfnXt4OyJf7-Iy2Uter8LbwRccEMXVpTAlyJ6zmNWgqqo-DpE4QyuxKYAY157E"
          />
          <div className="hidden lg:block">
            <p className="font-label-md text-label-md font-semibold text-on-surface">{userName}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{userRole}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
