import React, { useState } from 'react';
import { PERSONNEL, PERSONNEL_MAPPING, EXPENSE_TYPES } from '../constants';

const ExpenseForm = ({ onAddEntry, setUserRegion }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        type: '',
        comment: ''
    });

    const handleNameChange = (e) => {
        const name = e.target.value;
        const region = PERSONNEL_MAPPING[name];
        if (region) setUserRegion(region);
        setFormData({ ...formData, name });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const now = new Date();
        onAddEntry({
            ...formData,
            amount: parseFloat(formData.amount),
            id: Date.now(),
            timestamp: now.toISOString(),
            monthYear: `${now.getMonth() + 1}-${now.getFullYear()}`
        });
        setFormData({ name: '', amount: '', type: '', comment: '' });
        alert('Готово! Дані надіслано.');
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Хто заповнює?</label>
                <select value={formData.name} onChange={handleNameChange} required>
                    <option value="">Оберіть зі списку</option>
                    {PERSONNEL.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Категорія витрат</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required>
                    <option value="">Оберіть категорію</option>
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Сума, ₴</label>
                <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                />
            </div>

            <div className="form-group">
                <label>Деталі (необов'язково)</label>
                <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Наприклад: обід з клієнтом"
                    rows="2"
                />
            </div>

            <button type="submit" className="submit-btn">Відправити</button>
        </form>
    );
};

export default ExpenseForm;
