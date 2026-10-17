'use client';

import React from 'react';
import { Table, Tag, Typography, Card, Space, Tooltip } from 'antd';
import { StarFilled, ExportOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { SerpTableItemDto } from '@/entities/serp-observation';

const { Link, Text } = Typography;

interface SerpDataTableProps {
  data: SerpTableItemDto[];
  loading?: boolean;
}

export const SerpDataTable: React.FC<SerpDataTableProps> = ({ data, loading = false }) => {
  const columns: ColumnsType<SerpTableItemDto> = [
    {
      title: 'Позиция',
      dataIndex: 'position',
      key: 'position',
      width: 90,
      sorter: (a, b) => a.position - b.position,
      render: (pos: number) => {
        let color = 'default';
        if (pos <= 3) color = 'gold';
        else if (pos <= 10) color = 'green';
        else if (pos <= 50) color = 'blue';

        return (
          <Tag color={color} style={{ fontWeight: 700, fontSize: 13, padding: '2px 8px' }}>
            #{pos}
          </Tag>
        );
      },
    },
    {
      title: 'ID товара (nm_id)',
      dataIndex: 'nmId',
      key: 'nmId',
      width: 140,
      render: (nmId: string) => (
        <Link
          href={`https://www.wildberries.ru/catalog/${nmId}/detail.aspx`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Space>
            <span>{nmId}</span>
            <ExportOutlined style={{ fontSize: 11 }} />
          </Space>
        </Link>
      ),
    },
    {
      title: 'Бренд и наименование',
      key: 'product',
      ellipsis: true,
      render: (_, record) => (
        <div>
          {record.brand && (
            <Tag color="cyan" style={{ marginRight: 6 }}>
              {record.brand}
            </Tag>
          )}
          <Text>{record.name || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Цена покупателя',
      dataIndex: 'price',
      key: 'price',
      width: 130,
      sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      render: (price: number | null) =>
        price != null ? (
          <Text strong style={{ color: '#10b981', fontSize: 14 }}>
            {price.toLocaleString('ru-RU')} ₽
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Рейтинг',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      sorter: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
      render: (rating: number | null) =>
        rating != null ? (
          <Space orientation="horizontal" size={4}>
            <StarFilled style={{ color: '#fbbf24' }} />
            <span>{rating.toFixed(1)}</span>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Отзывы',
      dataIndex: 'feedbacks',
      key: 'feedbacks',
      width: 110,
      sorter: (a, b) => (a.feedbacks ?? 0) - (b.feedbacks ?? 0),
      render: (feedbacks: number | null) =>
        feedbacks != null ? (
          <span>{feedbacks.toLocaleString('ru-RU')}</span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Доставка (дни)',
      dataIndex: 'deliveryDays',
      key: 'deliveryDays',
      width: 130,
      sorter: (a, b) => (a.deliveryDays ?? 999) - (b.deliveryDays ?? 999),
      render: (days: number | null) => {
        if (days == null) return <Text type="secondary">—</Text>;
        if (days === 0) return <Tag color="green">Сегодня (0 дн.)</Tag>;
        if (days === 1) return <Tag color="blue">Завтра (1 дн.)</Tag>;
        return <Tag color="purple">{days} дн.</Tag>;
      },
    },
    {
      title: 'Продавец (supplier)',
      dataIndex: 'sellerName',
      key: 'sellerName',
      ellipsis: true,
      render: (seller: string | null) => seller || <Text type="secondary">—</Text>,
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Собранные характеристики товаров (Актуальный срез топ-200)</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Всего в срезе: {data.length} товаров
          </Text>
        </div>
      }
      style={{ width: '100%' }}
    >
      <Table<SerpTableItemDto>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} товаров`,
        }}
        size="middle"
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};
