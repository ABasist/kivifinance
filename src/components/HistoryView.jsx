import React, { useState, useEffect } from 'react';

const HistoryView = ({ SCRIPT_URL, userName }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(null);

    const renderStatus = (status) => {
        if (!status || status === '-' || status === '') return { label: 'Активно', class: 'active' };
        if (typeof status === 'string' && status.includes('Скасовано')) return { label: status, class: 'inactive' };
        if (status === 'Активно') return { label: 'Активно', class: 'active' };
        return { label: status, class: 'inactive' };
    };

    const fetchHistory = async () => {
        if (!userName) return;
        setLoading(true);
        try {
            // Використовуємо JSONP або звичайний fetch. Google Apps Script часто потребує спеціальної обробки
            // Але спробуємо звичайний fetch спочатку
            const response = await fetch(`${SCRIPT_URL}?action=getHistory&name=${encodeURIComponent(userName)}`);
            const result = await response.json();
            if (result.status === 'success') {
                setHistory(result.data || []);
            }
        } catch (error) {
            console.error('Помилка завантаження історії:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [userName]);

    const handleCancel = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете скасувати цей запис?')) return;

        setCancelling(id);
        try {
            // Для POST запитів до GAS ми часто використовуємо no-cors, але тут нам би хотілося знати результат
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CANCEL', id: id })
            });

            // Оскільки ми не можемо прочитати відповідь при no-cors, ми просто оновлюємо локально
            setHistory(prev => prev.map(item =>
                item.ID === id ? { ...item, 'Статус': 'Скасовано (Очікує оновлення)' } : item
            ));

            alert('Запит на скасування надіслано. Оновіть історію через хвилину.');
        } catch (error) {
            console.error('Помилка скасування:', error);
            alert('Помилка при скасуванні.');
        } finally {
            setCancelling(null);
        }
    };

    if (!userName) return <div className="history-empty">Оберіть користувача, щоб побачити історію.</div>;

    return (
        <div className="history-container">
            <div className="history-header">
                <h3>Мої звіти (останні 2 міс.)</h3>
                <button onClick={fetchHistory} disabled={loading} className="refresh-btn">
                    {loading ? '...' : '🔄 Оновити'}
                </button>
            </div>

            {loading ? (
                <div className="loading-mini">
                    <div className="spinner-mini"></div>
                    <p>Завантаження...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="history-empty">Записів не знайдено.</div>
            ) : (
                <div className="history-list">
                    {history.map((item, index) => {
                        const statusObj = renderStatus(item.Статус);
                        const canCancel = item.ID && statusObj.class === 'active';

                        return (
                            <div key={item.ID || index} className={`history-card ${statusObj.class === 'inactive' ? 'cancelled' : ''}`}>
                                <div className="history-card-header">
                                    <span className="history-date">
                                        {new Date(item['Дата/Час']).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={`status-badge ${statusObj.class}`}>
                                        {statusObj.label}
                                    </span>
                                </div>

                                <div className="history-card-body">
                                    <div className="history-main-info">
                                        <span className="history-type">{item['Тип']}</span>
                                        <span className="history-amount">{item['Сума чек']} ₴</span>
                                    </div>
                                    <div className="history-category">{item['Категорія/Програма']}</div>
                                    <div className="history-comment">{item['Коментар']}</div>
                                </div>

                                <div className="history-card-footer">
                                    {item['Посилання на PDF'] && item['Посилання на PDF'] !== '-' && (
                                        <a href={item['Посилання на PDF'].split(',')[0]} target="_blank" rel="noreferrer" className="view-file-link">
                                            📎 Чек(и)
                                        </a>
                                    )}

                                    {canCancel ? (
                                        <button
                                            onClick={() => handleCancel(item.ID)}
                                            disabled={cancelling === item.ID}
                                            className="cancel-btn"
                                        >
                                            {cancelling === item.ID ? '...' : 'Скасувати'}
                                        </button>
                                    ) : (
                                        !item.ID && <span className="old-record-hint" style={{ fontSize: '10px', color: '#8e8e93' }}>Старий запис (без ID)</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HistoryView;
