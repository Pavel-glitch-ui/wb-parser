'use client';

import React, { useMemo, useCallback } from 'react';
import { Select, Space, Button } from 'antd';
import { ProductDto } from '@/entities/product';

interface ProductMultiselectProps {
  products: ProductDto[];
  selectedNmIds: string[];
  onChange: (nmIds: string[]) => void;
  loading?: boolean;
}

export const ProductMultiselect: React.FC<ProductMultiselectProps> = React.memo(({
  products,
  selectedNmIds,
  onChange,
  loading = false,
}) => {
  const handleSelectTop = useCallback(
    (count: number) => {
      const topIds = products.slice(0, count).map((p) => p.nmId);
      onChange(topIds);
    },
    [products, onChange]
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const options = useMemo(
    () =>
      products.map((p) => {
        const brandText = p.brand ? `[${p.brand}] ` : '';
        const nameText = p.name ? `${p.name.slice(0, 35)}... ` : '';
        const posText = p.bestPosition ? ` (ТОП: #${p.bestPosition})` : '';
        return {
          value: p.nmId,
          label: `${p.nmId} - ${brandText}${nameText}${posText}`,
        };
      }),
    [products]
  );

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <label
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e5e7eb',
          }}
        >
          Сравнение товаров (ID nm_id, найденных по этому запросу):
        </label>
        {products.length > 0 && (
          <Space orientation="horizontal" size="small">
            <Button size="small" onClick={() => handleSelectTop(3)}>
              Топ-3
            </Button>
            <Button size="small" onClick={() => handleSelectTop(5)}>
              Топ-5
            </Button>
            <Button size="small" onClick={handleClear} disabled={selectedNmIds.length === 0}>
              Сброс
            </Button>
          </Space>
        )}
      </div>

      <Select
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder={
          products.length === 0
            ? 'Сначала выберите запрос или запустите сбор данных...'
            : 'Выберите товары для сравнения на графике...'
        }
        loading={loading}
        value={selectedNmIds}
        onChange={onChange}
        maxTagCount="responsive"
        optionFilterProp="label"
        options={options}
      />
    </div>
  );
});

ProductMultiselect.displayName = 'ProductMultiselect';

