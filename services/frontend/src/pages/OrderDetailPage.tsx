import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import type { Order } from '../types/orders';

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const fetchOrder = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getOrderDetail(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    
    // Verificar si la orden ya está cancelada
    if (order?.status === 'CANCELLED') {
      setError('Esta orden ya está cancelada');
      setCancelDialogOpen(false);
      return;
    }
    
    setCancelLoading(true);
    setError(null); // Limpiar error previo
    
    try {
      console.log('[OrderDetail] Cancelando orden:', orderId);
      const data = await ordersApi.cancelOrder(orderId);
      console.log('[OrderDetail] Orden cancelada exitosamente:', data);
      
      setOrder(data);
      setCancelDialogOpen(false);
      
      // Recargar la orden para asegurar que tenemos los datos más recientes
      await fetchOrder();
    } catch (err: any) {
      console.error('[OrderDetail] Error al cancelar:', err);
      console.error('[OrderDetail] Response:', err.response);
      
      const status = err.response?.status;
      const message = err.response?.data?.message;
      
      if (status === 409) {
        setError('Esta orden ya está cancelada o no puede ser cancelada');
      } else if (status === 404) {
        setError('La orden no fue encontrada');
      } else {
        setError(message || 'Error al cancelar la orden');
      }
      setCancelDialogOpen(false);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!orderId) return;
    
    try {
      // Usar la orden actual como recibo
      // Si necesitas obtenerla del servidor nuevamente, usa getOrderDetail
      if (order) {
        setReceipt(order);
        setReceiptDialogOpen(true);
      } else {
        const data = await ordersApi.getOrderDetail(orderId);
        setReceipt(data);
        setReceiptDialogOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al obtener el recibo');
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <button className="btn btn-secondary mb-2" onClick={() => navigate('/orders')}>
          ← Volver
        </button>
        <div className="alert alert-error">
          {error || 'Orden no encontrada'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-3">
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/orders')}
          >
            ← Volver
          </button>
          <h1>Detalle de Orden</h1>
        </div>
        
        <div className="flex gap-1">
          <button
            className="btn btn-secondary"
            onClick={handleViewReceipt}
          >
            Ver Recibo
          </button>
          
          {order.status === 'ACTIVE' && (
            <button
              className="btn btn-danger"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancelar Orden
            </button>
          )}
        </div>
      </div>

      {/* Información General */}
      <div className="card">
        <h2 className="card-title">Información General</h2>
        
        <div className="grid grid-3">
          <div>
            <p className="text-muted mb-1">ID de Orden</p>
            <p className="font-mono">{order.orderId}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Fecha de Creación</p>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Estado</p>
            <span className={`chip ${order.status === 'ACTIVE' ? 'chip-success' : 'chip-default'}`}>
              {order.status}
            </span>
          </div>

          <div>
            <p className="text-muted mb-1">Zona Origen</p>
            <span className="chip chip-default">{order.originZone}</span>
          </div>

          <div>
            <p className="text-muted mb-1">Zona Destino</p>
            <span className="chip chip-default">{order.destinationZone}</span>
          </div>

          <div>
            <p className="text-muted mb-1">Tipo de Servicio</p>
            <span className="chip chip-warning">{order.serviceType}</span>
          </div>

          <div>
            <p className="text-muted mb-1">Seguro</p>
            <p>{order.insuranceEnabled ? 'Habilitado' : 'No habilitado'}</p>
          </div>

          {order.discount && order.discount.type !== 'NONE' && (
            <div>
              <p className="text-muted mb-1">Descuento</p>
              <p>
                {order.discount.type === 'PERCENT'
                  ? `${order.discount.value}%`
                  : `Q${order.discount.value.toFixed(2)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Paquetes */}
      <div className="card">
        <h2 className="card-title">Paquetes ({order.packages.length})</h2>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Peso (kg)</th>
                <th>Dimensiones (cm)</th>
                <th>Frágil</th>
                <th className="text-right">Valor Declarado (Q)</th>
              </tr>
            </thead>
            <tbody>
              {order.packages.map((pkg, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{pkg.weightKg}</td>
                  <td>
                    {pkg.heightCm} × {pkg.widthCm} × {pkg.lengthCm}
                  </td>
                  <td>
                    {pkg.fragile ? (
                      <span className="chip chip-warning">Sí</span>
                    ) : (
                      'No'
                    )}
                  </td>
                  <td className="text-right">
                    Q{pkg.declaredValueQ.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desglose de Costos */}
      <div className="card">
        <h2 className="card-title">Desglose de Costos</h2>
        
        <div className="grid grid-3">
          <div>
            <p className="text-muted mb-1">Peso Tarifable Total (kg)</p>
            <p>{(order.breakdown?.orderBillableKg || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Subtotal Base</p>
            <p>Q{(order.breakdown?.baseSubtotal || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Subtotal con Servicio</p>
            <p>Q{(order.breakdown?.serviceSubtotal || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Recargo Frágil</p>
            <p>Q{(order.breakdown?.fragileSurcharge || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Recargo Seguro</p>
            <p>Q{(order.breakdown?.insuranceSurcharge || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Subtotal con Recargos</p>
            <p>Q{(order.breakdown?.subtotalWithSurcharges || 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="text-muted mb-1">Descuento</p>
            <p style={{ color: '#2e7d32' }}>-Q{(order.breakdown?.discount || 0).toFixed(2)}</p>
          </div>

          <div>
            <h3 style={{ color: '#1976d2' }}>Total Final</h3>
            <h2 style={{ color: '#1976d2' }}>Q{(order.total || 0).toFixed(2)}</h2>
          </div>
        </div>
      </div>

      {/* Modal de Cancelación */}
      {cancelDialogOpen && (
        <div className="modal-overlay" onClick={() => setCancelDialogOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cancelar Orden</h2>
            </div>
            <div className="modal-content">
              <p>
                ¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setCancelDialogOpen(false)}
              >
                No, mantener orden
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancelOrder}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelando...' : 'Sí, cancelar orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recibo */}
      {receiptDialogOpen && receipt && (
        <div className="modal-overlay" onClick={() => setReceiptDialogOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Recibo de Orden</h2>
            </div>
            <div className="modal-content">
              <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                <h3 className="mb-2">QuetzalShip - Recibo</h3>
                
                <p><strong>Orden:</strong> {receipt.orderId}</p>
                <p><strong>Fecha:</strong> {new Date(receipt.createdAt).toLocaleString()}</p>
                <p><strong>Estado:</strong> {receipt.status}</p>
                
                <hr style={{ margin: '1rem 0' }} />
                
                <p><strong>Origen:</strong> {receipt.originZone}</p>
                <p><strong>Destino:</strong> {receipt.destinationZone}</p>
                <p><strong>Servicio:</strong> {receipt.serviceType}</p>
                
                <hr style={{ margin: '1rem 0' }} />
                
                {receipt.breakdown && (
                  <>
                    <p><strong>Peso Tarifable:</strong> {(receipt.breakdown.orderBillableKg || 0).toFixed(2)} kg</p>
                    <p><strong>Subtotal Base:</strong> Q{(receipt.breakdown.baseSubtotal || 0).toFixed(2)}</p>
                    <p><strong>Subtotal con Servicio:</strong> Q{(receipt.breakdown.serviceSubtotal || 0).toFixed(2)}</p>
                    <p><strong>Recargo Frágil:</strong> Q{(receipt.breakdown.fragileSurcharge || 0).toFixed(2)}</p>
                    <p><strong>Recargo Seguro:</strong> Q{(receipt.breakdown.insuranceSurcharge || 0).toFixed(2)}</p>
                    <p><strong>Descuento:</strong> -Q{(receipt.breakdown.discount || 0).toFixed(2)}</p>
                    <hr style={{ margin: '1rem 0' }} />
                  </>
                )}
                
                <h3 style={{ color: '#1976d2' }}>Total: Q{(receipt.total || 0).toFixed(2)}</h3>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setReceiptDialogOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;