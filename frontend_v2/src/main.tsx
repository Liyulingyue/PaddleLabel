import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import App from './App';
import './i18n';
import './styles/labelPage.css';
import i18n from 'i18next';

const localeMap: Record<string, typeof zhCN> = { zh: zhCN, en: enUS };

function Root() {
  const [locale, setLocale] = useState(() => localeMap[i18n.language] || enUS);

  useEffect(() => {
    const update = () => setLocale(localeMap[i18n.language] || enUS);
    i18n.on('languageChanged', update);
    return () => { i18n.off('languageChanged', update); };
  }, []);

  return (
    <ConfigProvider locale={locale}>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
