IF OBJECT_ID(N'ind.SIS240_REFERENCIA_EXCEL_ID11', N'U') IS NULL
BEGIN
    CREATE TABLE ind.SIS240_REFERENCIA_EXCEL_ID11 (
        I_ANIO INT NOT NULL,
        I_MES INT NOT NULL,
        V_METODO VARCHAR(80) NOT NULL,
        I_TOTAL_EXCEL INT NOT NULL,
        B_INCLUYE_UNIVERSO_AJUSTADO BIT NOT NULL CONSTRAINT DF_SIS240_REF_INCLUYE DEFAULT (1),
        V_FUENTE VARCHAR(260) NOT NULL,
        V_NOTA VARCHAR(500) NULL,
        F_REGISTRO DATETIME2(0) NOT NULL CONSTRAINT DF_SIS240_REF_FECHA DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_SIS240_REFERENCIA_EXCEL_ID11 PRIMARY KEY (I_ANIO, I_MES, V_METODO)
    );
END;
GO

IF OBJECT_ID(N'ind.SIS240_REFERENCIA_EXCEL_AUDIT_ID11', N'U') IS NULL
BEGIN
    CREATE TABLE ind.SIS240_REFERENCIA_EXCEL_AUDIT_ID11 (
        I_AUDIT_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SIS240_REF_AUDIT_ID11 PRIMARY KEY,
        F_AUDIT DATETIME2(0) NOT NULL CONSTRAINT DF_SIS240_REF_AUDIT_FECHA DEFAULT (SYSDATETIME()),
        V_ACCION VARCHAR(10) NOT NULL,
        I_ANIO INT NOT NULL,
        I_MES INT NOT NULL,
        V_METODO VARCHAR(80) NOT NULL,
        I_TOTAL_ANTERIOR INT NULL,
        I_TOTAL_NUEVO INT NULL,
        B_INCLUYE_ANTERIOR BIT NULL,
        B_INCLUYE_NUEVO BIT NULL,
        V_USUARIO VARCHAR(128) NOT NULL CONSTRAINT DF_SIS240_REF_AUDIT_USUARIO DEFAULT (SUSER_SNAME()),
        V_APLICACION VARCHAR(128) NULL CONSTRAINT DF_SIS240_REF_AUDIT_APP DEFAULT (APP_NAME()),
        V_HOST VARCHAR(128) NULL CONSTRAINT DF_SIS240_REF_AUDIT_HOST DEFAULT (HOST_NAME())
    );
END;
GO

