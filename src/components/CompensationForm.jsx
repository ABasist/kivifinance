import React, { useState, useEffect } from 'react';
import { COMPENSATION_PROGRAMS } from '../constants';

const CompensationForm = ({ onAddEntry, userRegion }) => {
    const [formData, setFormData] = useState({
        pib: '',
        program: '',
        checkAmount: '',
        file: null,
        fileName: ''
    });

    const [calc, setCalc] = useState(0);

    useEffect(() => {
        const program = COMPENSATION_PROGRAMS.find(p => p.name === formData.program);
        if (program && formData.checkAmount) {
            setCalc(parseFloat(formData.checkAmount) * program.rate);
        } else {
            setCalc(0);
        }
    }, [formData.program, formData.checkAmount]);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(p => ({ ...p, file: reader.result.split(',')[1], fileName: file.name }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.file) return alert('Потрібен PDF файл чека');
        const now = new Date();
        onAddEntry({
            type: 'COMPENSATION',
            region: userRegion || 'ОФІС/ІНШЕ',
            monthYear: `${now.getMonth() + 1}-${now.getFullYear()}`,
            pib: formData.pib,
            program: formData.program,
            checkAmount: parseFloat(formData.checkAmount),
            compensationAmount: calc,
            file: formData.file,
            fileName: formData.fileName,
            id: Date.now(),
            timestamp: now.toISOString()
        });
        setFormData({ pib: '', program: '', checkAmount: '', file: null, fileName: '' });
        alert('Заявку надіслано!');
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Хто отримує компенсацію?</label>
                <input
                    type="text"
                    value={formData.pib}
                    onChange={(e) => setFormData({ ...formData, pib: e.target.value })}
                    placeholder="Введіть ПІБ вручну"
                    required
                />
            </div>

            <div className="form-group">
                <label>Програма</label>
                <select value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} required>
                    <option value="">Оберіть зі списку</option>
                    {COMPENSATION_PROGRAMS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Сума по чеку, ₴</label>
                <input
                    type="number"
                    value={formData.checkAmount}
                    onChange={(e) => setFormData({ ...formData, checkAmount: e.target.value })}
                    placeholder="0.00"
                    required
                />
            </div>

            <div className="form-group">
                <label>Документ (PDF)</label>
                <div className="file-input-wrapper">
                    <input type="file" accept="application/pdf" onChange={handleFile} />
                    <span style={{ fontSize: '14px', color: formData.fileName ? '#34c759' : '#86868b' }}>
                        {formData.fileName || "Натисніть для вибору"}
                    </span>
                </div>
            </div>

            <div className="calc-preview">
                <div className="calc-row">
                    <span>Сума до виплати:</span>
                    <span>{calc.toFixed(2)} ₴</span>
                </div>
                <div className="calc-total">Разом: {calc.toFixed(2)} ₴</div>
            </div>

            <button type="submit" className="submit-btn" disabled={!formData.file}>Надіслати</button>
        </form>
    );
};

export default CompensationForm;
