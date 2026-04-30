import React, { useState, useEffect } from 'react';
import './App.css';
import ExpenseForm from './components/ExpenseForm';

import HistoryView from './components/HistoryView';
import TargetsPlanner from './components/TargetsPlanner';

// ЗАМІНІТЬ ЦЕ НА ВАШ URL ПІСЛЯ РОЗГОРТАННЯ GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhqkkQpETFOJvsrL6y9ySgxuzvbgCt-wrntbvAbr5xPMwVKGMteXw98lJ5fo5x6OOmnQ/exec";

function App() {
  const [activeTab, setActiveTab] = useState('expense');
  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || '');
  const [userRegion, setUserRegion] = useState(() => localStorage.getItem('user_region'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userRegion) {
      localStorage.setItem('user_region', userRegion);
    } else {
      localStorage.removeItem('user_region');
    }
    if (userName) {
      localStorage.setItem('user_name', userName);
    } else {
      localStorage.removeItem('user_name');
    }
  }, [userRegion, userName]);

  const addEntry = async (entry) => {
    setIsSubmitting(true);
    console.log('Відправка даних...', entry);
    // Якщо ім'я не передано в entry, але є в стані App, додаємо його
    const finalEntry = { ...entry, action: 'ADD' };
    if (!finalEntry.pib && !finalEntry.name && userName) {
      finalEntry.name = userName;
    }

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Важливо для Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalEntry)
      });
      alert('Дані успішно відправлено в Google Таблицю!');
      // Якщо це був доданий запис, можливо оновити історію пізніше
    } catch (error) {
      console.error('Помилка відправки:', error);
      alert('Помилка при відправці. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSession = () => {
    setUserName('');
    setUserRegion(null);
  }

  return (
    <div className="app-container">
      <header>
        <div className="title-group">
          <h1>KIVI Finance v1.2.0</h1>
          <p className="subtitle">Finance & Operations Control</p>
        </div>
        {(userRegion || userName) && (
          <div className="region-badge">
            <span className="region-label">{userRegion || '...'}</span>
            <button className="change-btn" onClick={handleResetSession}>Змінити</button>
          </div>
        )}
      </header>

      {userName && (
        <div className="user-info-bar">
          Ви увійшли як: <strong>{userName}</strong>
        </div>
      )}

      <div className="info-block">
        <div className="info-item">
          <strong>📉 Витрати</strong> — 100% оплата компанією потреб бізнесу (нова пошта, таксі, KIVI TIME, навчання).
        </div>

      </div>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'expense' ? 'active' : ''}`}
            onClick={() => setActiveTab('expense')}
            disabled={isSubmitting}
          >
            ВИТРАТИ
          </button>

          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            disabled={isSubmitting}
          >
            ІСТОРІЯ
          </button>
          <button
            className={`tab-btn ${activeTab === 'targets' ? 'active' : ''}`}
            onClick={() => setActiveTab('targets')}
            disabled={isSubmitting}
          >
            ПЛАНИ
          </button>
        </div>

        <main>
          {isSubmitting ? (
            <div className="loading-screen">
              <div className="spinner"></div>
              <p>Надсилання даних...</p>
            </div>
          ) : (
            <>
              {activeTab === 'expense' && (
                <ExpenseForm
                  onAddEntry={addEntry}
                  setUserRegion={setUserRegion}
                  setUserName={setUserName}
                  initialName={userName}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView SCRIPT_URL={SCRIPT_URL} userName={userName} />
              )}
              {activeTab === 'targets' && (
                <TargetsPlanner userName={userName} />
              )}
            </>
          )}
        </main>
      </div>

      <footer className="footer">
        Developer by Anatolii Basist Tailored for KIVI - 2026 (v1.2.0)
      </footer>
    </div>
  );
}


export default App;