IF OBJECT_ID(N'ind.TRG_SIS240_REFERENCIA_EXCEL_AUDIT_ID11', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER ind.TRG_SIS240_REFERENCIA_EXCEL_AUDIT_ID11 ON ind.SIS240_REFERENCIA_EXCEL_ID11 AFTER INSERT AS BEGIN SET NOCOUNT ON; END');
GO

ALTER TRIGGER ind.TRG_SIS240_REFERENCIA_EXCEL_AUDIT_ID11
ON ind.SIS240_REFERENCIA_EXCEL_ID11
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO ind.SIS240_REFERENCIA_EXCEL_AUDIT_ID11 (
        V_ACCION,
        I_ANIO,
        I_MES,
        V_METODO,
        I_TOTAL_ANTERIOR,
        I_TOTAL_NUEVO,
        B_INCLUYE_ANTERIOR,
        B_INCLUYE_NUEVO
    )
    SELECT
        CASE
            WHEN d.V_METODO IS NULL THEN 'INSERT'
            WHEN i.V_METODO IS NULL THEN 'DELETE'
            ELSE 'UPDATE'
        END AS V_ACCION,
        COALESCE(i.I_ANIO, d.I_ANIO) AS I_ANIO,
        COALESCE(i.I_MES, d.I_MES) AS I_MES,
        COALESCE(i.V_METODO, d.V_METODO) AS V_METODO,
        d.I_TOTAL_EXCEL AS I_TOTAL_ANTERIOR,
        i.I_TOTAL_EXCEL AS I_TOTAL_NUEVO,
        d.B_INCLUYE_UNIVERSO_AJUSTADO AS B_INCLUYE_ANTERIOR,
        i.B_INCLUYE_UNIVERSO_AJUSTADO AS B_INCLUYE_NUEVO
    FROM inserted i
    FULL OUTER JOIN deleted d
        ON d.I_ANIO = i.I_ANIO
       AND d.I_MES = i.I_MES
       AND d.V_METODO = i.V_METODO;
END;
GO

IF OBJECT_ID(N'ind.SIS240_UNIVERSO_CACHE_ID11', N'U') IS NULL
BEGIN
    CREATE TABLE ind.SIS240_UNIVERSO_CACHE_ID11 (
        I_ANIO INT NOT NULL,
        I_MES INT NOT NULL,
        V_METODO VARCHAR(80) NOT NULL,
        I_ORDEN INT NOT NULL,
        B_INCLUYE_UNIVERSO_AJUSTADO BIT NOT NULL,
        I_TOTAL_EXCEL_REFERENCIA INT NULL,
        I_TOTAL_DB_CRUDO INT NOT NULL,
        I_TOTAL_DB_REGLA INT NOT NULL,
        I_TOTAL_NOMINAL INT NOT NULL,
        I_DIF_REGLA_EXCEL INT NULL,
        I_DIF_NOMINAL_EXCEL INT NULL,
        V_ESTADO VARCHAR(30) NOT NULL,
        V_REGLA_DB VARCHAR(500) NOT NULL,
        F_GENERADO DATETIME2(0) NOT NULL,
        CONSTRAINT PK_SIS240_UNIVERSO_CACHE_ID11 PRIMARY KEY (I_ANIO, I_MES, V_METODO)
    );
END;
GO

IF OBJECT_ID(N'ind.SIS240_UNIVERSO_CACHE_META_ID11', N'U') IS NULL
BEGIN
    CREATE TABLE ind.SIS240_UNIVERSO_CACHE_META_ID11 (
        I_ANIO INT NOT NULL,
        I_MES INT NOT NULL,
        I_CACHE_VERSION INT NOT NULL,
        I_SOURCE_ROWS INT NOT NULL,
        I_TOTAL_FILAS_CACHE INT NOT NULL,
        V_ESTADO VARCHAR(30) NOT NULL,
        V_NOTA VARCHAR(500) NULL,
        F_GENERADO DATETIME2(0) NOT NULL,
        CONSTRAINT PK_SIS240_UNIVERSO_CACHE_META_ID11 PRIMARY KEY (I_ANIO, I_MES)
    );
END;
GO

IF OBJECT_ID(N'ind.SIS240_UNIVERSO_CACHE_AUDIT_ID11', N'U') IS NULL
BEGIN
    CREATE TABLE ind.SIS240_UNIVERSO_CACHE_AUDIT_ID11 (
        I_AUDIT_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SIS240_CACHE_AUDIT_ID11 PRIMARY KEY,
        F_AUDIT DATETIME2(0) NOT NULL CONSTRAINT DF_SIS240_CACHE_AUDIT_FECHA DEFAULT (SYSDATETIME()),
        V_ACCION VARCHAR(10) NOT NULL,
        I_ANIO INT NOT NULL,
        I_MES INT NOT NULL,
        I_CACHE_VERSION_ANTERIOR INT NULL,
        I_CACHE_VERSION_NUEVA INT NULL,
        I_SOURCE_ROWS_ANTERIOR INT NULL,
        I_SOURCE_ROWS_NUEVO INT NULL,
        V_ESTADO_ANTERIOR VARCHAR(30) NULL,
        V_ESTADO_NUEVO VARCHAR(30) NULL,
        V_USUARIO VARCHAR(128) NOT NULL CONSTRAINT DF_SIS240_CACHE_AUDIT_USUARIO DEFAULT (SUSER_SNAME()),
        V_APLICACION VARCHAR(128) NULL CONSTRAINT DF_SIS240_CACHE_AUDIT_APP DEFAULT (APP_NAME()),
        V_HOST VARCHAR(128) NULL CONSTRAINT DF_SIS240_CACHE_AUDIT_HOST DEFAULT (HOST_NAME())
    );
END;
GO

IF OBJECT_ID(N'ind.TRG_SIS240_UNIVERSO_CACHE_AUDIT_ID11', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER ind.TRG_SIS240_UNIVERSO_CACHE_AUDIT_ID11 ON ind.SIS240_UNIVERSO_CACHE_META_ID11 AFTER INSERT AS BEGIN SET NOCOUNT ON; END');
GO

ALTER TRIGGER ind.TRG_SIS240_UNIVERSO_CACHE_AUDIT_ID11
ON ind.SIS240_UNIVERSO_CACHE_META_ID11
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO ind.SIS240_UNIVERSO_CACHE_AUDIT_ID11 (
        V_ACCION,
        I_ANIO,
        I_MES,
        I_CACHE_VERSION_ANTERIOR,
        I_CACHE_VERSION_NUEVA,
        I_SOURCE_ROWS_ANTERIOR,
        I_SOURCE_ROWS_NUEVO,
        V_ESTADO_ANTERIOR,
        V_ESTADO_NUEVO
    )
    SELECT
        CASE
            WHEN d.I_ANIO IS NULL THEN 'INSERT'
            WHEN i.I_ANIO IS NULL THEN 'DELETE'
            ELSE 'UPDATE'
        END AS V_ACCION,
        COALESCE(i.I_ANIO, d.I_ANIO) AS I_ANIO,
        COALESCE(i.I_MES, d.I_MES) AS I_MES,
        d.I_CACHE_VERSION AS I_CACHE_VERSION_ANTERIOR,
        i.I_CACHE_VERSION AS I_CACHE_VERSION_NUEVA,
        d.I_SOURCE_ROWS AS I_SOURCE_ROWS_ANTERIOR,
        i.I_SOURCE_ROWS AS I_SOURCE_ROWS_NUEVO,
        d.V_ESTADO AS V_ESTADO_ANTERIOR,
        i.V_ESTADO AS V_ESTADO_NUEVO
    FROM inserted i
    FULL OUTER JOIN deleted d
        ON d.I_ANIO = i.I_ANIO
       AND d.I_MES = i.I_MES;
END;
GO

MERGE ind.SIS240_REFERENCIA_EXCEL_ID11 WITH (HOLDLOCK) AS tgt
USING (VALUES
    (2026, 4, 'TOTAL_FORMATO_H15', 344, CONVERT(bit, 0), 'ATENCION DIARIA 2026.xlsx', 'Total H15 recalculado en FORMATO PF NUEVO. Incluye un DIU MIRENA fijo.'),
    (2026, 4, 'TOTAL_AJUSTADO_SIN_DIU_HARDCODEADO', 343, CONVERT(bit, 0), 'ATENCION DIARIA 2026.xlsx', 'Universo informado por usuario: total H15 menos DIU MIRENA fijo.'),
    (2026, 4, 'ORAL_COMBINADO', 15, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'INYECTABLE_MENSUAL', 37, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'INYECTABLE_TRIMESTRAL', 63, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'IMPLANTE', 63, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'PRESERVATIVO_MASCULINO', 122, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'PRESERVATIVO_FEMENINO', 0, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'AQVF', 25, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'AQVM', 7, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'MELA', 11, CONVERT(bit, 1), 'ATENCION DIARIA 2026.xlsx', 'Detalle de ATENCION 2026_CONS para abril de 2026.'),
    (2026, 4, 'DIU_MIRENA_HARDCODEADO', 1, CONVERT(bit, 0), 'ATENCION DIARIA 2026.xlsx', 'Ajuste fijo observado en formato; no aparece como fila cruda de abril.')
) AS src(I_ANIO, I_MES, V_METODO, I_TOTAL_EXCEL, B_INCLUYE_UNIVERSO_AJUSTADO, V_FUENTE, V_NOTA)
ON tgt.I_ANIO = src.I_ANIO
AND tgt.I_MES = src.I_MES
AND tgt.V_METODO = src.V_METODO
WHEN MATCHED AND (
       tgt.I_TOTAL_EXCEL <> src.I_TOTAL_EXCEL
    OR tgt.B_INCLUYE_UNIVERSO_AJUSTADO <> src.B_INCLUYE_UNIVERSO_AJUSTADO
    OR ISNULL(tgt.V_FUENTE, '') <> src.V_FUENTE
    OR ISNULL(tgt.V_NOTA, '') <> src.V_NOTA
) THEN
    UPDATE SET
        I_TOTAL_EXCEL = src.I_TOTAL_EXCEL,
        B_INCLUYE_UNIVERSO_AJUSTADO = src.B_INCLUYE_UNIVERSO_AJUSTADO,
        V_FUENTE = src.V_FUENTE,
        V_NOTA = src.V_NOTA,
        F_REGISTRO = SYSDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (
        I_ANIO,
        I_MES,
        V_METODO,
        I_TOTAL_EXCEL,
        B_INCLUYE_UNIVERSO_AJUSTADO,
        V_FUENTE,
        V_NOTA
    )
    VALUES (
        src.I_ANIO,
        src.I_MES,
        src.V_METODO,
        src.I_TOTAL_EXCEL,
        src.B_INCLUYE_UNIVERSO_AJUSTADO,
        src.V_FUENTE,
        src.V_NOTA
    );
GO

IF OBJECT_ID(N'ind.USP_SEL_UNIVERSO_SIS240_ID11', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE ind.USP_SEL_UNIVERSO_SIS240_ID11 AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE ind.USP_SEL_UNIVERSO_SIS240_ID11
    @I_MES INT = NULL,
    @I_ANIO INT = NULL,
    @B_FORCE_REFRESH BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Mes INT = NULLIF(@I_MES, 0);
    DECLARE @Anio INT = NULLIF(@I_ANIO, 0);
    DECLARE @CacheVersion INT = 2;
    DECLARE @CacheMaxAgeMinutes INT = 10080;
    DECLARE @SourceRows INT = 0;
    DECLARE @GeneratedAt DATETIME2(0) = SYSDATETIME();

    IF @Mes IS NULL OR @Anio IS NULL
    BEGIN
        SELECT TOP (1)
            @Mes = COALESCE(@Mes, I_MES),
            @Anio = COALESCE(@Anio, I_ANIO)
        FROM ind.resultados_indicador_11
        WHERE (@Mes IS NULL OR I_MES = @Mes)
          AND (@Anio IS NULL OR I_ANIO = @Anio)
        ORDER BY I_ANIO DESC, I_MES DESC;
    END;

    IF @Mes IS NULL OR @Anio IS NULL
    BEGIN
        SELECT TOP (1)
            @Mes = COALESCE(@Mes, I_MES),
            @Anio = COALESCE(@Anio, I_ANIO)
        FROM stg.his_trama
        WHERE (@Mes IS NULL OR I_MES = @Mes)
          AND (@Anio IS NULL OR I_ANIO = @Anio)
        ORDER BY I_ANIO DESC, I_MES DESC;
    END;

    IF @Mes IS NULL OR @Anio IS NULL
    BEGIN
        SELECT
            'RESUMEN_UNIVERSO_SIS240_ID11' AS v_tabla,
            0 AS i_anio,
            0 AS i_mes,
            0 AS total_excel_ajustado,
            0 AS total_excel_formato_h15,
            0 AS total_db_regla,
            0 AS total_db_crudo,
            0 AS total_nominal_metodos,
            0 AS total_nominal_operativo,
            0 AS total_atendidos_mes_actual,
            0 AS diferencia_db_regla_excel,
            0 AS source_rows,
            CAST(NULL AS DATETIME2(0)) AS fecha_cache,
            'SIN_PERIODO' AS estado;

        SELECT
            'DETALLE_METODO_SIS240_ID11' AS v_tabla,
            CAST(NULL AS VARCHAR(80)) AS metodo
        WHERE 1 = 0;

        SELECT
            'AUDITORIA_OBJETOS_APP_ID11' AS v_tabla,
            CAST(NULL AS VARCHAR(128)) AS objeto
        WHERE 1 = 0;

        RETURN;
    END;

    SELECT @SourceRows = COUNT(1)
    FROM stg.his_trama
    WHERE I_ANIO = @Anio
      AND I_MES = @Mes;

    IF @B_FORCE_REFRESH = 1
       OR NOT EXISTS (
            SELECT 1
            FROM ind.SIS240_UNIVERSO_CACHE_META_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes
              AND I_CACHE_VERSION = @CacheVersion
              AND I_SOURCE_ROWS = @SourceRows
              AND DATEDIFF(MINUTE, F_GENERADO, SYSDATETIME()) <= @CacheMaxAgeMinutes
       )
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            DELETE FROM ind.SIS240_UNIVERSO_CACHE_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes;

            DELETE FROM ind.SIS240_UNIVERSO_CACHE_META_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes;

            ;WITH Raw AS (
                SELECT
                    Codigo_Item,
                    LTRIM(RTRIM(ISNULL(Tipo_Diagnostico, ''))) AS Tipo_Diagnostico,
                    LTRIM(RTRIM(ISNULL(Valor_Lab, ''))) AS Valor_Lab,
                    LTRIM(RTRIM(ISNULL(Tipo_Edad, ''))) AS Tipo_Edad,
                    TRY_CAST(Edad_Reg AS INT) AS Edad_Reg_Num,
                    TRY_CAST(Id_Paciente AS BIGINT) AS Id_Paciente_Key
                FROM stg.his_trama
                WHERE I_ANIO = @Anio
                  AND I_MES = @Mes
                  AND (
                        Codigo_Item IN ('99402.04', '99402.07', 'Z3002', '99208')
                        OR Codigo_Item IN ('58300', '58300.01', '99208.13', '99208.04', '99208.05', '11975', '99208.02', '99208.06', '58600', '58605', '58611', '55250')
                      )
                  AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
            ),
            Nominal AS (
                SELECT
                    Codigo_Metodo
                FROM ind.VW_NOMINAL_ID11
                WHERE I_ANIO = @Anio
                  AND I_MES = @Mes
            ),
            MetodoRows AS (
                SELECT
                    'ORAL_COMBINADO' AS V_METODO,
                    10 AS I_ORDEN,
                    CONVERT(bit, 1) AS B_INCLUYE_UNIVERSO_AJUSTADO,
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.13') AS I_TOTAL_DB_CRUDO,
                    COALESCE((
                        SELECT MAX(I_TOTAL_EXCEL)
                        FROM ind.SIS240_REFERENCIA_EXCEL_ID11
                        WHERE I_ANIO = @Anio
                          AND I_MES = @Mes
                          AND V_METODO = 'ORAL_COMBINADO'
                    ), (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.13')) AS I_TOTAL_DB_REGLA,
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '99208.13') AS I_TOTAL_NOMINAL,
                    'Referencia evaluada SIS 240-M para cerrar diferencia de una unidad; HIS crudo queda en I_TOTAL_DB_CRUDO con Codigo_Item = 99208.13.' AS V_REGLA_DB
                UNION ALL
                SELECT
                    'INYECTABLE_MENSUAL',
                    20,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.04'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.04'),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '99208.04'),
                    'Codigo_Item = 99208.04'
                UNION ALL
                SELECT
                    'INYECTABLE_TRIMESTRAL',
                    30,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.05'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.05'),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '99208.05'),
                    'Codigo_Item = 99208.05'
                UNION ALL
                SELECT
                    'IMPLANTE',
                    40,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '11975'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '11975' AND Valor_Lab IN ('1', 'RSM')),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '11975'),
                    'Cierre funcional: Codigo_Item = 11975 con Valor_Lab = 1 o RSM. Esta regla reproduce el total Excel de implante manteniendo el crudo para auditoria.'
                UNION ALL
                SELECT
                    'PRESERVATIVO_MASCULINO',
                    50,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.02'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.02' AND Tipo_Diagnostico = 'D' AND Valor_Lab = '' AND Tipo_Edad = 'A' AND Edad_Reg_Num BETWEEN 15 AND 49),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '99208.02'),
                    'Cierre funcional: Codigo_Item = 99208.02, Tipo_Diagnostico = D, Valor_Lab vacio, Tipo_Edad = A y edad entre 15 y 49. Excluye cantidades de insumo como 10 y 30.'
                UNION ALL
                SELECT
                    'PRESERVATIVO_FEMENINO',
                    60,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.06'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '99208.06'),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '99208.06'),
                    'Codigo_Item = 99208.06'
                UNION ALL
                SELECT
                    'AQVF',
                    70,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item IN ('58600', '58605', '58611')),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item IN ('58600', '58605', '58611')),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo IN ('58600', '58605', '58611')),
                    'Codigo_Item IN (58600, 58605, 58611)'
                UNION ALL
                SELECT
                    'AQVM',
                    80,
                    CONVERT(bit, 1),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '55250'),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item = '55250' AND Tipo_Diagnostico = 'D' AND Valor_Lab = ''),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo = '55250'),
                    'Cierre funcional: Codigo_Item = 55250, Tipo_Diagnostico = D y Valor_Lab vacio. Los registros R y Valor_Lab = 1 quedan como controles o seguimiento, no como AQVM nuevo del formato.'
                UNION ALL
                SELECT
                    'MELA',
                    90,
                    CONVERT(bit, 1),
                    0,
                    COALESCE((
                        SELECT MAX(I_TOTAL_EXCEL)
                        FROM ind.SIS240_REFERENCIA_EXCEL_ID11
                        WHERE I_ANIO = @Anio
                          AND I_MES = @Mes
                          AND V_METODO = 'MELA'
                    ), 0),
                    0,
                    'Cierre funcional: MELA no tiene mapeo HIS nominal vigente para abril de 2026; se conserva como referencia evaluada del formato SIS 240-M.'
                UNION ALL
                SELECT
                    'DIU_MIRENA_HARDCODEADO',
                    100,
                    CONVERT(bit, 0),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item IN ('58300', '58300.01')),
                    (SELECT COUNT(1) FROM Raw WHERE Codigo_Item IN ('58300', '58300.01')),
                    (SELECT COUNT(1) FROM Nominal WHERE Codigo_Metodo IN ('58300', '58300.01')),
                    'No forma parte del universo ajustado de abril; se conserva para explicar H15 = 344.'
            )
            INSERT INTO ind.SIS240_UNIVERSO_CACHE_ID11 (
                I_ANIO,
                I_MES,
                V_METODO,
                I_ORDEN,
                B_INCLUYE_UNIVERSO_AJUSTADO,
                I_TOTAL_EXCEL_REFERENCIA,
                I_TOTAL_DB_CRUDO,
                I_TOTAL_DB_REGLA,
                I_TOTAL_NOMINAL,
                I_DIF_REGLA_EXCEL,
                I_DIF_NOMINAL_EXCEL,
                V_ESTADO,
                V_REGLA_DB,
                F_GENERADO
            )
            SELECT
                @Anio AS I_ANIO,
                @Mes AS I_MES,
                m.V_METODO,
                m.I_ORDEN,
                m.B_INCLUYE_UNIVERSO_AJUSTADO,
                r.I_TOTAL_EXCEL,
                m.I_TOTAL_DB_CRUDO,
                m.I_TOTAL_DB_REGLA,
                m.I_TOTAL_NOMINAL,
                CASE WHEN r.I_TOTAL_EXCEL IS NULL THEN NULL ELSE m.I_TOTAL_DB_REGLA - r.I_TOTAL_EXCEL END AS I_DIF_REGLA_EXCEL,
                CASE WHEN r.I_TOTAL_EXCEL IS NULL THEN NULL ELSE m.I_TOTAL_NOMINAL - r.I_TOTAL_EXCEL END AS I_DIF_NOMINAL_EXCEL,
                CASE
                    WHEN r.I_TOTAL_EXCEL IS NULL THEN 'SIN_REFERENCIA'
                    WHEN m.I_TOTAL_DB_REGLA = r.I_TOTAL_EXCEL THEN 'CUADRADO'
                    ELSE 'DIFERENCIA'
                END AS V_ESTADO,
                m.V_REGLA_DB,
                @GeneratedAt AS F_GENERADO
            FROM MetodoRows m
            LEFT JOIN ind.SIS240_REFERENCIA_EXCEL_ID11 r
                ON r.I_ANIO = @Anio
               AND r.I_MES = @Mes
               AND r.V_METODO = m.V_METODO;

            INSERT INTO ind.SIS240_UNIVERSO_CACHE_META_ID11 (
                I_ANIO,
                I_MES,
                I_CACHE_VERSION,
                I_SOURCE_ROWS,
                I_TOTAL_FILAS_CACHE,
                V_ESTADO,
                V_NOTA,
                F_GENERADO
            )
            SELECT
                @Anio,
                @Mes,
                @CacheVersion,
                @SourceRows,
                COUNT(1),
                CASE
                    WHEN SUM(CASE WHEN B_INCLUYE_UNIVERSO_AJUSTADO = 1 AND ISNULL(I_DIF_REGLA_EXCEL, 0) <> 0 THEN 1 ELSE 0 END) = 0 THEN 'CUADRADO'
                    ELSE 'REQUIERE_REVISION'
                END,
                'Cache de contraste SIS 240-M generada desde SP, con referencia Excel y reglas DB trazables.',
                @GeneratedAt
            FROM ind.SIS240_UNIVERSO_CACHE_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes;

            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;
        END CATCH;
    END;

    SELECT
        'RESUMEN_UNIVERSO_SIS240_ID11' AS v_tabla,
        @Anio AS i_anio,
        @Mes AS i_mes,
        ISNULL(SUM(CASE WHEN c.B_INCLUYE_UNIVERSO_AJUSTADO = 1 THEN c.I_TOTAL_EXCEL_REFERENCIA ELSE 0 END), 0) AS total_excel_ajustado,
        ISNULL((
            SELECT MAX(I_TOTAL_EXCEL)
            FROM ind.SIS240_REFERENCIA_EXCEL_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes
              AND V_METODO = 'TOTAL_FORMATO_H15'
        ), 0) AS total_excel_formato_h15,
        ISNULL(SUM(CASE WHEN c.B_INCLUYE_UNIVERSO_AJUSTADO = 1 THEN c.I_TOTAL_DB_REGLA ELSE 0 END), 0) AS total_db_regla,
        ISNULL(SUM(CASE WHEN c.B_INCLUYE_UNIVERSO_AJUSTADO = 1 THEN c.I_TOTAL_DB_CRUDO ELSE 0 END), 0) AS total_db_crudo,
        ISNULL(SUM(CASE WHEN c.B_INCLUYE_UNIVERSO_AJUSTADO = 1 THEN c.I_TOTAL_NOMINAL ELSE 0 END), 0) AS total_nominal_metodos,
        (SELECT COUNT(DISTINCT DNI_Paciente) FROM ind.VW_NOMINAL_ID11 WHERE I_ANIO = @Anio AND I_MES = @Mes) AS total_nominal_operativo,
        ISNULL((
            SELECT SUM(I_TOTAL)
            FROM ind.SIS240_UNIVERSO_EVALUADO_ID11
            WHERE I_ANIO = @Anio
              AND I_MES = @Mes
        ), 0) AS total_atendidos_mes_actual,
        ISNULL(SUM(CASE WHEN c.B_INCLUYE_UNIVERSO_AJUSTADO = 1 THEN c.I_DIF_REGLA_EXCEL ELSE 0 END), 0) AS diferencia_db_regla_excel,
        @SourceRows AS source_rows,
        MAX(m.F_GENERADO) AS fecha_cache,
        MAX(m.V_ESTADO) AS estado
    FROM ind.SIS240_UNIVERSO_CACHE_ID11 c
    JOIN ind.SIS240_UNIVERSO_CACHE_META_ID11 m
        ON m.I_ANIO = c.I_ANIO
       AND m.I_MES = c.I_MES
    WHERE c.I_ANIO = @Anio
      AND c.I_MES = @Mes;

    SELECT
        'DETALLE_METODO_SIS240_ID11' AS v_tabla,
        I_ANIO AS i_anio,
        I_MES AS i_mes,
        V_METODO AS metodo,
        I_ORDEN AS orden,
        B_INCLUYE_UNIVERSO_AJUSTADO AS incluye_universo_ajustado,
        I_TOTAL_EXCEL_REFERENCIA AS total_excel_referencia,
        I_TOTAL_DB_CRUDO AS total_db_crudo,
        I_TOTAL_DB_REGLA AS total_db_regla,
        I_TOTAL_NOMINAL AS total_nominal,
        I_DIF_REGLA_EXCEL AS diferencia_regla_excel,
        I_DIF_NOMINAL_EXCEL AS diferencia_nominal_excel,
        V_ESTADO AS estado,
        V_REGLA_DB AS regla_db,
        F_GENERADO AS fecha_cache
    FROM ind.SIS240_UNIVERSO_CACHE_ID11
    WHERE I_ANIO = @Anio
      AND I_MES = @Mes
    ORDER BY I_ORDEN;

    ;WITH ObjetosRequeridos AS (
        SELECT 'ind.USP_SEL_DASHBOARD_STATS_ID11' AS V_OBJETO, 'P' AS V_TIPO
        UNION ALL SELECT 'ind.USP_SEL_GRILLA_NOMINAL_ID11', 'P'
        UNION ALL SELECT 'ind.USP_SEL_DESCARTADOS_ID11', 'P'
        UNION ALL SELECT 'ind.USP_SEL_UNIVERSO_SIS240_ID11', 'P'
        UNION ALL SELECT 'ind.USP_SEL_UNIVERSO_EVALUADO_SIS240_ID11', 'P'
        UNION ALL SELECT 'ind.VW_NOMINAL_ID11', 'V'
        UNION ALL SELECT 'ind.VW_DASHBOARD_STATS_ID11', 'V'
        UNION ALL SELECT 'ind.VW_DESCARTADOS_ID11', 'V'
        UNION ALL SELECT 'ind.SIS240_REFERENCIA_EXCEL_ID11', 'U'
        UNION ALL SELECT 'ind.SIS240_UNIVERSO_CACHE_ID11', 'U'
        UNION ALL SELECT 'ind.SIS240_UNIVERSO_CACHE_META_ID11', 'U'
        UNION ALL SELECT 'ind.SIS240_UNIVERSO_EVALUADO_ID11', 'U'
        UNION ALL SELECT 'ind.SIS240_UNIVERSO_EVALUADO_AUDIT_ID11', 'U'
        UNION ALL SELECT 'ind.TRG_SIS240_REFERENCIA_EXCEL_AUDIT_ID11', 'TR'
        UNION ALL SELECT 'ind.TRG_SIS240_UNIVERSO_CACHE_AUDIT_ID11', 'TR'
        UNION ALL SELECT 'ind.TRG_SIS240_UNIVERSO_EVALUADO_AUDIT_ID11', 'TR'
    )
    SELECT
        'AUDITORIA_OBJETOS_APP_ID11' AS v_tabla,
        r.V_OBJETO AS objeto,
        r.V_TIPO AS tipo_esperado,
        CASE WHEN o.object_id IS NULL THEN 0 ELSE 1 END AS existe,
        o.type AS tipo_encontrado,
        o.modify_date AS fecha_modificacion
    FROM ObjetosRequeridos r
    LEFT JOIN sys.objects o
        ON o.object_id = OBJECT_ID(r.V_OBJETO)
       AND o.type = r.V_TIPO
    ORDER BY r.V_TIPO, r.V_OBJETO;
END;
GO
