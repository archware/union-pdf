IF OBJECT_ID(N'ind.USP_SEL_DESCARTADOS_ID11', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE ind.USP_SEL_DESCARTADOS_ID11 AS BEGIN SET NOCOUNT ON; END');
GO

IF OBJECT_ID(N'ind.DESCARTADOS_CACHE_ID11', N'U') IS NOT NULL
   AND COL_LENGTH(N'ind.DESCARTADOS_CACHE_ID11', N'Nombre_Obstetra') IS NULL
BEGIN
    ALTER TABLE ind.DESCARTADOS_CACHE_ID11
        ADD Nombre_Obstetra NVARCHAR(300) NULL;
END;
GO

ALTER PROCEDURE ind.USP_SEL_DESCARTADOS_ID11
    @I_MES INT = NULL,
    @I_ANIO INT = NULL,
    @V_SEARCH VARCHAR(255) = NULL,
    @I_PAGE_NUMBER INT = 1,
    @I_PAGE_SIZE INT = 100
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Mes INT = NULLIF(@I_MES, 0);
    DECLARE @Anio INT = NULLIF(@I_ANIO, 0);
    DECLARE @Search VARCHAR(255) = NULLIF(LTRIM(RTRIM(@V_SEARCH)), '');
    DECLARE @CacheVersion INT = 3;
    DECLARE @CacheMaxAgeMinutes INT = 10080;
    DECLARE @SourceRows INT = 0;

    IF @I_PAGE_NUMBER IS NULL OR @I_PAGE_NUMBER < 1 SET @I_PAGE_NUMBER = 1;
    IF @I_PAGE_SIZE IS NULL OR @I_PAGE_SIZE < 1 SET @I_PAGE_SIZE = 100;

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

    IF OBJECT_ID(N'ind.DESCARTADOS_CACHE_ID11', N'U') IS NULL
    BEGIN
        CREATE TABLE ind.DESCARTADOS_CACHE_ID11 (
            I_ANIO INT NOT NULL,
            I_MES INT NOT NULL,
            cache_version INT NOT NULL,
            source_rows INT NOT NULL,
            generated_at DATETIME2(0) NOT NULL,
            DNI_Paciente VARCHAR(50) NULL,
            Nombre_Paciente NVARCHAR(300) NULL,
            Sexo VARCHAR(20) NULL,
            Edad INT NULL,
            Codigo_Obstetra VARCHAR(50) NULL,
            Nombre_Obstetra NVARCHAR(300) NULL,
            Fecha_Atencion DATE NULL,
            Motivo_Descarte NVARCHAR(120) NULL
        );
    END;

    IF COL_LENGTH(N'ind.DESCARTADOS_CACHE_ID11', N'Nombre_Obstetra') IS NULL
    BEGIN
        ALTER TABLE ind.DESCARTADOS_CACHE_ID11
            ADD Nombre_Obstetra NVARCHAR(300) NULL;
    END;

    IF OBJECT_ID(N'ind.DESCARTADOS_CACHE_META_ID11', N'U') IS NULL
    BEGIN
        CREATE TABLE ind.DESCARTADOS_CACHE_META_ID11 (
            I_ANIO INT NOT NULL,
            I_MES INT NOT NULL,
            cache_version INT NOT NULL,
            source_rows INT NOT NULL,
            generated_at DATETIME2(0) NOT NULL,
            CONSTRAINT PK_DESCARTADOS_CACHE_META_ID11 PRIMARY KEY (I_ANIO, I_MES)
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'ind.DESCARTADOS_CACHE_ID11')
          AND name = N'IX_DESCARTADOS_CACHE_ID11_PERIODO'
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_DESCARTADOS_CACHE_ID11_PERIODO
        ON ind.DESCARTADOS_CACHE_ID11 (I_ANIO, I_MES)
        INCLUDE (
            cache_version,
            source_rows,
            generated_at,
            DNI_Paciente,
            Nombre_Paciente,
            Nombre_Obstetra,
            Fecha_Atencion,
            Motivo_Descarte
        );
    END;

    SELECT @SourceRows = COUNT(1)
    FROM stg.his_trama
    WHERE I_ANIO = @Anio;

    DECLARE @CachedVersion INT = NULL;
    DECLARE @CachedSourceRows INT = NULL;
    DECLARE @CachedGeneratedAt DATETIME2(0) = NULL;

    SELECT
        @CachedVersion = cache_version,
        @CachedSourceRows = source_rows,
        @CachedGeneratedAt = generated_at
    FROM ind.DESCARTADOS_CACHE_META_ID11
    WHERE I_ANIO = @Anio
      AND I_MES = @Mes;

    IF @CachedVersion IS NULL
       OR @CachedVersion <> @CacheVersion
       OR @CachedSourceRows <> @SourceRows
       OR @CachedGeneratedAt IS NULL
       OR DATEDIFF(MINUTE, @CachedGeneratedAt, SYSDATETIME()) >= @CacheMaxAgeMinutes
    BEGIN
        DELETE FROM ind.DESCARTADOS_CACHE_ID11
        WHERE I_ANIO = @Anio
          AND I_MES = @Mes;

        DELETE FROM ind.DESCARTADOS_CACHE_META_ID11
        WHERE I_ANIO = @Anio
          AND I_MES = @Mes;

        INSERT INTO ind.DESCARTADOS_CACHE_ID11 (
            I_ANIO,
            I_MES,
            cache_version,
            source_rows,
            generated_at,
            DNI_Paciente,
            Nombre_Paciente,
            Sexo,
            Edad,
            Codigo_Obstetra,
            Nombre_Obstetra,
            Fecha_Atencion,
            Motivo_Descarte
        )
        SELECT
            @Anio AS I_ANIO,
            @Mes AS I_MES,
            @CacheVersion AS cache_version,
            @SourceRows AS source_rows,
            SYSDATETIME() AS generated_at,
            DNI_Paciente,
            Nombre_Paciente,
            Sexo,
            Edad,
            Codigo_Obstetra,
            Nombre_Obstetra,
            CAST(Fecha_Atencion AS DATE) AS Fecha_Atencion,
            Motivo_Descarte
        FROM ind.VW_DESCARTADOS_ID11
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
        OPTION (RECOMPILE);

        INSERT INTO ind.DESCARTADOS_CACHE_META_ID11 (
            I_ANIO,
            I_MES,
            cache_version,
            source_rows,
            generated_at
        )
        VALUES (
            @Anio,
            @Mes,
            @CacheVersion,
            @SourceRows,
            SYSDATETIME()
        );
    END;

    CREATE TABLE #DescartadosGrid (
        DNI_Paciente VARCHAR(50) NULL,
        Nombre_Paciente NVARCHAR(300) NULL,
        Sexo VARCHAR(20) NULL,
        Edad INT NULL,
        Codigo_Obstetra VARCHAR(50) NULL,
        Nombre_Obstetra NVARCHAR(300) NULL,
        Fecha_Atencion DATE NULL,
        Motivo_Descarte NVARCHAR(120) NULL
    );

    INSERT INTO #DescartadosGrid (
        DNI_Paciente,
        Nombre_Paciente,
        Sexo,
        Edad,
        Codigo_Obstetra,
        Nombre_Obstetra,
        Fecha_Atencion,
        Motivo_Descarte
    )
    SELECT
        DNI_Paciente,
        Nombre_Paciente,
        Sexo,
        Edad,
        Codigo_Obstetra,
        Nombre_Obstetra,
        Fecha_Atencion,
        Motivo_Descarte
    FROM ind.DESCARTADOS_CACHE_ID11
    WHERE I_MES = @Mes
      AND I_ANIO = @Anio
      AND (
            @Search IS NULL
            OR DNI_Paciente LIKE '%' + @Search + '%'
            OR Nombre_Paciente LIKE '%' + @Search + '%'
            OR Nombre_Obstetra LIKE '%' + @Search + '%'
          )
    OPTION (RECOMPILE);

    SELECT
        DNI_Paciente,
        Nombre_Paciente,
        Sexo,
        Edad,
        Codigo_Obstetra,
        Nombre_Obstetra,
        CAST(Fecha_Atencion AS VARCHAR(10)) AS fecha_atencion,
        Motivo_Descarte
    FROM #DescartadosGrid
    ORDER BY Fecha_Atencion DESC, DNI_Paciente ASC
    OFFSET (@I_PAGE_SIZE * (@I_PAGE_NUMBER - 1)) ROWS FETCH NEXT @I_PAGE_SIZE ROWS ONLY
    OPTION (RECOMPILE);

    SELECT COUNT(1) AS TotalRecords
    FROM #DescartadosGrid;
END;
