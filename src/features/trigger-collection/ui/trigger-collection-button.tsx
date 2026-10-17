'use client';

import React, { useState } from 'react';
import { Button, message, Space, Typography } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TriggerCollectionButtonProps {
  onCollectionCompleted?: () => void;
}

export const TriggerCollectionButton: React.FC<TriggerCollectionButtonProps> = ({
  onCollectionCompleted,
}) => {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    message.loading({ content: 'Запущен сбор поисковой выдачи по всем 70 запросам...', key: 'collection' });

    try {
      const response = await fetch('/api/collect', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.ok) {
        message.success({
          content: `Сбор успешно завершен! Обработано ${data.summary.queriesProcessed} запросов, сохранено ${data.summary.itemsCount} товаров.`,
          key: 'collection',
          duration: 6,
        });
        if (onCollectionCompleted) {
          onCollectionCompleted();
        }
      } else {
        message.error({
          content: `Ошибка при сборе данных: ${data.error || 'Неизвестная ошибка'}`,
          key: 'collection',
        });
      }
    } catch (err: any) {
      message.error({
        content: `Ошибка запроса: ${err.message}`,
        key: 'collection',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space orientation="horizontal" size="middle">
      <Button
        type="primary"
        icon={<SyncOutlined spin={loading} />}
        loading={loading}
        onClick={handleTrigger}
        size="large"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderColor: 'transparent',
          fontWeight: 600,
        }}
      >
        {loading ? 'Идет сбор 70 запросов...' : 'Запустить сбор сейчас'}
      </Button>
    </Space>
  );
};
