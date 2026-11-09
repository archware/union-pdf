IF OBJECT_ID(N'ind.VW_NOMINAL_ID11', N'V') IS NULL
    EXEC(N'CREATE VIEW ind.VW_NOMINAL_ID11 AS SELECT CAST(NULL AS VARCHAR(50)) AS DNI_Paciente');
GO

ALTER VIEW ind.VW_NOMINAL_ID11 AS
WITH CTE_MaestroPaciente AS (
    SELECT
        Id_Paciente_Key,
        Numero_Documento,
        Nombres_Paciente,
        Apellido_Paterno_Paciente,
        Apellido_Materno_Paciente,
        Genero,
        Fecha_Nacimiento
    FROM (
        SELECT
            TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key,
            Numero_Documento,
            Nombres_Paciente,
            Apellido_Paterno_Paciente,
            Apellido_Materno_Paciente,
            Genero,
            Fecha_Nacimiento,
            ROW_NUMBER() OVER (
                PARTITION BY TRY_CAST(Id_Paciente AS BIGINT)
                ORDER BY
                    CASE WHEN Numero_Documento IS NULL OR LTRIM(RTRIM(Numero_Documento)) = '' THEN 1 ELSE 0 END,
                    Id_Paciente
            ) AS rn
        FROM stg.his_maestro_paciente
        WHERE TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
    ) mp
    WHERE rn = 1
),
CTE_Gestantes_Excluidas AS (
    SELECT DISTINCT
        TRY_CAST(h.Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        h.I_ANIO
    FROM stg.his_trama h
    JOIN stg.his_trama g
      ON TRY_CAST(h.Id_Paciente AS BIGINT) = TRY_CAST(g.Id_Paciente AS BIGINT)
     AND h.I_ANIO = g.I_ANIO
    WHERE h.Codigo_Item IN ('99402.04', '99402.07', 'Z3002')
      AND (g.Codigo_Item IN ('Z349','Z3491','Z3492','Z3493','Z359','Z3591','Z3592','Z3593') OR g.Valor_Lab = 'G')
      AND CAST(g.Fecha_Atencion AS DATE) >= CAST(h.Fecha_Atencion AS DATE)
      AND TRY_CAST(h.Id_Paciente AS BIGINT) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM stg.his_trama p
        WHERE TRY_CAST(p.Id_Paciente AS BIGINT) = TRY_CAST(g.Id_Paciente AS BIGINT)
          AND p.I_ANIO = g.I_ANIO
          AND (
            p.Codigo_Item IN ('Z391','Z392','Z390','59515','59410','59430')
            OR p.Codigo_Item LIKE 'O80%'
            OR p.Codigo_Item LIKE 'O81%'
            OR p.Codigo_Item LIKE 'O82%'
            OR p.Codigo_Item LIKE 'O83%'
            OR p.Codigo_Item LIKE 'O84%'
          )
          AND CAST(p.Fecha_Atencion AS DATE) >= CAST(g.Fecha_Atencion AS DATE)
      )
),
CTE_PlanificacionTA AS (
    SELECT
        TRY_CAST(h.Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        h.Id_Cita,
        h.Id_Personal AS Codigo_Obstetra,
        CAST(h.Fecha_Atencion AS DATE) AS Fecha_Atencion,
        h.I_MES,
        h.I_ANIO,
        ROW_NUMBER() OVER (
            PARTITION BY TRY_CAST(h.Id_Paciente AS BIGINT), h.I_ANIO, h.I_MES
            ORDER BY CAST(h.Fecha_Atencion AS DATE) DESC, h.Id_Cita DESC
        ) AS rn_ta
    FROM stg.his_trama h
    LEFT JOIN CTE_Gestantes_Excluidas g
      ON TRY_CAST(h.Id_Paciente AS BIGINT) = g.Id_Paciente_Key
     AND h.I_ANIO = g.I_ANIO
    WHERE (
            (
                h.Codigo_Item IN ('99402.04', '99402.07', 'Z3002')
                AND h.Tipo_Edad = 'A'
                AND TRY_CAST(h.Edad_Reg AS INT) BETWEEN 15 AND 49
            )
            OR (h.Codigo_Item = '55250' AND h.Tipo_Diagnostico IN ('D', 'R'))
          )
      AND TRY_CAST(h.Id_Paciente AS BIGINT) IS NOT NULL
      AND g.Id_Paciente_Key IS NULL
),
CTE_EventosMetodo AS (
    SELECT DISTINCT
        TRY_CAST(h.Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        h.Id_Cita,
        h.Codigo_Item AS Codigo_Metodo,
        h.Tipo_Diagnostico AS Condicion_Dosis,
        h.Valor_Lab,
        CAST(h.Fecha_Atencion AS DATE) AS Fecha_Ultima_Dosis,
        h.I_MES,
        h.I_ANIO,
        CASE
            WHEN h.Codigo_Item IN ('58600', '58605', '58611', '55250') THEN 1
            WHEN h.Codigo_Item IN ('58300', '58300.01', '11975') THEN 2
            ELSE 3
        END AS I_PRIORIDAD_METODO
    FROM stg.his_trama h
    WHERE h.Codigo_Item IN ('58300', '58300.01', '99208.13', '99208.04', '99208.05', '11975', '99208.02', '99208.06', '58600', '58605', '58611', '55250')
      AND h.Tipo_Diagnostico IN ('D', 'R')
      AND TRY_CAST(h.Id_Paciente AS BIGINT) IS NOT NULL
),
CTE_MetodoSeleccionado AS (
    SELECT
        ta.Id_Paciente_Key,
        ta.Id_Cita,
        ta.Codigo_Obstetra,
        ta.Fecha_Atencion,
        ta.I_MES,
        ta.I_ANIO,
        m.Codigo_Metodo,
        m.Condicion_Dosis,
        m.Valor_Lab,
        m.Fecha_Ultima_Dosis,
        ROW_NUMBER() OVER (
            PARTITION BY ta.Id_Paciente_Key, ta.I_ANIO, ta.I_MES
            ORDER BY
                CASE WHEN m.Id_Cita = ta.Id_Cita THEN 0 ELSE 1 END,
                m.I_PRIORIDAD_METODO ASC,
                m.Fecha_Ultima_Dosis DESC,
                m.Id_Cita DESC,
                m.Codigo_Metodo ASC,
                m.Condicion_Dosis ASC,
                ISNULL(m.Valor_Lab, '') ASC
        ) AS rn_m
    FROM CTE_PlanificacionTA ta
    LEFT JOIN CTE_EventosMetodo m
      ON ta.Id_Paciente_Key = m.Id_Paciente_Key
     AND (
            m.Id_Cita = ta.Id_Cita
            OR (
                m.I_ANIO = ta.I_ANIO
                AND m.Fecha_Ultima_Dosis <= EOMONTH(ta.Fecha_Atencion)
            )
         )
    WHERE ta.rn_ta = 1
),
CTE_Base AS (
    SELECT
        ms.Id_Paciente_Key,
        ms.Id_Cita,
        ms.Codigo_Obstetra,
        ms.Fecha_Atencion,
        ms.I_MES,
        ms.I_ANIO,
        ms.Codigo_Metodo,
        ms.Condicion_Dosis,
        ms.Valor_Lab,
        ms.Fecha_Ultima_Dosis
    FROM CTE_MetodoSeleccionado ms
    WHERE ms.rn_m = 1
)
SELECT
    COALESCE(mp.Numero_Documento, CAST(b.Id_Paciente_Key AS VARCHAR(50))) AS DNI_Paciente,
    LTRIM(RTRIM(CONCAT(
        ISNULL(mp.Nombres_Paciente, ''),
        ' ',
        ISNULL(mp.Apellido_Paterno_Paciente, ''),
        ' ',
        ISNULL(mp.Apellido_Materno_Paciente, '')
    ))) AS Nombre_Paciente,
    mp.Genero AS Sexo,
    DATEDIFF(YEAR, CAST(mp.Fecha_Nacimiento AS DATE), GETDATE()) AS Edad,
    b.Codigo_Metodo,
    metodo.Metodo_Administrado,
    b.Condicion_Dosis,
    COALESCE(fi.Fecha_Inicio, b.Fecha_Ultima_Dosis, b.Fecha_Atencion) AS Fecha_Inicio,
    COALESCE(b.Fecha_Ultima_Dosis, b.Fecha_Atencion) AS Fecha_Ultima_Dosis,
    CASE
        WHEN metodo.I_DIAS_PROXIMA_CITA IS NULL OR b.Fecha_Ultima_Dosis IS NULL THEN NULL
        ELSE DATEADD(DAY, metodo.I_DIAS_PROXIMA_CITA, b.Fecha_Ultima_Dosis)
    END AS Fecha_Proxima_Cita,
    CASE
        WHEN b.Codigo_Metodo IN ('55250', '58600', '58605', '58611') THEN 'Finalizado / Permanente'
        WHEN b.Codigo_Metodo IS NULL THEN 'Sin método registrado'
        WHEN DATEADD(DAY, ISNULL(metodo.I_DIAS_PROXIMA_CITA, 90), b.Fecha_Ultima_Dosis) >= GETDATE() THEN 'Protegido'
        WHEN DATEADD(DAY, ISNULL(metodo.I_DIAS_PROXIMA_CITA, 90), b.Fecha_Ultima_Dosis) BETWEEN DATEADD(DAY, -5, GETDATE()) AND GETDATE() THEN 'Por Continuar (Alerta)'
        ELSE 'Abandono / Vencido'
    END AS Estado_Continuidad,
    b.Codigo_Obstetra,
    b.I_MES,
    b.I_ANIO,
    'Sin teléfono' AS Telefono,
    metodo.Meta_Anual,
    entregas.Total_Entregas AS Entregas_Anuales,
    CASE
        WHEN metodo.Meta_Anual - entregas.Total_Entregas > 0 THEN metodo.Meta_Anual - entregas.Total_Entregas
        ELSE 0
    END AS Faltante_TA,
    CASE
        WHEN metodo.Meta_Anual = 0 THEN 'Sin meta TA'
        WHEN entregas.Total_Entregas >= metodo.Meta_Anual THEN 'Cumplió TA'
        ELSE 'Faltan ' + CAST(metodo.Meta_Anual - entregas.Total_Entregas AS VARCHAR(10))
    END AS Estado_TA,
    ISNULL(TRY_CAST(b.Valor_Lab AS INT), 1) AS Valor_Lab_Num
FROM CTE_Base b
LEFT JOIN CTE_MaestroPaciente mp
  ON b.Id_Paciente_Key = mp.Id_Paciente_Key
OUTER APPLY (
    SELECT
        CASE
            WHEN b.Codigo_Metodo = '99208.04' THEN 'Ampolla Mensual'
            WHEN b.Codigo_Metodo = '99208.05' THEN 'Ampolla Trimestral'
            WHEN b.Codigo_Metodo IN ('58300', '58300.01') THEN 'DIU / SIU'
            WHEN b.Codigo_Metodo = '11975' THEN 'Implante'
            WHEN b.Codigo_Metodo = '99208.02' THEN 'Preservativo Masculino'
            WHEN b.Codigo_Metodo = '99208.06' THEN 'Preservativo Femenino'
            WHEN b.Codigo_Metodo IN ('58600', '58605', '58611') THEN 'Ligadura de Trompas (AQV)'
            WHEN b.Codigo_Metodo = '55250' THEN 'Vasectomía (AQV)'
            WHEN b.Codigo_Metodo = '99208.13' THEN 'Oral Combinado'
            ELSE 'Consejería'
        END AS Metodo_Administrado,
        CASE
            WHEN b.Codigo_Metodo = '99208.04' THEN 12
            WHEN b.Codigo_Metodo IN ('99208.05', '99208.13', '99208.02', '99208.06') THEN 4
            WHEN b.Codigo_Metodo IN ('58300', '58300.01', '11975', '58600', '58605', '58611', '55250') THEN 1
            ELSE 0
        END AS Meta_Anual,
        CASE
            WHEN b.Codigo_Metodo = '99208.04' THEN 30
            WHEN b.Codigo_Metodo IN ('99208.05', '99208.02', '99208.06') THEN 90
            ELSE NULL
        END AS I_DIAS_PROXIMA_CITA
) metodo
OUTER APPLY (
    SELECT MIN(e.Fecha_Ultima_Dosis) AS Fecha_Inicio
    FROM CTE_EventosMetodo e
    WHERE e.Id_Paciente_Key = b.Id_Paciente_Key
      AND e.Codigo_Metodo = b.Codigo_Metodo
      AND e.I_ANIO = b.I_ANIO
) fi
OUTER APPLY (
    SELECT COUNT(DISTINCT e.Id_Cita) AS Total_Entregas_Raw
    FROM CTE_EventosMetodo e
    WHERE e.Id_Paciente_Key = b.Id_Paciente_Key
      AND e.Codigo_Metodo = b.Codigo_Metodo
      AND e.I_ANIO = b.I_ANIO
      AND e.Fecha_Ultima_Dosis <= EOMONTH(b.Fecha_Atencion)
) ea
OUTER APPLY (
    SELECT
        CASE
            WHEN b.Codigo_Metodo IN ('58300', '58300.01', '11975', '58600', '58605', '58611', '55250')
                 AND ISNULL(ea.Total_Entregas_Raw, 0) > 0 THEN 1
            WHEN b.Codigo_Metodo IN ('58300', '58300.01', '11975', '58600', '58605', '58611', '55250') THEN 0
            ELSE ISNULL(ea.Total_Entregas_Raw, 0)
        END AS Total_Entregas
) entregas;
