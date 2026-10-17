'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Row, Col, Card, Typography, Spin, Badge, Space } from 'antd';
import { QuerySelect } from '@/features/select-query';
import { ProductMultiselect } from '@/features/select-products';
import { SerpLineChart } from '@/features/view-serp-chart';
import { SerpDataTable } from '@/features/view-serp-table';
import { TriggerCollectionButton } from '@/features/trigger-collection';
import { SearchQueryDto } from '@/entities/search-query';
import { ProductDto } from '@/entities/product';
import { SerpChartPoint, SerpTableItemDto } from '@/entities/serp-observation';
import {
  fetchQueriesAction,
  fetchProductsForQueryAction,
  fetchChartHistoryAction,
  fetchLatestTableAction,
} from '@/_app/actions/serp.actions';

const { Title, Text } = Typography;

export const SerpDashboardPage: React.FC = () => {
  const [queries, setQueries] = useState<SearchQueryDto[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedNmIds, setSelectedNmIds] = useState<string[]>([]);

  const [chartData, setChartData] = useState<SerpChartPoint[]>([]);
  const [tableData, setTableData] = useState<SerpTableItemDto[]>([]);

  const [loadingQueries, setLoadingQueries] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  // 1. Загрузка списка запросов при монтировании
  const loadQueries = async () => {
    setLoadingQueries(true);
    try {
      const list = await fetchQueriesAction();
      setQueries(list);
      if (list.length > 0 && selectedQueryId === null) {
        setSelectedQueryId(list[0].id);
      }
    } catch (e) {
      console.error('Ошибка загрузки запросов:', e);
    } finally {
      setLoadingQueries(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  // 2. При смене поискового запроса: загружаем товары и таблицу
  useEffect(() => {
    if (!selectedQueryId) return;

    let isCancelled = false;

    const loadDataForQuery = async () => {
      setLoadingProducts(true);
      setLoadingTable(true);

      try {
        const [prods, tableItems] = await Promise.all([
          fetchProductsForQueryAction(selectedQueryId),
          fetchLatestTableAction(selectedQueryId),
        ]);

        if (isCancelled) return;

        setProducts(prods);
        setTableData(tableItems);

        // По умолчанию выбираем первые 3 товара для графика
        if (prods.length > 0) {
          const initialTop = prods.slice(0, 3).map((p) => p.nmId);
          setSelectedNmIds(initialTop);
        } else {
          setSelectedNmIds([]);
          setChartData([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных по запросу:', err);
      } finally {
        if (!isCancelled) {
          setLoadingProducts(false);
          setLoadingTable(false);
        }
      }
    };

    loadDataForQuery();

    return () => {
      isCancelled = true;
    };
  }, [selectedQueryId]);

  // 3. При изменении выбранных товаров: обновляем график динамики позиций
  useEffect(() => {
    if (!selectedQueryId || selectedNmIds.length === 0) {
      setChartData([]);
      return;
    }

    let isCancelled = false;

    const loadChart = async () => {
      setLoadingChart(true);
      try {
        const points = await fetchChartHistoryAction(selectedQueryId, selectedNmIds);
        if (!isCancelled) {
          setChartData(points);
        }
      } catch (err) {
        console.error('Ошибка загрузки истории графика:', err);
      } finally {
        if (!isCancelled) {
          setLoadingChart(false);
        }
      }
    };

    loadChart();

    return () => {
      isCancelled = true;
    };
  }, [selectedQueryId, selectedNmIds]);

  // Колбэк после завершения ручного или периодического сбора
  const handleCollectionCompleted = async () => {
    await loadQueries();
    if (selectedQueryId) {
      const [prods, tableItems] = await Promise.all([
        fetchProductsForQueryAction(selectedQueryId),
        fetchLatestTableAction(selectedQueryId),
      ]);
      setProducts(prods);
      setTableData(tableItems);

      if (selectedNmIds.length > 0) {
        const points = await fetchChartHistoryAction(selectedQueryId, selectedNmIds);
        setChartData(points);
      }
    }
  };

  const selectedQuery = queries.find((q) => q.id === selectedQueryId);
  const activeProducts = products.filter((p) => selectedNmIds.includes(p.nmId));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#f4f4f5',
        padding: '32px 24px',
        maxWidth: 1600,
        margin: '0 auto',
      }}
    >
      {/* Шапка дашборда */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 32,
          borderBottom: '1px solid #27272a',
          paddingBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: '#f4f4f5' }}>
            Wildberries SERP Analytics
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Мониторинг поисковой выдачи по 70 запросам • глубина топ-200 • почасовой сбор (Москва)
          </Text>
        </div>

        <Space size="large" align="center">
          {selectedQuery?.lastCollectedAt && (
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Последний срез:
              </Text>
              <Badge status="processing" color="#10b981" text={new Date(selectedQuery.lastCollectedAt).toLocaleString('ru-RU')} />
            </div>
          )}
          <TriggerCollectionButton onCollectionCompleted={handleCollectionCompleted} />
        </Space>
      </div>

      {/* Секция фильтров */}
      <Card style={{ marginBottom: 24, background: '#18181b', borderColor: '#27272a' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <QuerySelect
              queries={queries}
              selectedQueryId={selectedQueryId}
              onChange={(id) => setSelectedQueryId(id)}
              loading={loadingQueries}
            />
          </Col>
          <Col xs={24} md={12}>
            <ProductMultiselect
              products={products}
              selectedNmIds={selectedNmIds}
              onChange={(ids) => setSelectedNmIds(ids)}
              loading={loadingProducts}
            />
          </Col>
        </Row>
      </Card>

      {/* График динамики позиций */}
      <SerpLineChart
        data={chartData}
        selectedProducts={activeProducts}
        loading={loadingChart}
      />

      {/* Таблица характеристик топ-200 */}
      <SerpDataTable data={tableData} loading={loadingTable} />
    </div>
  );
};
