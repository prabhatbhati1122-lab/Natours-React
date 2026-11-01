import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const timer = useRef(null);

  const showAlert = useCallback((type, msg, time = 5000) => {
    clearTimeout(timer.current);
    setAlert({ type, msg });
    timer.current = setTimeout(() => setAlert(null), time);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {alert && <div className={`alert alert--${alert.type}`}>{alert.msg}</div>}
      {children}
    </AlertContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlert() {
  return useContext(AlertContext);
}
