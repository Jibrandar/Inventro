use inventra;
-- CREATE TABLE products (
--   id VARCHAR(255) PRIMARY KEY,        -- UUID
--   name VARCHAR(100) NOT NULL,         -- Product name
--   category VARCHAR(100),              -- Optional: Electronics, Grocery, etc.
--   quantity INT DEFAULT 0,             -- Stock quantity
--   price DECIMAL(10,2),                -- Product price

--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
INSERT INTO products (id, name, category, quantity, price) VALUES
("1a2b3c4d-1111-2222-3333-444455556666", "Wireless Mouse", "Electronics", 25, 599.99),
("2b3c4d5e-1111-2222-3333-555566667777", "HDMI Cable", "Electronics", 10, 199.00),
("3c4d5e6f-1111-2222-3333-666677778888", "Office Chair", "Furniture", 5, 3599.00),
("4d5e6f7g-1111-2222-3333-777788889999", "Notebook (A5)", "Stationery", 100, 45.00),
("5e6f7g8h-1111-2222-3333-888899990000", "LED Tube Light", "Electrical", 15, 699.00),
("6f7g8h9i-1111-2222-3333-999900001111", "Bluetooth Speaker", "Electronics", 8, 1299.50),
("7g8h9i0j-1111-2222-3333-000011112222", "Marker Pen (Black)", "Stationery", 60, 20.00),
("8h9i0j1k-1111-2222-3333-111122223333", "Ceiling Fan", "Electrical", 12, 2499.00),
("9i0j1k2l-1111-2222-3333-222233334444", "Whiteboard", "Office", 7, 999.00),
("0j1k2l3m-1111-2222-3333-333344445555", "USB Flash Drive 32GB", "Electronics", 40, 349.00);
