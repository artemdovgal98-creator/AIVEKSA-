'use client';

import { useEffect, useRef } from 'react';

export default function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;
    if (bannerRef.current.firstChild) return;

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.innerHTML = `
      atOptions = {
        'key' : 'd9ef51e3b4e994200e5b734b76f4c1be',
        'format' : 'iframe',
        'height' : 250,
        'width' : 300,
        'params' : {}
      };
    `;
    bannerRef.current.appendChild(confScript);

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.async = true;
    invokeScript.src = 'https://www.highperformanceformat.com/d9ef51e3b4e994200e5b734b76f4c1be/invoke.js';
    bannerRef.current.appendChild(invokeScript);
  }, []);

  return <div ref={bannerRef} className="flex justify-center my-4" />;
}
