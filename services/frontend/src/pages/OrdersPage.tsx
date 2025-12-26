import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import type { OrderSummary } from '../types/orders';
import { fxApi } from '../api/fx.api';


const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [rateUsd, setRateUsd] = useState<number | null>(null);
  const [rateEur, setRateEur] = useState<number | null>(null);


  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.listOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // GTQ (Q) -> USD y GTQ (Q) -> EUR
    fxApi.getRate('GTQ', 'USD')
      .then((r) => setRateUsd(r.rate))
      .catch(() => setRateUsd(null));

    fxApi.getRate('GTQ', 'EUR')
      .then((r) => setRateEur(r.rate))
      .catch(() => setRateEur(null));
  }, []);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchOrderId.trim()) {
      navigate(`/orders/${searchOrderId.trim()}`);
      setSearchOpen(false);
      setSearchOrderId('');
    }
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      setSearchOrderId('');
    }
  };

  const getServiceChipClass = (serviceType: string) => {
    if (serviceType === 'SAME_DAY') return 'chip-error';
    if (serviceType === 'EXPRESS') return 'chip-warning';
    return 'chip-default';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-3">
        <h1>Órdenes de Envío</h1>
        <div className="flex gap-1 mb-2">
          <span className="chip chip-info">
            {rateUsd ? `Q → USD: ${rateUsd.toFixed(4)}` : 'Q → USD: ...'}
          </span>
          <span className="chip chip-info">
            {rateEur ? `Q → EUR: ${rateEur.toFixed(4)}` : 'Q → EUR: ...'}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            className="btn btn-secondary"
            onClick={toggleSearch}
            title="Buscar orden"
          >
            Buscar
          </button>
          <button
            className="btn btn-secondary"
            onClick={fetchOrders}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Barra de búsqueda expandible */}
      {searchOpen && (
        <div className="card mb-3" style={{
          animation: 'slideDown 0.3s ease-out',
          transformOrigin: 'top'
        }}>
          <form onSubmit={handleSearch} className="flex-between" style={{ gap: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar orden por ID..."
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              className="form-input"
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleSearch}
            >
              ✕
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-3">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card">
          <p className="text-center text-muted">
            No hay órdenes registradas
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID Orden</th>
                  <th>Destino</th>
                  <th>Tipo de Servicio</th>
                  <th>Estado</th>
                  <th className="text-right">Total (Q)</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => navigate(`/orders/${order.orderId}`)}
                  >
                    <td>
                      <span className="font-mono">{order.orderId}</span>
                    </td>
                    <td>{order.destinationZone}</td>
                    <td>
                      <span className={`chip ${getServiceChipClass(order.serviceType)}`}>
                        {order.serviceType}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${order.status === 'ACTIVE' ? 'chip-success' : 'chip-default'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <strong>Q{order.total.toFixed(2)}</strong>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.orderId}`);
                        }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;