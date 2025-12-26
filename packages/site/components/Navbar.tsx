"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';

export const Navbar = () => {
  return (
    <nav className="flex w-full px-4 py-4 justify-between items-center border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">V</span>
        </div>
        <span className="font-bold text-gray-900">Vault</span>
      </div>
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="avatar"
      />
    </nav>
  );
};

