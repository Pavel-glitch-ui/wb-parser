'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, Empty, Typography } from 'antd';
import { SerpChartPoint } from '@/entities/serp-observation';
import { ProductDto } from '@/entities/product';

const { Text } = Typography;

// Палитра контрастных гармоничных цветов для линий на темном/светлом фоне
const LINE_COLORS = [
  '#3b82f6', // Синий
  '#ef4444', // Красный
  '#10b981', // Зеленый
  '#f59e0b', // Янтарный
  '#8b5cf6', // Фиолетовый
  '#ec4899', // Розовый
  '#06b6d4', // Бирюзовый
  '#84cc16', // Лайм
  '#f97316', // Оранжевый
  '#6366f1', // Индиго
];

interface SerpLineChartProps {
  data: SerpChartPoint[];
  selectedProducts: ProductDto[];
  loading?: boolean;
}

export const SerpLineChart: React.FC<SerpLineChartProps> = ({
  data,
  selectedProducts,
  loading = false,
}) => {
  if (data.length === 0 || selectedProducts.length === 0) {
    return (
      <Card
        style={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty
          description={
            selectedProducts.length === 0
              ? 'Выберите один или несколько товаров в фильтре выше, чтобы увидеть график динамики позиций'
              : 'Для выбранных товаров еще нет истории сборов. Запустите сбор данных!'
          }
        />
      </Card>
    );
  }

  // Создаем словарь названий товаров для легенды и тултипа
  const productLabels: Record<string, string> = {};
  selectedProducts.forEach((p) => {
    const brand = p.brand ? `${p.brand} ` : '';
    productLabels[p.nmId] = `ID ${p.nmId} (${brand})`;
  });

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Динамика позиций в выдаче (Ось Y: 1 место — вверху)</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Всего срезов: {data.length}
          </Text>
        </div>
      }
      style={{ width: '100%', marginBottom: 24 }}
      loading={loading}
    >
      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="displayTime"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              angle={-25}
              textAnchor="end"
              height={50}
            />
            {/* 
              КРИТИЧЕСКОЕ ТРЕБОВАНИЕ ТЗ:
              Позиция 1 должна быть строго сверху.
              Используем reversed={true} и домен [1, 200].
            */}
            <YAxis
              reversed={true}
              domain={[1, 200]}
              tickCount={10}
              tick={{ fontSize: 12 }}
              label={{
                value: 'Позиция в SERP (1 — ТОП)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#888' },
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div
                    style={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      padding: '10px 14px',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      color: '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6, borderBottom: '1px solid #374151', paddingBottom: 4 }}>
                      Срез: {label}
                    </div>
                    {payload.map((entry: any, idx: number) => {
                      const nmId = entry.dataKey;
                      const pos = entry.value;
                      const labelText = productLabels[nmId] || nmId;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            margin: '4px 0',
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: entry.color,
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ color: '#9ca3af' }}>{labelText}:</span>
                          <span style={{ fontWeight: 700, color: pos != null ? '#60a5fa' : '#ef4444' }}>
                            {pos != null ? `#${pos}` : 'Не найден в топ-200'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 15 }}
              formatter={(value) => productLabels[value] || value}
            />

            {/* 
              КРИТИЧЕСКОЕ ТРЕБОВАНИЕ ТЗ:
              Если товар не найден при очередном сборе, нельзя присваивать ему вымышленную позицию!
              Поэтому connectNulls={false}: Recharts делает честный разрыв линии.
            */}
            {selectedProducts.map((p, idx) => (
              <Line
                key={p.nmId}
                type="monotone"
                dataKey={p.nmId}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 7 }}
                connectNulls={false}
                name={p.nmId}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
