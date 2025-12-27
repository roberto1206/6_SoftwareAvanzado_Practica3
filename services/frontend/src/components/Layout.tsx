import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            QuetzalShip - KUBERNETS v3.0
          </div>
          
          <div className="navbar-links">
            <button
              className={`nav-button ${location.pathname === '/orders' ? 'active' : ''}`}
              onClick={() => navigate('/orders')}
            >
              Órdenes
            </button>
            
            <button
              className={`nav-button ${location.pathname === '/orders/create' ? 'active' : ''}`}
              onClick={() => navigate('/orders/create')}
            >
              + Nueva Orden
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <p>QuetzalShip © 2025 - Sistema de Envíos</p>
      </footer>
    </div>
  );
};

export default Layout;