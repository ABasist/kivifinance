import React, { useEffect, useMemo, useState } from 'react';
import {
  MONTHS,
  DEFAULT_MONTH_WEIGHTS,
  DEFAULT_WEEK_WEIGHTS,
  DEFAULT_STORES,
  distributeTarget,
  normalizeWeights
} from '../utils/targetAllocation';
import { buildTargetsSql } from '../utils/targetsSqlExport';

const STORAGE_KEY = 'targets_planner_config_v1';

const REGION_DEFAULTS = {
  Київ: 1.25,
  Центр: 1,
  Південь: 1.05,
  Захід: 1.1,
  Схід: 0.9
};

const DEFAULT_FOCUS_PRODUCTS = [
  { sku: 'TV-001', name: 'KIVI 43" U740', focus: true, bonusSeller: 450, bonusCompany: 300 },
  { sku: 'TV-002', name: 'KIVI 50" U760', focus: true, bonusSeller: 600, bonusCompany: 380 },
  { sku: 'TV-003', name: 'KIVI 32" H550', focus: false, bonusSeller: 0, bonusCompany: 0 },
  { sku: 'TV-004', name: 'KIVI 55" U800', focus: true, bonusSeller: 800, bonusCompany: 550 }
];

const DEFAULT_PLAN_META = {
  profileName: 'UA retail 2026',
  cycleName: 'Річний план 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31'
};

