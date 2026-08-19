import { createContext, useContext, useState } from 'react';

const ViewCtx = createContext(null);
export const useView = () => useContext(ViewCtx);

export function ViewProvider({ children }) {
  const [view, setView] = useState('admin'); // admin | user
  return <ViewCtx.Provider value={{ view, setView }}>{children}</ViewCtx.Provider>;
}