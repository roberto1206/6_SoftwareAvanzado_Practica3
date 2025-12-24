-- =============================================
-- QUETZAL SHIP - DATABASE SCHEMA
-- SQL Server 2019+
-- =============================================

-- Crear base de datos
CREATE DATABASE QuetzalShip;
GO

USE QuetzalShip;
GO

-- =============================================
-- TABLA: Orders (Órdenes de Envío)
-- =============================================
CREATE TABLE Orders (
    order_id VARCHAR(50) PRIMARY KEY,                    -- Formato: "ORD-{UUID}"
    created_at DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),
    status TINYINT NOT NULL DEFAULT 1,                   -- 1=ACTIVE, 2=CANCELLED
    origin_zone TINYINT NOT NULL,                        -- 1=METRO, 2=INTERIOR, 3=FRONTERA
    destination_zone TINYINT NOT NULL,                   -- 1=METRO, 2=INTERIOR, 3=FRONTERA
    service_type TINYINT NOT NULL,                       -- 1=STANDARD, 2=EXPRESS, 3=SAME_DAY
    insurance_enabled BIT NOT NULL DEFAULT 0,

    -- Descuento
    discount_type TINYINT NULL,                          -- 1=NONE, 2=PERCENT, 3=FIXED
    discount_value DECIMAL(10,2) NULL,

    -- Desglose de cálculo (guardado para recibo estable y auditable)
    order_billable_kg DECIMAL(10,2) NOT NULL,
    base_subtotal DECIMAL(10,2) NOT NULL,
    service_subtotal DECIMAL(10,2) NOT NULL,
    fragile_surcharge DECIMAL(10,2) NOT NULL DEFAULT 0,
    insurance_surcharge DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal_with_surcharges DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,

    -- Auditoría
    updated_at DATETIME2(7) NULL,
    cancelled_at DATETIME2(7) NULL,

    -- Constraints
    CONSTRAINT CK_Orders_Status CHECK (status IN (1, 2)),
    CONSTRAINT CK_Orders_OriginZone CHECK (origin_zone IN (1, 2, 3)),
    CONSTRAINT CK_Orders_DestinationZone CHECK (destination_zone IN (1, 2, 3)),
    CONSTRAINT CK_Orders_ServiceType CHECK (service_type IN (1, 2, 3)),
    CONSTRAINT CK_Orders_DiscountType CHECK (discount_type IS NULL OR discount_type IN (1, 2, 3)),
    CONSTRAINT CK_Orders_DiscountValue CHECK (
        (discount_type IS NULL AND discount_value IS NULL) OR
        (discount_type = 1 AND discount_value IS NULL) OR
        (discount_type = 2 AND discount_value BETWEEN 0 AND 35) OR
        (discount_type = 3 AND discount_value >= 0)
    ),
    CONSTRAINT CK_Orders_Total CHECK (total >= 0)
);
GO

-- Índices para Orders
CREATE INDEX IX_Orders_CreatedAt ON Orders(created_at DESC);
CREATE INDEX IX_Orders_Status ON Orders(status);
GO

-- =============================================
-- TABLA: Packages (Paquetes dentro de órdenes)
-- =============================================
CREATE TABLE Packages (
    package_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,

    -- Dimensiones y peso
    weight_kg DECIMAL(10,2) NOT NULL,
    height_cm DECIMAL(10,2) NOT NULL,
    width_cm DECIMAL(10,2) NOT NULL,
    length_cm DECIMAL(10,2) NOT NULL,

    -- Atributos
    fragile BIT NOT NULL DEFAULT 0,
    declared_value_q DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Cálculos (para auditoría y transparencia)
    volumetric_kg DECIMAL(10,2) NULL,
    billable_kg DECIMAL(10,2) NULL,

    -- Auditoría
    created_at DATETIME2(7) NOT NULL DEFAULT GETUTCDATE(),

    -- Constraints
    CONSTRAINT FK_Packages_Order FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    CONSTRAINT CK_Packages_Weight CHECK (weight_kg > 0),
    CONSTRAINT CK_Packages_Height CHECK (height_cm > 0),
    CONSTRAINT CK_Packages_Width CHECK (width_cm > 0),
    CONSTRAINT CK_Packages_Length CHECK (length_cm > 0),
    CONSTRAINT CK_Packages_DeclaredValue CHECK (declared_value_q >= 0)
);
GO

-- Índices para Packages
CREATE INDEX IX_Packages_OrderId ON Packages(order_id);
GO

-- =============================================
-- COMENTARIOS SOBRE REGLAS DE NEGOCIO HARD-CODED
-- =============================================

/*
VALORES FIJOS EN LA APLICACIÓN (NO EN BD):

1. TARIFAS POR ZONA:
   - METRO (1): Q8.00/kg
   - INTERIOR (2): Q12.00/kg
   - FRONTERA (3): Q16.00/kg

2. MULTIPLICADORES DE TIPO DE SERVICIO:
   - STANDARD (1): 1.00x
   - EXPRESS (2): 1.35x
   - SAME_DAY (3): 1.80x

3. RECARGOS:
   - FRAGILE: Q7.00 por paquete frágil
   - INSURANCE: 2.5% del valor declarado total

4. DESCUENTOS:
   - NONE (1): Sin descuento
   - PERCENT (2): 0-35% del subtotal
   - FIXED (3): Monto fijo en Q

5. CÁLCULO PESO VOLUMÉTRICO:
   - (alto_cm × ancho_cm × largo_cm) / 5000

*/
