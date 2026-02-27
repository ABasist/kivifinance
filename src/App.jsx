import React, { useState, useEffect } from 'react';
import './App.css';
import ExpenseForm from './components/ExpenseForm';
import CompensationForm from './components/CompensationForm';

// ЗАМІНІТЬ ЦЕ НА ВАШ URL ПІСЛЯ РОЗГОРТАННЯ GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwAYXlPRWHi_HELq-RRjsicdicgBZGhMz2AtgDoVOo2l5MbMyN96czI-WFQlcf-tEiX/exec";

function App() {
  const [activeTab, setActiveTab] = useState('expense');
  const [userRegion, setUserRegion] = useState(() => localStorage.getItem('user_region'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userRegion) {
      localStorage.setItem('user_region', userRegion);
    } else {
      localStorage.removeItem('user_region');
    }
  }, [userRegion]);

  const addEntry = async (entry) => {
    setIsSubmitting(true);
    console.log('Відправка даних...', entry);

    try {
      // Якщо URL не налаштовано, просто імітуємо успіх для тесту
      if (SCRIPT_URL === "ВАШ_URL_СКРИПТА") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Дані збережено локально (URL скрипта не налаштовано)');
      } else {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // Важливо для Google Apps Script
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        alert('Дані успішно відправлено в Google Таблицю!');
      }
    } catch (error) {
      console.error('Помилка відправки:', error);
      alert('Помилка при відправці. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="title-group">
          <h1>KIVI Portal</h1>
          <p className="subtitle">Finance & Operations Control</p>
        </div>
        {userRegion && (
          <div className="region-badge">
            <span className="region-label">{userRegion}</span>
            <button className="change-btn" onClick={() => setUserRegion(null)}>Змінити</button>
          </div>
        )}
      </header>

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
            className={`tab-btn ${activeTab === 'compensation' ? 'active' : ''}`}
            onClick={() => setActiveTab('compensation')}
            disabled={isSubmitting}
          >
            КОМПЕНСАЦІЇ
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
                <ExpenseForm onAddEntry={addEntry} setUserRegion={setUserRegion} />
              )}
              {activeTab === 'compensation' && (
                <CompensationForm onAddEntry={addEntry} userRegion={userRegion} />
              )}
            </>
          )}
        </main>
      </div>

      <footer className="footer">
        KIVI &bull; INTERNAL PURPOSE ONLY &bull; 2026
      </footer>
    </div>
  );
}

export default App;
