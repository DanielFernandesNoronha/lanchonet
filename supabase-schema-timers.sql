ALTER TABLE lojistas 
ADD COLUMN IF NOT EXISTS aberto BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pausar_timers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tempo_novo INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS tempo_preparando INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS tempo_entrega INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS tempo_concluido INT DEFAULT 10;

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to auto-update status_updated_at when status changes
CREATE OR REPLACE FUNCTION update_pedido_status_time()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pedido_status_time ON pedidos;
CREATE TRIGGER trigger_update_pedido_status_time
BEFORE UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION update_pedido_status_time();
