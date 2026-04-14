CREATE TABLE IF NOT EXISTS "t_p45794133_smartmach_platform_p".orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    yookassa_payment_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    company_id INTEGER,
    plan VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "t_p45794133_smartmach_platform_p".order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES "t_p45794133_smartmach_platform_p".orders(id),
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON "t_p45794133_smartmach_platform_p".orders(yookassa_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON "t_p45794133_smartmach_platform_p".orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_company ON "t_p45794133_smartmach_platform_p".orders(company_id);
