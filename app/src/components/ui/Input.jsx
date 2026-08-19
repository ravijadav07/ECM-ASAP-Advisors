// src/components/ui/Input.jsx — CANONICAL from pucho-frontend

import React, { useState } from 'react';

const Input = ({ label, type = 'text', icon, placeholder, value, onChange, error, name, autoComplete }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-[#6B7280]">{label}</label>
      )}
      <div
        className={`flex items-center gap-2.5 h-[52px] px-4 rounded-2xl bg-white/80 border transition-all
          ${error ? 'border-red-300 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100'
                  : 'border-gray-200 focus-within:border-[#8b5cf6] focus-within:ring-2 focus-within:ring-[#8b5cf6]/15'}`}
      >
        {icon && (
          typeof icon === 'string'
            ? <img src={icon} alt="" className="w-5 h-5 opacity-50 flex-shrink-0" />
            : React.createElement(icon, { className: 'w-5 h-5 text-gray-400 flex-shrink-0' })
        )}
        <input
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent border-none outline-none text-[#111834] placeholder:text-gray-400 text-sm"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="text-xs font-medium text-gray-400 hover:text-[#8b5cf6]">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;