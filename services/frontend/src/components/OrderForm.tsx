import React, { useState } from 'react';
import { ordersApi, generateIdempotencyKey } from '../api/orders';
import type { CreateOrderRequest, Package, CreateOrderResponse } from '../types/orders';

const OrderForm: React.FC = () => {
  const [originZone, setOriginZone] = useState<'METRO' | 'INTERIOR' | 'FRONTERA'>('METRO');
  const [destinationZone, setDestinationZone] = useState<'METRO' | 'INTERIOR' | 'FRONTERA'>('METRO');
  const [serviceType, setServiceType] = useState<'STANDARD' | 'EXPRESS' | 'SAME_DAY'>('STANDARD');
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [discountValue, setDiscountValue] = useState(0);
  
  const [packages, setPackages] = useState<Package[]>([{
    weightKg: 1,
    heightCm: 10,
    widthCm: 10,
    lengthCm: 10,
    fragile: false,
    declaredValueQ: 0
  }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrderResponse | null>(null);

  const addPackage = () => {
    setPackages([...packages, {
      weightKg: 1,
      heightCm: 10,
      widthCm: 10,
      lengthCm: 10,
      fragile: false,
      declaredValueQ: 0
    }]);
  };

  const removePackage = (index: number) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index: number, field: keyof Package, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validación: si el seguro está habilitado, debe haber al menos un valor declarado > 0
      if (insuranceEnabled) {
        const totalDeclaredValue = packages.reduce((sum, pkg) => sum + pkg.declaredValueQ, 0);
        if (totalDeclaredValue <= 0) {
          setError('El seguro requiere que al menos un paquete tenga un valor declarado mayor a 0');
          setLoading(false);
          return;
        }
      }

      const orderData: CreateOrderRequest = {
        originZone,
        destinationZone,
        serviceType,
        packages,
        insuranceEnabled,
        ...(discountType !== 'NONE' && {
          discount: { type: discountType, value: discountValue }
        })
      };

      const response = await ordersApi.createOrder(
        orderData,
        generateIdempotencyKey()
      );
      
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-3">Crear Nueva Orden</h1>

      <form onSubmit={handleSubmit}>
        {/* Información de Envío */}
        <div className="card">
          <h2 className="card-title">Información de Envío</h2>
          
          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">Zona Origen</label>
              <select
                className="form-select"
                value={originZone}
                onChange={(e) => setOriginZone(e.target.value as any)}
              >
                <option value="METRO">METRO</option>
                <option value="INTERIOR">INTERIOR</option>
                <option value="FRONTERA">FRONTERA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Zona Destino</label>
              <select
                className="form-select"
                value={destinationZone}
                onChange={(e) => setDestinationZone(e.target.value as any)}
              >
                <option value="METRO">METRO</option>
                <option value="INTERIOR">INTERIOR</option>
                <option value="FRONTERA">FRONTERA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Servicio</label>
              <select
                className="form-select"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
              >
                <option value="STANDARD">STANDARD</option>
                <option value="EXPRESS">EXPRESS</option>
                <option value="SAME_DAY">SAME DAY</option>
              </select>
            </div>
          </div>
        </div>

        {/* Paquetes */}
        <div className="card">
          <div className="flex-between mb-2">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              Paquetes ({packages.length})
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={addPackage}
            >
              + Agregar Paquete
            </button>
          </div>

          {packages.map((pkg, index) => (
            <div key={index} className="package-card">
              <div className="package-header">
                <h3>Paquete {index + 1}</h3>
                {packages.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => removePackage(index)}
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-4">
                <div className="form-group">
                  <label className="form-label">Peso (kg)</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.01"
                    min="0.01"
                    value={pkg.weightKg}
                    onChange={(e) => updatePackage(index, 'weightKg', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Alto (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={pkg.heightCm}
                    onChange={(e) => updatePackage(index, 'heightCm', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ancho (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={pkg.widthCm}
                    onChange={(e) => updatePackage(index, 'widthCm', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Largo (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={pkg.lengthCm}
                    onChange={(e) => updatePackage(index, 'lengthCm', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Valor Declarado (Q)</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.01"
                    min="0"
                    value={pkg.declaredValueQ}
                    onChange={(e) => updatePackage(index, 'declaredValueQ', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={pkg.fragile}
                      onChange={(e) => updatePackage(index, 'fragile', e.target.checked)}
                    />
                    Frágil
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Opciones Adicionales */}
        <div className="card">
          <h2 className="card-title">Opciones Adicionales</h2>

          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={insuranceEnabled}
                  onChange={(e) => setInsuranceEnabled(e.target.checked)}
                />
                Habilitar Seguro
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Descuento</label>
              <select
                className="form-select"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
              >
                <option value="NONE">Sin descuento</option>
                <option value="PERCENT">Porcentaje (%)</option>
                <option value="FIXED">Monto Fijo (Q)</option>
              </select>
            </div>

            {discountType !== 'NONE' && (
              <div className="form-group">
                <label className="form-label">
                  {discountType === 'PERCENT' ? 'Porcentaje (%)' : 'Monto (Q)'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  step="0.01"
                  min="0"
                  max={discountType === 'PERCENT' ? 35 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                />
                {discountType === 'PERCENT' && (
                  <small className="text-muted">Máximo 35%</small>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botón Submit */}
        <div className="flex-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </form>

      {/* Mensajes de Error */}
      {error && (
        <div className="alert alert-error mt-2">
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="card mt-2" style={{ backgroundColor: '#e8f5e9' }}>
          <h2 style={{ color: '#2e7d32' }}>Orden Creada Exitosamente</h2>
          
          <div className="grid grid-3 mt-2">
            <div>
              <p className="text-muted">ID de Orden</p>
              <h3 className="font-mono">{result.orderId}</h3>
            </div>

            <div>
              <p className="text-muted">Estado</p>
              <h3>{result.status}</h3>
            </div>

            <div>
              <p className="text-muted">Total</p>
              <h3 style={{ color: '#1976d2' }}>Q{result.total.toFixed(2)}</h3>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-muted mb-1">Desglose</p>
            <pre style={{ background: 'white', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(result.breakdown, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;