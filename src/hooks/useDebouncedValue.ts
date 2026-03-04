import { useEffect, useState } from 'react';

export default function useDebouncedValue<T>(value: T, delayMs = 150) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // 通过延迟同步输入值，减少高频输入时重复计算带来的内存抖动。
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
