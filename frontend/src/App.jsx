// src/App.jsx
import React from 'react';
import { Routes, Route, Link as RouterLink } from 'react-router-dom';
import MatchList from './components/MatchList'; // Ana sayfa bileşeni
import MatchDetail from './components/MatchDetail'; // Detay sayfası bileşeni

import './css/App.css'; // Yeni oluşturduğumuz CSS dosyasını import ediyoruz

function App() {
  return (
    <>
      
      <nav className="navbar navbar-light mb-4">
        <div className="container">
          
            <RouterLink to="/" className="navbar-brand">⚽ Futbol İstatistik (React)</RouterLink>
        </div>
      </nav>

     
      <div className="container">
        <Routes> 
          
         
          <Route path="/" element={<MatchList />} /> 
          
          
          <Route path="/match/:compId/:seasonId/:matchId" element={<MatchDetail />} />
          

      

        </Routes>
      </div>
    </>
  );
}

export default App;