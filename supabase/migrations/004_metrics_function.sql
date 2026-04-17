-- Función para incrementar métricas de forma atómica
CREATE OR REPLACE FUNCTION increment_metrica(
    p_servicio VARCHAR,
    p_metodo   VARCHAR,
    p_endpoint VARCHAR,
    p_duracion INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO metricas (servicio, metodo, endpoint, total_requests, total_duracion)
    VALUES (p_servicio, p_metodo, p_endpoint, 1, p_duracion)
    ON CONFLICT (servicio, metodo, endpoint)
    DO UPDATE SET
        total_requests = metricas.total_requests + 1,
        total_duracion = metricas.total_duracion + p_duracion;
END;
$$ LANGUAGE plpgsql;