function formatNumber(value) {
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(value);
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getInitialState() {
  return {
    yearTarget: 120000,
    monthWeights: DEFAULT_MONTH_WEIGHTS,
    weekWeights: DEFAULT_WEEK_WEIGHTS,
    regionCoefficients: REGION_DEFAULTS,
    stores: DEFAULT_STORES,
    focusProducts: DEFAULT_FOCUS_PRODUCTS,
    meta: DEFAULT_PLAN_META
  };
}

const TargetsPlanner = ({ userName }) => {
  const initial = getInitialState();

  const [yearTarget, setYearTarget] = useState(initial.yearTarget);
  const [monthWeights, setMonthWeights] = useState(initial.monthWeights);
  const [weekWeights, setWeekWeights] = useState(initial.weekWeights);
  const [regionCoefficients, setRegionCoefficients] = useState(initial.regionCoefficients);
  const [stores, setStores] = useState(initial.stores);
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [focusProducts, setFocusProducts] = useState(initial.focusProducts);
  const [meta, setMeta] = useState(initial.meta);
  const [sqlPreview, setSqlPreview] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (parsed.yearTarget !== undefined) setYearTarget(parseNumber(parsed.yearTarget, initial.yearTarget));
      if (parsed.monthWeights) setMonthWeights(parsed.monthWeights);
      if (parsed.weekWeights) setWeekWeights(parsed.weekWeights);
      if (parsed.regionCoefficients) setRegionCoefficients(parsed.regionCoefficients);
      if (Array.isArray(parsed.stores)) setStores(parsed.stores);
      if (Array.isArray(parsed.focusProducts)) setFocusProducts(parsed.focusProducts);
      if (parsed.meta) setMeta(parsed.meta);
      setStatusMessage('Конфігурацію завантажено з браузера.');
    } catch (error) {
      console.error('Failed to load targets planner config', error);
      setStatusMessage('Не вдалося завантажити попередню конфігурацію.');
    }
  }, []);

  const distribution = useMemo(() => {
    return distributeTarget({
      totalGoal: yearTarget,
      monthWeights,
      weekWeights,
      regionCoefficients,
      stores
    });
  }, [yearTarget, monthWeights, weekWeights, regionCoefficients, stores]);

  const normalizedMonthWeights = useMemo(() => normalizeWeights(monthWeights), [monthWeights]);
  const normalizedWeekWeights = useMemo(() => normalizeWeights(weekWeights), [weekWeights]);

  const selectedRows = useMemo(() => {
    return distribution.rows.filter(
      (row) => row.month === selectedMonth && row.week === selectedWeek
    );
  }, [distribution.rows, selectedMonth, selectedWeek]);

  const monthTotal = useMemo(() => {
    return distribution.rows
      .filter((row) => row.month === selectedMonth)
      .reduce((sum, row) => sum + row.target, 0);
  }, [distribution.rows, selectedMonth]);

  const focusCount = focusProducts.filter((item) => item.focus).length;

  const handleMonthWeight = (month, value) => {
    setMonthWeights((prev) => ({ ...prev, [month]: parseNumber(value, 0) }));
  };

  const handleWeekWeight = (week, value) => {
    setWeekWeights((prev) => ({ ...prev, [week]: parseNumber(value, 0) }));
  };

  const handleRegionCoeff = (region, value) => {
    setRegionCoefficients((prev) => ({ ...prev, [region]: parseNumber(value, 0) }));
  };

  const handleStoreCoeff = (storeId, key, value) => {
    setStores((prev) => prev.map((store) => {
      if (store.id !== storeId) return store;
      return { ...store, [key]: key === 'hasPromoter' ? value : parseNumber(value, 0) };
    }));
  };

  const handleFocusProduct = (sku, key, value) => {
    setFocusProducts((prev) => prev.map((item) => {
      if (item.sku !== sku) return item;

      const updated = { ...item, [key]: key === 'focus' ? value : parseNumber(value, 0) };
      if (!updated.focus) {
        updated.bonusSeller = 0;
        updated.bonusCompany = 0;
      }
      return updated;
    }));
  };

  const handleSaveConfig = () => {
    const payload = {
      yearTarget,
      monthWeights,
      weekWeights,
      regionCoefficients,
      stores,
      focusProducts,
      meta
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setStatusMessage('Конфігурацію збережено у браузері.');
  };

  const handleReset = () => {
    const defaults = getInitialState();
    setYearTarget(defaults.yearTarget);
    setMonthWeights(defaults.monthWeights);
    setWeekWeights(defaults.weekWeights);
    setRegionCoefficients(defaults.regionCoefficients);
    setStores(defaults.stores);
    setFocusProducts(defaults.focusProducts);
    setMeta(defaults.meta);
    setSqlPreview('');
    setStatusMessage('Скинуто до значень за замовчуванням.');
  };

  const handleGenerateSql = () => {
    const sql = buildTargetsSql({
      profileName: meta.profileName,
      cycleName: meta.cycleName,
      totalGoal: yearTarget,
      monthWeights,
      weekWeights,
      regionCoefficients,
      stores,
      startDate: meta.startDate,
      endDate: meta.endDate,
      createdBy: userName || 'admin'
    });

    setSqlPreview(sql);
    setStatusMessage('SQL згенеровано. Перевірте та виконайте у вашій БД.');
  };

  return (
    <div className="targets-admin">
      <div className="targets-note">
        Фокусні товари: продавець бачить тільки ознаку <strong>ФОКУС</strong>. Період та керування бонусами лишаються в адмінці.
      </div>

      <section className="targets-section">
        <h3>1) Параметри плану</h3>
        <div className="targets-grid">
          <div className="form-group compact">
            <label>Назва профілю ваг</label>
            <input
              type="text"
              value={meta.profileName}
              onChange={(e) => setMeta((prev) => ({ ...prev, profileName: e.target.value }))}
            />
          </div>
          <div className="form-group compact">
            <label>Назва циклу</label>
            <input
              type="text"
              value={meta.cycleName}
              onChange={(e) => setMeta((prev) => ({ ...prev, cycleName: e.target.value }))}
            />
          </div>
          <div className="form-group compact">
            <label>Початок циклу</label>
            <input
              type="date"
              value={meta.startDate}
              onChange={(e) => setMeta((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="form-group compact">
            <label>Кінець циклу</label>
            <input
              type="date"
              value={meta.endDate}
              onChange={(e) => setMeta((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group compact">
          <label>Річна ціль продажів, ₴</label>
          <input
            type="number"
            min="0"
            value={yearTarget}
            onChange={(e) => setYearTarget(parseNumber(e.target.value, 0))}
          />
        </div>
        <div className="targets-actions">
          <button type="button" className="secondary-btn" onClick={handleSaveConfig}>Зберегти конфіг</button>
          <button type="button" className="secondary-btn" onClick={handleReset}>Скинути</button>
          <button type="button" className="submit-btn" onClick={handleGenerateSql}>Згенерувати SQL</button>
        </div>
        {statusMessage && <div className="targets-hint">{statusMessage}</div>}
      </section>

      <section className="targets-section">
        <h3>2) Ваги місяців (сезонність)</h3>
        <div className="targets-grid two-col">
          {MONTHS.map((month) => (
            <div key={month.key} className="form-group compact">
              <label>{month.label} (введено {formatNumber(monthWeights[month.key])}%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={monthWeights[month.key]}
                onChange={(e) => handleMonthWeight(month.key, e.target.value)}
              />
              <div className="targets-hint">Нормалізовано: {formatNumber(normalizedMonthWeights[month.key] || 0)}%</div>
            </div>
          ))}
        </div>
      </section>

      <section className="targets-section">
        <h3>3) Ваги тижнів місяця</h3>
        <div className="targets-grid">
          {[1, 2, 3, 4, 5].map((week) => (
            <div key={week} className="form-group compact">
              <label>Тиждень {week} (введено {formatNumber(weekWeights[week])}%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weekWeights[week]}
                onChange={(e) => handleWeekWeight(week, e.target.value)}
              />
              <div className="targets-hint">Нормалізовано: {formatNumber(normalizedWeekWeights[week] || 0)}%</div>
            </div>
          ))}
        </div>
      </section>

      <section className="targets-section">
        <h3>4) Коефіцієнти регіонів</h3>
        <div className="targets-grid">
          {Object.keys(regionCoefficients).map((region) => (
            <div key={region} className="form-group compact">
              <label>{region}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={regionCoefficients[region]}
                onChange={(e) => handleRegionCoeff(region, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="targets-section">
        <h3>5) Магазини та промоутери</h3>
        <div className="targets-table-wrap">
          <table className="targets-table">
            <thead>
              <tr>
                <th>Регіон</th>
                <th>Магазин</th>
                <th>Коеф. магазину</th>
                <th>Промоутер</th>
                <th>Коеф. промо</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>{store.region}</td>
                  <td>{store.name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={store.storeCoeff}
                      onChange={(e) => handleStoreCoeff(store.id, 'storeCoeff', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={store.hasPromoter}
                      onChange={(e) => handleStoreCoeff(store.id, 'hasPromoter', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={store.promoterCoeff}
                      onChange={(e) => handleStoreCoeff(store.id, 'promoterCoeff', e.target.value)}
                      disabled={!store.hasPromoter}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="targets-section">
        <h3>6) Фокусні товари місяця</h3>
        <div className="focus-summary">Активних фокусних SKU: <strong>{focusCount}</strong></div>
        <div className="targets-table-wrap">
          <table className="targets-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Товар</th>
                <th>Фокус</th>
                <th>Бонус продавця, ₴</th>
                <th>Бонус компанії, ₴</th>
              </tr>
            </thead>
            <tbody>
              {focusProducts.map((item) => (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.focus}
                      onChange={(e) => handleFocusProduct(item.sku, 'focus', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.bonusSeller}
                      disabled={!item.focus}
                      onChange={(e) => handleFocusProduct(item.sku, 'bonusSeller', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.bonusCompany}
                      disabled={!item.focus}
                      onChange={(e) => handleFocusProduct(item.sku, 'bonusCompany', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="targets-section">
        <h3>7) Результат авто-розподілу</h3>
        <div className="targets-grid">
          <div className="form-group compact">
            <label>Місяць</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map((month) => (
                <option key={month.key} value={month.key}>{month.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group compact">
            <label>Тиждень</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((week) => (
                <option key={week} value={week}>Тиждень {week}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="targets-metrics">
          <div className="metric-card">
            <span>Нормалізована вага місяця</span>
            <strong>{formatNumber(distribution.normalizedMonths[selectedMonth] || 0)}%</strong>
          </div>
          <div className="metric-card">
            <span>План місяця</span>
            <strong>{formatNumber(monthTotal)} ₴</strong>
          </div>
        </div>

        <div className="targets-table-wrap">
          <table className="targets-table">
            <thead>
              <tr>
                <th>Регіон</th>
                <th>Магазин</th>
                <th>Промоутер</th>
                <th>План тижня, ₴</th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.map((row, index) => (
                <tr key={`${row.store}-${index}`}>
                  <td>{row.region}</td>
                  <td>{row.store}</td>
                  <td>{row.hasPromoter ? 'Так' : 'Ні'}</td>
                  <td>{formatNumber(row.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sqlPreview && (
        <section className="targets-section">
          <h3>8) SQL Preview</h3>
          <p className="targets-hint">Скопіюйте цей SQL та виконайте у PostgreSQL після створення таблиць.</p>
          <textarea className="sql-preview" value={sqlPreview} readOnly rows={16} />
        </section>
      )}
    </div>
  );
};

export default TargetsPlanner;
