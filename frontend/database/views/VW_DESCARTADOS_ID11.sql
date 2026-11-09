IF OBJECT_ID(N'ind.VW_DESCARTADOS_ID11', N'V') IS NULL
    EXEC(N'CREATE VIEW ind.VW_DESCARTADOS_ID11 AS SELECT CAST(NULL AS VARCHAR(50)) AS DNI_Paciente');
GO

ALTER VIEW ind.VW_DESCARTADOS_ID11 AS
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
CTE_MaestroPersonal AS (
    SELECT
        Id_Personal,
        Numero_Documento,
        NULLIF(LTRIM(RTRIM(CONCAT(
            ISNULL(Nombres_Personal, ''),
            ' ',
            ISNULL(Apellido_Paterno_Personal, ''),
            ' ',
            ISNULL(Apellido_Materno_Personal, '')
        ))), '') AS Nombre_Obstetra
    FROM (
        SELECT
            LTRIM(RTRIM(Id_Personal)) AS Id_Personal,
            LTRIM(RTRIM(Numero_Documento)) AS Numero_Documento,
            Nombres_Personal,
            Apellido_Paterno_Personal,
            Apellido_Materno_Personal,
            ROW_NUMBER() OVER (
                PARTITION BY LTRIM(RTRIM(Id_Personal))
                ORDER BY
                    CASE
                        WHEN NULLIF(LTRIM(RTRIM(CONCAT(
                            ISNULL(Nombres_Personal, ''),
                            ' ',
                            ISNULL(Apellido_Paterno_Personal, ''),
                            ' ',
                            ISNULL(Apellido_Materno_Personal, '')
                        ))), '') IS NULL THEN 1
                        ELSE 0
                    END,
                    CASE WHEN Fecha_Baja IS NULL OR LTRIM(RTRIM(Fecha_Baja)) = '' THEN 0 ELSE 1 END,
                    I_ANIO DESC,
                    I_MES DESC
            ) AS rn
        FROM stg.his_maestro_personal
        WHERE NULLIF(LTRIM(RTRIM(Id_Personal)), '') IS NOT NULL
    ) personal
    WHERE rn = 1
),
CTE_Gestantes AS (
    SELECT DISTINCT
        TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        I_ANIO,
        I_MES
    FROM stg.his_trama
    WHERE (
            Codigo_Item IN ('Z349','Z3491','Z3492','Z3493','Z359','Z3591','Z3592','Z3593')
            OR Valor_Lab = 'G'
          )
      AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
),
CTE_Consejeria AS (
    SELECT DISTINCT
        TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        I_ANIO,
        I_MES
    FROM stg.his_trama
    WHERE Codigo_Item IN ('99402.04', '99402.07', 'Z3002')
      AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
),
CTE_TA AS (
    SELECT
        TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        I_ANIO,
        I_MES,
        MAX(Id_Personal) AS Codigo_Obstetra,
        MAX(CAST(Fecha_Atencion AS DATE)) AS Fecha_Atencion,
        MAX(Edad_Reg) AS Edad_Reg,
        MAX(Tipo_Edad) AS Tipo_Edad
    FROM stg.his_trama
    WHERE Codigo_Item = '99208'
      AND Valor_Lab = 'TA'
      AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
    GROUP BY TRY_CAST(Id_Paciente AS BIGINT), I_ANIO, I_MES
),
CTE_OC_Edad_Fuera_Rango AS (
    SELECT
        TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key,
        I_ANIO,
        I_MES,
        MAX(Id_Personal) AS Codigo_Obstetra,
        MAX(CAST(Fecha_Atencion AS DATE)) AS Fecha_Atencion,
        MAX(Edad_Reg) AS Edad_Reg,
        MAX(Tipo_Edad) AS Tipo_Edad
    FROM stg.his_trama
    WHERE Codigo_Item IN ('99402.04', '99402.07', 'Z3002')
      AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
      AND (
            Tipo_Edad <> 'A'
            OR TRY_CAST(Edad_Reg AS INT) < 15
            OR TRY_CAST(Edad_Reg AS INT) > 49
          )
    GROUP BY TRY_CAST(Id_Paciente AS BIGINT), I_ANIO, I_MES
),
CTE_Descartes_TA AS (
    SELECT
        ta.Id_Paciente_Key,
        COALESCE(mp.Numero_Documento, CAST(ta.Id_Paciente_Key AS VARCHAR(50))) AS DNI_Paciente,
        ISNULL(LTRIM(RTRIM(CONCAT(
            ISNULL(mp.Nombres_Paciente, ''),
            ' ',
            ISNULL(mp.Apellido_Paterno_Paciente, ''),
            ' ',
            ISNULL(mp.Apellido_Materno_Paciente, '')
        ))), 'NO REGISTRADO') AS Nombre_Paciente,
        ISNULL(mp.Genero, 'U') AS Sexo,
        ISNULL(DATEDIFF(YEAR, CAST(mp.Fecha_Nacimiento AS DATE), GETDATE()), TRY_CAST(ta.Edad_Reg AS INT)) AS Edad,
        ta.Codigo_Obstetra,
        COALESCE(mpers.Nombre_Obstetra, CAST(ta.Codigo_Obstetra AS NVARCHAR(300))) AS Nombre_Obstetra,
        ta.Fecha_Atencion,
        ta.I_MES,
        ta.I_ANIO,
        CASE
            WHEN g.Id_Paciente_Key IS NOT NULL THEN 'Gestante'
            WHEN ta.Tipo_Edad <> 'A' OR TRY_CAST(ta.Edad_Reg AS INT) NOT BETWEEN 15 AND 49 THEN 'Edad fuera de rango'
            WHEN c.Id_Paciente_Key IS NULL THEN 'Falta Consejeria'
            ELSE 'Falta Metodo o Trama Invalida'
        END AS Motivo_Descarte
    FROM CTE_TA ta
    LEFT JOIN CTE_MaestroPaciente mp
      ON ta.Id_Paciente_Key = mp.Id_Paciente_Key
    LEFT JOIN CTE_MaestroPersonal mpers
      ON LTRIM(RTRIM(CAST(ta.Codigo_Obstetra AS VARCHAR(50)))) = mpers.Id_Personal
    LEFT JOIN ind.VW_NOMINAL_ID11 n
      ON COALESCE(mp.Numero_Documento, CAST(ta.Id_Paciente_Key AS VARCHAR(50))) = n.DNI_Paciente
     AND ta.I_MES = n.I_MES
     AND ta.I_ANIO = n.I_ANIO
    LEFT JOIN CTE_Gestantes g
      ON ta.Id_Paciente_Key = g.Id_Paciente_Key
     AND ta.I_MES = g.I_MES
     AND ta.I_ANIO = g.I_ANIO
    LEFT JOIN CTE_Consejeria c
      ON ta.Id_Paciente_Key = c.Id_Paciente_Key
     AND ta.I_MES = c.I_MES
     AND ta.I_ANIO = c.I_ANIO
    WHERE n.DNI_Paciente IS NULL
),
CTE_Descartes_OC_Edad AS (
    SELECT
        oc.Id_Paciente_Key,
        COALESCE(mp.Numero_Documento, CAST(oc.Id_Paciente_Key AS VARCHAR(50))) AS DNI_Paciente,
        ISNULL(LTRIM(RTRIM(CONCAT(
            ISNULL(mp.Nombres_Paciente, ''),
            ' ',
            ISNULL(mp.Apellido_Paterno_Paciente, ''),
            ' ',
            ISNULL(mp.Apellido_Materno_Paciente, '')
        ))), 'NO REGISTRADO') AS Nombre_Paciente,
        ISNULL(mp.Genero, 'U') AS Sexo,
        ISNULL(DATEDIFF(YEAR, CAST(mp.Fecha_Nacimiento AS DATE), GETDATE()), TRY_CAST(oc.Edad_Reg AS INT)) AS Edad,
        oc.Codigo_Obstetra,
        COALESCE(mpers.Nombre_Obstetra, CAST(oc.Codigo_Obstetra AS NVARCHAR(300))) AS Nombre_Obstetra,
        oc.Fecha_Atencion,
        oc.I_MES,
        oc.I_ANIO,
        'Edad fuera de rango' AS Motivo_Descarte
    FROM CTE_OC_Edad_Fuera_Rango oc
    LEFT JOIN CTE_MaestroPaciente mp
      ON oc.Id_Paciente_Key = mp.Id_Paciente_Key
    LEFT JOIN CTE_MaestroPersonal mpers
      ON LTRIM(RTRIM(CAST(oc.Codigo_Obstetra AS VARCHAR(50)))) = mpers.Id_Personal
    LEFT JOIN ind.VW_NOMINAL_ID11 n
      ON COALESCE(mp.Numero_Documento, CAST(oc.Id_Paciente_Key AS VARCHAR(50))) = n.DNI_Paciente
     AND oc.I_MES = n.I_MES
     AND oc.I_ANIO = n.I_ANIO
    WHERE n.DNI_Paciente IS NULL
      AND NOT EXISTS (
            SELECT 1
            FROM CTE_Descartes_TA ta
            WHERE ta.Id_Paciente_Key = oc.Id_Paciente_Key
              AND ta.I_MES = oc.I_MES
              AND ta.I_ANIO = oc.I_ANIO
          )
)
SELECT
    DNI_Paciente,
    Nombre_Paciente,
    Sexo,
    Edad,
    Codigo_Obstetra,
    Nombre_Obstetra,
    Fecha_Atencion,
    I_MES,
    I_ANIO,
    Motivo_Descarte
FROM CTE_Descartes_TA
UNION ALL
SELECT
    DNI_Paciente,
    Nombre_Paciente,
    Sexo,
    Edad,
    Codigo_Obstetra,
    Nombre_Obstetra,
    Fecha_Atencion,
    I_MES,
    I_ANIO,
    Motivo_Descarte
FROM CTE_Descartes_OC_Edad;
