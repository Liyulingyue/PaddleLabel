import { IntlProvider } from 'react-intl';
import { ReactNode } from 'react';
import en from './en';
import zh from './zh';

const messages: Record<string, Record<string, any>> = { en, zh };

interface Props {
  children: ReactNode;
}

export default function I18nProvider({ children }: Props) {
  const locale = navigator.language.startsWith('zh') ? 'zh' : 'en';

  return (
    <IntlProvider locale={locale} messages={messages[locale] as any}>
      {children}
    </IntlProvider>
  );
}
