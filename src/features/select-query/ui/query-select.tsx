'use client';

import React from 'react';
import { Select } from 'antd';
import { SearchQueryDto } from '@/entities/search-query';

interface QuerySelectProps {
  queries: SearchQueryDto[];
  selectedQueryId: number | null;
  onChange: (queryId: number) => void;
  loading?: boolean;
}

export const QuerySelect: React.FC<QuerySelectProps> = ({
  queries,
  selectedQueryId,
  onChange,
  loading = false,
}) => {
  return (
    <div style={{ width: '100%' }}>
      <label
        style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 600,
          color: '#e5e7eb',
        }}
      >
        Поисковый запрос Wildberries (70 запросов из ТЗ):
      </label>
      <Select
        showSearch
        placeholder="Выберите или введите поисковый запрос..."
        optionFilterProp="label"
        style={{ width: '100%' }}
        size="large"
        loading={loading}
        value={selectedQueryId ?? undefined}
        onChange={onChange}
        options={queries.map((q) => ({
          value: q.id,
          label: `${q.phrase} ${q.lastCollectedAt ? `(сборов: ${q.observationsCount})` : '(еще не собирался)'}`,
        }))}
      />
    </div>
  );
};
