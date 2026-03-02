import React, { useState } from 'react';
import { PERSONNEL, PERSONNEL_MAPPING, EXPENSE_TYPES } from '../constants';

const ExpenseForm = ({ onAddEntry, setUserRegion }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        type: '',
        comment: ''
    });
    const [files, setFiles] = useState([]);

    const handleNameChange = (e) => {
        const name = e.target.value;
        const region = PERSONNEL_MAPPING[name];
        if (region) setUserRegion(region);
        setFormData({ ...formData, name });
    };

    const handleFiles = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const filePromises = selectedFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        base64: reader.result.split(',')[1],
                        name: file.name,
                        type: file.type
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then(processedFiles => {
            setFiles(prev => [...prev, ...processedFiles]);
        });
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.comment.trim()) {
            alert('Будь ласка, заповніть деталі витрат (коментар)!');
            return;
        }

        const now = new Date();
        onAddEntry({
            ...formData,
            region: PERSONNEL_MAPPING[formData.name] || 'ОФІС/ІНШЕ',
            amount: parseFloat(formData.amount),
            id: Date.now(),
            timestamp: now.toISOString(),
            monthYear: `${now.getMonth() + 1}-${now.getFullYear()}`,
            files: files // Передаємо масив файлів
        });
        setFormData({ name: '', amount: '', type: '', comment: '' });
        setFiles([]);
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
                <label>Деталі (обов'язково)</label>
                <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Наприклад: обід з клієнтом"
                    rows="2"
                    required
                />
            </div>

            <div className="form-group">
                <label>Прикріпити чеки (можна декілька)</label>
                <div className="file-input-wrapper">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleFiles}
                        id="expense-files"
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="expense-files" className="file-label">
                        <span>📎 Оберіть файли</span>
                    </label>
                </div>
                {files.length > 0 && (
                    <div className="file-list">
                        {files.map((file, index) => (
                            <div key={index} className="file-item">
                                <span className="file-name">{file.name}</span>
                                <button type="button" onClick={() => removeFile(index)} className="remove-file">✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                type="submit"
                className="submit-btn"
                disabled={!formData.name || !formData.type || !formData.amount || !formData.comment.trim()}
                style={{
                    opacity: (!formData.name || !formData.type || !formData.amount || !formData.comment.trim()) ? 0.3 : 1,
                    cursor: (!formData.name || !formData.type || !formData.amount || !formData.comment.trim()) ? 'not-allowed' : 'pointer',
                    background: (!formData.name || !formData.type || !formData.amount || !formData.comment.trim()) ? '#ccc' : 'var(--accent)'
                }}
            >
                Відправити
            </button>
        </form>
    );
};

export default ExpenseForm;
