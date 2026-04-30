import React from 'react';

const SummaryDashboard = ({ entries }) => {
    const expenseEntries = entries.filter(e => !e.type || e.type !== 'COMPENSATION');
    const compEntries = entries.filter(e => e.type === 'COMPENSATION');

    // Aggregation for Expenses
    const expenseAgg = expenseEntries.reduce((acc, entry) => {
        if (!acc[entry.type]) acc[entry.type] = 0;
        acc[entry.type] += entry.amount;
        return acc;
    }, {});

    const sortedExpenses = Object.entries(expenseAgg)
        .map(([type, total]) => ({ type, total }))
        .sort((a, b) => b.total - a.total);

    // Aggregation for Compensations
    const totalComp = compEntries.reduce((sum, e) => sum + e.compensationAmount, 0);

    return (
        <div className="summary-dashboard">
            <div className="summary-card">
                <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>Витрати по категоріям</h3>
                <div className="summary-grid">
                    {sortedExpenses.length > 0 ? sortedExpenses.map((item, i) => (
                        <div key={i} className="stat-item">
                            <span className="stat-label">{item.type}</span>
                            <span className="stat-value">{item.total.toLocaleString()} ₴</span>
                        </div>
                    )) : <div className="stat-label">Даних немає</div>}
                </div>
            </div>



            <div className="summary-card">
                <h3 style={{ marginBottom: '15px' }}>Останні записи</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '13px' }}>
                    {entries.slice(0, 10).map((e, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{e.monthYear} | {e.region} | {e.pib || e.name}</span>
                            <span style={{ fontWeight: '700' }}>{(e.compensationAmount || e.amount).toLocaleString()} ₴</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SummaryDashboard;
