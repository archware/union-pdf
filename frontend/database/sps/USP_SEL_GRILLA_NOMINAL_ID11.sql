IF OBJECT_ID(N'ind.USP_SEL_GRILLA_NOMINAL_ID11', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE ind.USP_SEL_GRILLA_NOMINAL_ID11 AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE ind.USP_SEL_GRILLA_NOMINAL_ID11
    @I_PAGE_NUMBER INT = 1,
    @I_PAGE_SIZE INT = 100,
    @V_SEARCH VARCHAR(255) = NULL,
    @V_FILTER_ESTADO VARCHAR(50) = NULL,
    @V_SORT_COLUMN VARCHAR(50) = 'nombre_paciente',
    @V_SORT_DIRECTION VARCHAR(4) = 'ASC',
    @I_MES INT = NULL,
    @I_ANIO INT = NULL,
    @V_FILTER_METODO NVARCHAR(120) = NULL,
    @V_FILTER_ESTADO_TA NVARCHAR(80) = NULL,
    @returnValue INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Mes INT = NULLIF(@I_MES, 0);
    DECLARE @Anio INT = NULLIF(@I_ANIO, 0);
    DECLARE @Search VARCHAR(255) = NULLIF(LTRIM(RTRIM(@V_SEARCH)), '');
    DECLARE @Estado VARCHAR(50) = LOWER(NULLIF(LTRIM(RTRIM(@V_FILTER_ESTADO)), ''));
    DECLARE @Metodo NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@V_FILTER_METODO)), '');
    DECLARE @EstadoTA NVARCHAR(80) = NULLIF(LTRIM(RTRIM(@V_FILTER_ESTADO_TA)), '');

    IF LOWER(ISNULL(@Metodo, N'')) = N'todos' SET @Metodo = NULL;
    IF LOWER(ISNULL(@EstadoTA, N'')) = N'todos' SET @EstadoTA = NULL;

    IF @I_PAGE_NUMBER IS NULL OR @I_PAGE_NUMBER < 1 SET @I_PAGE_NUMBER = 1;
    IF @I_PAGE_SIZE IS NULL OR @I_PAGE_SIZE < 1 SET @I_PAGE_SIZE = 100;
    IF NULLIF(LTRIM(RTRIM(@V_SORT_COLUMN)), '') IS NULL SET @V_SORT_COLUMN = 'nombre_paciente';
    IF UPPER(ISNULL(@V_SORT_DIRECTION, 'ASC')) <> 'DESC' SET @V_SORT_DIRECTION = 'ASC' ELSE SET @V_SORT_DIRECTION = 'DESC';

    DECLARE @CacheVersion INT = 3;
    DECLARE @CacheMaxAgeMinutes INT = 10080;
    DECLARE @SourceRows INT = 0;

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

    IF OBJECT_ID(N'ind.NOMINAL_OPERATIVO_CACHE_ID11', N'U') IS NULL
    BEGIN
        CREATE TABLE ind.NOMINAL_OPERATIVO_CACHE_ID11 (
            I_ANIO INT NOT NULL,
            I_MES INT NOT NULL,
            cache_version INT NOT NULL,
            source_rows INT NOT NULL,
            generated_at DATETIME2(0) NOT NULL,
            dni_paciente VARCHAR(50) NULL,
            nombre_paciente NVARCHAR(300) NULL,
            sexo VARCHAR(20) NULL,
            edad INT NULL,
            metodo_administrado NVARCHAR(120) NULL,
            fecha_inicio VARCHAR(10) NULL,
            fecha_ultima_dosis VARCHAR(10) NULL,
            fecha_proxima_cita VARCHAR(10) NULL,
            estado_continuidad NVARCHAR(80) NULL,
            telefono VARCHAR(50) NULL,
            meta_anual INT NULL,
            entregas_anuales INT NULL,
            faltante_ta INT NULL,
            estado_ta NVARCHAR(80) NULL
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'ind.NOMINAL_OPERATIVO_CACHE_ID11')
          AND name = N'IX_NOMINAL_OPERATIVO_CACHE_ID11_PERIODO'
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_NOMINAL_OPERATIVO_CACHE_ID11_PERIODO
        ON ind.NOMINAL_OPERATIVO_CACHE_ID11 (I_ANIO, I_MES)
        INCLUDE (
            cache_version,
            source_rows,
            generated_at,
            dni_paciente,
            nombre_paciente,
            edad,
            metodo_administrado,
            estado_continuidad,
            entregas_anuales,
            estado_ta
        );
    END;

    SELECT @SourceRows = COUNT(1)
    FROM stg.his_trama
    WHERE I_ANIO = @Anio;

    DECLARE @CachedVersion INT = NULL;
    DECLARE @CachedSourceRows INT = NULL;
    DECLARE @CachedGeneratedAt DATETIME2(0) = NULL;

    SELECT
        @CachedVersion = MAX(cache_version),
        @CachedSourceRows = MAX(source_rows),
        @CachedGeneratedAt = MAX(generated_at)
    FROM ind.NOMINAL_OPERATIVO_CACHE_ID11
    WHERE I_ANIO = @Anio
      AND I_MES = @Mes;

    IF @CachedVersion IS NULL
       OR @CachedVersion <> @CacheVersion
       OR @CachedSourceRows <> @SourceRows
       OR @CachedGeneratedAt IS NULL
       OR DATEDIFF(MINUTE, @CachedGeneratedAt, SYSDATETIME()) >= @CacheMaxAgeMinutes
    BEGIN
        DELETE FROM ind.NOMINAL_OPERATIVO_CACHE_ID11
        WHERE I_ANIO = @Anio
          AND I_MES = @Mes;

        INSERT INTO ind.NOMINAL_OPERATIVO_CACHE_ID11 (
            I_ANIO,
            I_MES,
            cache_version,
            source_rows,
            generated_at,
            dni_paciente,
            nombre_paciente,
            sexo,
            edad,
            metodo_administrado,
            fecha_inicio,
            fecha_ultima_dosis,
            fecha_proxima_cita,
            estado_continuidad,
            telefono,
            meta_anual,
            entregas_anuales,
            faltante_ta,
            estado_ta
        )
        SELECT
            @Anio AS I_ANIO,
            @Mes AS I_MES,
            @CacheVersion AS cache_version,
            @SourceRows AS source_rows,
            SYSDATETIME() AS generated_at,
            DNI_Paciente AS dni_paciente,
            Nombre_Paciente AS nombre_paciente,
            Sexo AS sexo,
            Edad AS edad,
            Metodo_Administrado AS metodo_administrado,
            ISNULL(CONVERT(VARCHAR(10), Fecha_Inicio, 120), '') AS fecha_inicio,
            ISNULL(CONVERT(VARCHAR(10), Fecha_Ultima_Dosis, 120), '') AS fecha_ultima_dosis,
            ISNULL(CONVERT(VARCHAR(10), Fecha_Proxima_Cita, 120), '') AS fecha_proxima_cita,
            Estado_Continuidad AS estado_continuidad,
            Telefono AS telefono,
            Meta_Anual AS meta_anual,
            Entregas_Anuales AS entregas_anuales,
            Faltante_TA AS faltante_ta,
            Estado_TA AS estado_ta
        FROM ind.VW_NOMINAL_ID11
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
        OPTION (RECOMPILE);
    END;

    CREATE TABLE #NominalGrid (
        dni_paciente VARCHAR(50) NULL,
        nombre_paciente NVARCHAR(300) NULL,
        sexo VARCHAR(20) NULL,
        edad INT NULL,
        metodo_administrado NVARCHAR(120) NULL,
        fecha_inicio VARCHAR(10) NULL,
        fecha_ultima_dosis VARCHAR(10) NULL,
        fecha_proxima_cita VARCHAR(10) NULL,
        estado_continuidad NVARCHAR(80) NULL,
        telefono VARCHAR(50) NULL,
        meta_anual INT NULL,
        entregas_anuales INT NULL,
        faltante_ta INT NULL,
        estado_ta NVARCHAR(80) NULL
    );

    INSERT INTO #NominalGrid (
        dni_paciente,
        nombre_paciente,
        sexo,
        edad,
        metodo_administrado,
        fecha_inicio,
        fecha_ultima_dosis,
        fecha_proxima_cita,
        estado_continuidad,
        telefono,
        meta_anual,
        entregas_anuales,
        faltante_ta,
        estado_ta
    )
    SELECT
        dni_paciente,
        nombre_paciente,
        sexo,
        edad,
        metodo_administrado,
        fecha_inicio,
        fecha_ultima_dosis,
        fecha_proxima_cita,
        continuidad.estado_continuidad_actual AS estado_continuidad,
        telefono,
        meta_anual,
        entregas_anuales,
        faltante_ta,
        estado_ta
    FROM ind.NOMINAL_OPERATIVO_CACHE_ID11
    CROSS APPLY (
        SELECT
            TRY_CONVERT(DATE, NULLIF(fecha_ultima_dosis, ''), 120) AS fecha_ultima_dosis_date,
            TRY_CONVERT(DATE, NULLIF(fecha_proxima_cita, ''), 120) AS fecha_proxima_cita_date
    ) fechas
    CROSS APPLY (
        SELECT
            COALESCE(
                fechas.fecha_proxima_cita_date,
                DATEADD(DAY, 90, fechas.fecha_ultima_dosis_date)
            ) AS fecha_vencimiento
    ) vencimiento
    CROSS APPLY (
        SELECT
            CASE
                WHEN metodo_administrado LIKE N'Ligadura%' OR metodo_administrado LIKE N'Vasectom%' THEN N'Finalizado / Permanente'
                WHEN ISNULL(meta_anual, 0) = 0 THEN N'Sin método registrado'
                WHEN vencimiento.fecha_vencimiento >= GETDATE() THEN N'Protegido'
                WHEN vencimiento.fecha_vencimiento BETWEEN DATEADD(DAY, -5, GETDATE()) AND GETDATE() THEN N'Por Continuar (Alerta)'
                ELSE N'Abandono / Vencido'
            END AS estado_continuidad_actual
    ) continuidad
    WHERE I_MES = @Mes
      AND I_ANIO = @Anio
      AND (
            @Search IS NULL
            OR dni_paciente LIKE '%' + @Search + '%'
            OR nombre_paciente LIKE '%' + @Search + '%'
            OR metodo_administrado LIKE '%' + @Search + '%'
            OR continuidad.estado_continuidad_actual LIKE '%' + @Search + '%'
            OR estado_ta LIKE '%' + @Search + '%'
          )
      AND (
            @Estado IS NULL
            OR @Estado = 'todos'
            OR (@Estado = 'abandono' AND continuidad.estado_continuidad_actual LIKE '%Abandono%')
            OR (@Estado = 'alerta' AND continuidad.estado_continuidad_actual LIKE '%Alerta%')
            OR (@Estado = 'protegido' AND continuidad.estado_continuidad_actual = 'Protegido')
            OR continuidad.estado_continuidad_actual = @V_FILTER_ESTADO
          )
      AND (@Metodo IS NULL OR metodo_administrado = @Metodo)
      AND (@EstadoTA IS NULL OR estado_ta = @EstadoTA)
    OPTION (RECOMPILE);

    SELECT @returnValue = COUNT(1)
    FROM #NominalGrid;

    WITH Ordered_CTE AS (
        SELECT
            *,
            CAST(ROW_NUMBER() OVER (
                ORDER BY
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'dni_paciente' THEN dni_paciente END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'dni_paciente' THEN dni_paciente END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'edad' THEN edad END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'edad' THEN edad END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'estado_continuidad' THEN estado_continuidad END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'estado_continuidad' THEN estado_continuidad END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'estado_ta' THEN estado_ta END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'estado_ta' THEN estado_ta END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'metodo_administrado' THEN metodo_administrado END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'metodo_administrado' THEN metodo_administrado END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'fecha_inicio' THEN fecha_inicio END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'fecha_inicio' THEN fecha_inicio END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'fecha_ultima_dosis' THEN fecha_ultima_dosis END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'fecha_ultima_dosis' THEN fecha_ultima_dosis END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'fecha_proxima_cita' THEN fecha_proxima_cita END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'fecha_proxima_cita' THEN fecha_proxima_cita END DESC,
                    CASE WHEN @V_SORT_DIRECTION = 'ASC' AND @V_SORT_COLUMN = 'nombre_paciente' THEN nombre_paciente END ASC,
                    CASE WHEN @V_SORT_DIRECTION = 'DESC' AND @V_SORT_COLUMN = 'nombre_paciente' THEN nombre_paciente END DESC,
                    nombre_paciente ASC
            ) AS INT) AS RowNum
        FROM #NominalGrid
    )
    SELECT
        RowNum AS I_NUM,
        dni_paciente,
        nombre_paciente,
        sexo,
        edad,
        metodo_administrado,
        fecha_inicio,
        fecha_ultima_dosis,
        fecha_proxima_cita,
        estado_continuidad,
        telefono,
        meta_anual,
        entregas_anuales,
        faltante_ta,
        estado_ta
    FROM Ordered_CTE
    WHERE RowNum BETWEEN (@I_PAGE_SIZE * (@I_PAGE_NUMBER - 1) + 1) AND (@I_PAGE_SIZE * @I_PAGE_NUMBER)
    ORDER BY RowNum
    OPTION (RECOMPILE);

    SELECT ISNULL(@returnValue, 0) AS TotalRecords;
END;
