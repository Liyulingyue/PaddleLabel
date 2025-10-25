import React from 'react';
import styles from './index.less';

export type SiderTheme = 'light' | 'dark';

type PPContainerProps = {
  children?: React.ReactNode;
};

const PPContainer: React.FC<PPContainerProps> = (props) => {
  return (
    <div
      className={`${styles.container}`}
      style={{ backgroundImage: 'url(./pics/background.png)' }}
    >
      {props.children}
    </div>
  );
};
export default PPContainer;
