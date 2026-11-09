IF OBJECT_ID(N'ind.USP_SEL_DASHBOARD_STATS_ID11', N'P') IS NULL
    EXEC(N'CREATE PROCEDURE ind.USP_SEL_DASHBOARD_STATS_ID11 AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE ind.USP_SEL_DASHBOARD_STATS_ID11
    @I_MES INT = NULL,
    @I_ANIO INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Mes INT = NULLIF(@I_MES, 0);
    DECLARE @Anio INT = NULLIF(@I_ANIO, 0);

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

    ;WITH Nominal AS (
        SELECT
            I_MES,
            I_ANIO,
            DNI_Paciente,
            Estado_Continuidad,
            Codigo_Metodo,
            Condicion_Dosis,
            Valor_Lab_Num
        FROM ind.VW_NOMINAL_ID11
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
    ),
    NominalStats AS (
        SELECT
            I_MES,
            I_ANIO,
            COUNT(DISTINCT DNI_Paciente) AS Total_Pacientes,
            SUM(IIF(Estado_Continuidad = 'Por Continuar (Alerta)', 1, 0)) AS Total_Proximos_Vencer,
            SUM(IIF(Estado_Continuidad = 'Abandono / Vencido', 1, 0)) AS Total_Abandonos,
            SUM(IIF(Estado_Continuidad = 'Protegido', 1, 0)) AS Total_Protegidos,
            SUM(IIF(Codigo_Metodo = '99208.04', 1, 0)) AS Total_Ampollas_Mensual,
            SUM(IIF(Codigo_Metodo = '99208.05', 1, 0)) AS Total_Ampollas_Trimestral,
            SUM(IIF(Codigo_Metodo = '99208.02', 1, 0)) AS Total_Preserv_Varones,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611'), 1, 0)) AS Total_Ligaduras,
            SUM(IIF(Codigo_Metodo = '55250', 1, 0)) AS Total_Vasectomias,
            SUM(IIF(Codigo_Metodo = '99208.06', 1, 0)) AS Total_Preserv_Mujeres,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01'), 1, 0)) AS Total_Diu,
            SUM(IIF(Codigo_Metodo = '11975', 1, 0)) AS Total_Implantes,
            SUM(IIF(Codigo_Metodo = '99208.13', 1, 0)) AS Total_Oral_Combinado,
            SUM(IIF(Codigo_Metodo IS NULL, 1, 0)) AS Total_Otros_Metodos,
            SUM(IIF(Codigo_Metodo = '99208.04' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Ampollas_Mensual_D,
            SUM(IIF(Codigo_Metodo = '99208.05' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Ampollas_Trimestral_D,
            SUM(IIF(Codigo_Metodo = '99208.02' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Preserv_Varones_D,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611') AND Condicion_Dosis = 'D', 1, 0)) AS Total_Ligaduras_D,
            SUM(IIF(Codigo_Metodo = '55250' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Vasectomias_D,
            SUM(IIF(Codigo_Metodo = '99208.06' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Preserv_Mujeres_D,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01') AND Condicion_Dosis = 'D', 1, 0)) AS Total_Diu_D,
            SUM(IIF(Codigo_Metodo = '11975' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Implantes_D,
            SUM(IIF(Codigo_Metodo = '99208.13' AND Condicion_Dosis = 'D', 1, 0)) AS Total_Oral_Combinado_D,
            0 AS Total_Otros_Metodos_D,
            SUM(IIF(Codigo_Metodo = '99208.04' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Ampollas_Mensual_R,
            SUM(IIF(Codigo_Metodo = '99208.05' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Ampollas_Trimestral_R,
            SUM(IIF(Codigo_Metodo = '99208.02' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Preserv_Varones_R,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611') AND Condicion_Dosis = 'R', 1, 0)) AS Total_Ligaduras_R,
            SUM(IIF(Codigo_Metodo = '55250' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Vasectomias_R,
            SUM(IIF(Codigo_Metodo = '99208.06' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Preserv_Mujeres_R,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01') AND Condicion_Dosis = 'R', 1, 0)) AS Total_Diu_R,
            SUM(IIF(Codigo_Metodo = '11975' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Implantes_R,
            SUM(IIF(Codigo_Metodo = '99208.13' AND Condicion_Dosis = 'R', 1, 0)) AS Total_Oral_Combinado_R,
            0 AS Total_Otros_Metodos_R,
            SUM(IIF(Codigo_Metodo = '99208.04', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Mensual,
            SUM(IIF(Codigo_Metodo = '99208.05', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Trimestral,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611'), Valor_Lab_Num, 0)) AS Insumo_Ligaduras,
            SUM(IIF(Codigo_Metodo = '55250', Valor_Lab_Num, 0)) AS Insumo_Vasectomias,
            SUM(IIF(Codigo_Metodo = '99208.02', Valor_Lab_Num, 0)) AS Insumo_Preserv_Varones,
            SUM(IIF(Codigo_Metodo = '99208.06', Valor_Lab_Num, 0)) AS Insumo_Preserv_Mujeres,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01'), Valor_Lab_Num, 0)) AS Insumo_Diu,
            SUM(IIF(Codigo_Metodo = '11975', Valor_Lab_Num, 0)) AS Insumo_Implantes,
            SUM(IIF(Codigo_Metodo = '99208.13', Valor_Lab_Num, 0)) AS Insumo_Oral_Combinado,
            SUM(IIF(Codigo_Metodo = '99208.04' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Mensual_D,
            SUM(IIF(Codigo_Metodo = '99208.05' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Trimestral_D,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611') AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Ligaduras_D,
            SUM(IIF(Codigo_Metodo = '55250' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Vasectomias_D,
            SUM(IIF(Codigo_Metodo = '99208.02' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Preserv_Varones_D,
            SUM(IIF(Codigo_Metodo = '99208.06' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Preserv_Mujeres_D,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01') AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Diu_D,
            SUM(IIF(Codigo_Metodo = '11975' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Implantes_D,
            SUM(IIF(Codigo_Metodo = '99208.13' AND Condicion_Dosis = 'D', Valor_Lab_Num, 0)) AS Insumo_Oral_Combinado_D,
            SUM(IIF(Codigo_Metodo = '99208.04' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Mensual_R,
            SUM(IIF(Codigo_Metodo = '99208.05' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Ampollas_Trimestral_R,
            SUM(IIF(Codigo_Metodo IN ('58600', '58605', '58611') AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Ligaduras_R,
            SUM(IIF(Codigo_Metodo = '55250' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Vasectomias_R,
            SUM(IIF(Codigo_Metodo = '99208.02' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Preserv_Varones_R,
            SUM(IIF(Codigo_Metodo = '99208.06' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Preserv_Mujeres_R,
            SUM(IIF(Codigo_Metodo IN ('58300', '58300.01') AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Diu_R,
            SUM(IIF(Codigo_Metodo = '11975' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Implantes_R,
            SUM(IIF(Codigo_Metodo = '99208.13' AND Condicion_Dosis = 'R', Valor_Lab_Num, 0)) AS Insumo_Oral_Combinado_R
        FROM Nominal
        GROUP BY I_MES, I_ANIO
    ),
    UniversoEvaluado AS (
        SELECT
            I_MES,
            I_ANIO,
            SUM(I_TOTAL) AS Total_Atendidos_Mes
        FROM ind.SIS240_UNIVERSO_EVALUADO_ID11
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
        GROUP BY I_MES, I_ANIO
    ),
    AgeStats AS (
        SELECT
            I_MES,
            I_ANIO,
            COUNT(DISTINCT IIF(Tipo_Edad <> 'A' OR TRY_CAST(Edad_Reg AS INT) < 15, TRY_CAST(Id_Paciente AS BIGINT), NULL)) AS Total_Menores_15,
            COUNT(DISTINCT IIF(Tipo_Edad = 'A' AND TRY_CAST(Edad_Reg AS INT) > 49, TRY_CAST(Id_Paciente AS BIGINT), NULL)) AS Total_Mayores_49
        FROM stg.his_trama
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
          AND Codigo_Item IN ('99402.04', '99402.07', 'Z3002')
          AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
        GROUP BY I_MES, I_ANIO
    ),
    TaStats AS (
        SELECT
            I_MES,
            I_ANIO,
            COUNT(DISTINCT TRY_CAST(Id_Paciente AS BIGINT)) AS Total_TA
        FROM stg.his_trama
        WHERE I_MES = @Mes
          AND I_ANIO = @Anio
          AND (
                (Codigo_Item = '99208' AND Valor_Lab = 'TA')
                OR (
                    Codigo_Item = '55250'
                    AND Tipo_Diagnostico IN ('D', 'R')
                    AND ISNULL(Valor_Lab, '') <> '1'
                )
              )
          AND TRY_CAST(Id_Paciente AS BIGINT) IS NOT NULL
        GROUP BY I_MES, I_ANIO
    ),
    Meses AS (
        SELECT @Mes AS I_MES, @Anio AS I_ANIO
        WHERE @Mes IS NOT NULL AND @Anio IS NOT NULL
    )
    SELECT TOP 1
        ISNULL(n.Total_Pacientes, 0) AS total_pacientes,
        ISNULL(t.Total_TA, 0) AS total_ta,
        ISNULL(n.Total_Ligaduras, 0) + ISNULL(n.Total_Vasectomias, 0) AS total_aqv,
        ISNULL(CAST(CAST((ISNULL(n.Total_Ligaduras, 0) + ISNULL(n.Total_Vasectomias, 0)) * 100.0 / NULLIF(n.Total_Pacientes, 0) AS DECIMAL(5,2)) AS VARCHAR(20)) + '%', '0%') AS porcentaje_aqv,
        ISNULL(n.Total_Preserv_Varones, 0) + ISNULL(n.Total_Preserv_Mujeres, 0) AS total_preservativos,
        ISNULL(n.Total_Otros_Metodos, 0) AS total_otros_metodos,
        ISNULL(n.Total_Proximos_Vencer, 0) AS total_proximos_vencer,
        ISNULL(n.Total_Abandonos, 0) AS total_abandonos,
        ISNULL(n.Total_Protegidos, 0) AS total_protegidos,
        ISNULL(n.Total_Ampollas_Mensual, 0) AS total_ampollas_mensual,
        ISNULL(n.Total_Ampollas_Trimestral, 0) AS total_ampollas_trimestral,
        ISNULL(n.Total_Ligaduras, 0) AS total_ligaduras,
        ISNULL(n.Total_Vasectomias, 0) AS total_vasectomias,
        ISNULL(n.Total_Preserv_Varones, 0) AS total_preserv_varones,
        ISNULL(n.Total_Diu, 0) AS total_diu,
        ISNULL(n.Total_Implantes, 0) AS total_implantes,
        ISNULL(n.Total_Oral_Combinado, 0) AS total_oral_combinado,
        ISNULL(n.Total_Preserv_Mujeres, 0) AS total_preserv_mujeres,
        ISNULL(n.Total_Ampollas_Mensual_D, 0) AS total_ampollas_mensual_d,
        ISNULL(n.Total_Ampollas_Trimestral_D, 0) AS total_ampollas_trimestral_d,
        ISNULL(n.Total_Ligaduras_D, 0) AS total_ligaduras_d,
        ISNULL(n.Total_Vasectomias_D, 0) AS total_vasectomias_d,
        ISNULL(n.Total_Preserv_Varones_D, 0) AS total_preserv_varones_d,
        ISNULL(n.Total_Preserv_Mujeres_D, 0) AS total_preserv_mujeres_d,
        ISNULL(n.Total_Diu_D, 0) AS total_diu_d,
        ISNULL(n.Total_Implantes_D, 0) AS total_implantes_d,
        ISNULL(n.Total_Oral_Combinado_D, 0) AS total_oral_combinado_d,
        ISNULL(n.Total_Otros_Metodos_D, 0) AS total_otros_metodos_d,
        ISNULL(n.Total_Ampollas_Mensual_R, 0) AS total_ampollas_mensual_r,
        ISNULL(n.Total_Ampollas_Trimestral_R, 0) AS total_ampollas_trimestral_r,
        ISNULL(n.Total_Ligaduras_R, 0) AS total_ligaduras_r,
        ISNULL(n.Total_Vasectomias_R, 0) AS total_vasectomias_r,
        ISNULL(n.Total_Preserv_Varones_R, 0) AS total_preserv_varones_r,
        ISNULL(n.Total_Preserv_Mujeres_R, 0) AS total_preserv_mujeres_r,
        ISNULL(n.Total_Diu_R, 0) AS total_diu_r,
        ISNULL(n.Total_Implantes_R, 0) AS total_implantes_r,
        ISNULL(n.Total_Oral_Combinado_R, 0) AS total_oral_combinado_r,
        ISNULL(n.Total_Otros_Metodos_R, 0) AS total_otros_metodos_r,
        ISNULL(n.Insumo_Ampollas_Mensual, 0) AS insumo_ampollas_mensual,
        ISNULL(n.Insumo_Ampollas_Trimestral, 0) AS insumo_ampollas_trimestral,
        ISNULL(n.Insumo_Ligaduras, 0) AS insumo_ligaduras,
        ISNULL(n.Insumo_Vasectomias, 0) AS insumo_vasectomias,
        ISNULL(n.Insumo_Preserv_Varones, 0) AS insumo_preserv_varones,
        ISNULL(n.Insumo_Diu, 0) AS insumo_diu,
        ISNULL(n.Insumo_Implantes, 0) AS insumo_implantes,
        ISNULL(n.Insumo_Oral_Combinado, 0) AS insumo_oral_combinado,
        ISNULL(n.Insumo_Preserv_Mujeres, 0) AS insumo_preserv_mujeres,
        ISNULL(n.Insumo_Ampollas_Mensual_D, 0) AS insumo_ampollas_mensual_d,
        ISNULL(n.Insumo_Ampollas_Trimestral_D, 0) AS insumo_ampollas_trimestral_d,
        ISNULL(n.Insumo_Ligaduras_D, 0) AS insumo_ligaduras_d,
        ISNULL(n.Insumo_Vasectomias_D, 0) AS insumo_vasectomias_d,
        ISNULL(n.Insumo_Preserv_Varones_D, 0) AS insumo_preserv_varones_d,
        ISNULL(n.Insumo_Preserv_Mujeres_D, 0) AS insumo_preserv_mujeres_d,
        ISNULL(n.Insumo_Diu_D, 0) AS insumo_diu_d,
        ISNULL(n.Insumo_Implantes_D, 0) AS insumo_implantes_d,
        ISNULL(n.Insumo_Oral_Combinado_D, 0) AS insumo_oral_combinado_d,
        ISNULL(n.Insumo_Ampollas_Mensual_R, 0) AS insumo_ampollas_mensual_r,
        ISNULL(n.Insumo_Ampollas_Trimestral_R, 0) AS insumo_ampollas_trimestral_r,
        ISNULL(n.Insumo_Ligaduras_R, 0) AS insumo_ligaduras_r,
        ISNULL(n.Insumo_Vasectomias_R, 0) AS insumo_vasectomias_r,
        ISNULL(n.Insumo_Preserv_Varones_R, 0) AS insumo_preserv_varones_r,
        ISNULL(n.Insumo_Preserv_Mujeres_R, 0) AS insumo_preserv_mujeres_r,
        ISNULL(n.Insumo_Diu_R, 0) AS insumo_diu_r,
        ISNULL(n.Insumo_Implantes_R, 0) AS insumo_implantes_r,
        ISNULL(n.Insumo_Oral_Combinado_R, 0) AS insumo_oral_combinado_r,
        ISNULL(u.Total_Atendidos_Mes, ISNULL(n.Total_Pacientes, 0)) AS total_atendidos_mes,
        ISNULL(a.Total_Menores_15, 0) AS total_menores_15,
        ISNULL(a.Total_Mayores_49, 0) AS total_mayores_49
    FROM Meses m
    LEFT JOIN NominalStats n ON m.I_MES = n.I_MES AND m.I_ANIO = n.I_ANIO
    LEFT JOIN UniversoEvaluado u ON m.I_MES = u.I_MES AND m.I_ANIO = u.I_ANIO
    LEFT JOIN AgeStats a ON m.I_MES = a.I_MES AND m.I_ANIO = a.I_ANIO
    LEFT JOIN TaStats t ON m.I_MES = t.I_MES AND m.I_ANIO = t.I_ANIO
    OPTION (RECOMPILE);

    ;WITH Mensual AS (
        SELECT
            ISNULL(I_DENOMINADOR, 0) AS i_denominador,
            ISNULL(I_NUMERADOR, 0) AS i_numerador,
            ISNULL(V_PORCENTAJE, '0%') AS v_porcentaje,
            I_ANIO,
            I_MES,
            TRY_CAST(REPLACE(REPLACE(V_PORCENTAJE, ' %', ''), '%', '') AS FLOAT) AS porcentaje_num
        FROM ind.resultados_indicador_11
        WHERE I_ANIO = @Anio
    )
    SELECT
        i_denominador,
        i_numerador,
        v_porcentaje,
        I_MES,
        ISNULL(porcentaje_num, 0) AS porcentaje_num,
        ISNULL(AVG(porcentaje_num) OVER (), 0) AS promedio_num
    FROM Mensual
    ORDER BY I_ANIO ASC, I_MES ASC
    OPTION (RECOMPILE);
END;
