'use client';

import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={ruRU}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#6366f1',
            borderRadius: 8,
            colorBgContainer: '#18181b',
            colorBgElevated: '#27272a',
            colorBorder: '#3f3f46',
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
};
