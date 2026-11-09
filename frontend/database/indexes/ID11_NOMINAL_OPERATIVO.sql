/*
    Soporte de lectura para el nominal operativo ID 11.
    Estos indices no cambian reglas de negocio; reducen escaneos sobre stg.his_trama.
*/

IF OBJECT_ID(N'stg.his_trama', N'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'stg.his_trama')
          AND name = N'IX_his_trama_id11_periodo'
   )
BEGIN
    CREATE NONCLUSTERED INDEX IX_his_trama_id11_periodo
    ON stg.his_trama (I_ANIO, I_MES)
    INCLUDE (
        Id_Paciente,
        Id_Cita,
        Id_Personal,
        Fecha_Atencion,
        Codigo_Item,
        Tipo_Diagnostico,
        Valor_Lab,
        Tipo_Edad,
        Edad_Reg
    );
END;
GO

IF OBJECT_ID(N'stg.his_maestro_paciente', N'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'stg.his_maestro_paciente')
          AND name = N'IX_his_maestro_paciente_id11_periodo'
   )
BEGIN
    CREATE NONCLUSTERED INDEX IX_his_maestro_paciente_id11_periodo
    ON stg.his_maestro_paciente (I_ANIO, I_MES)
    INCLUDE (
        Id_Paciente,
        Numero_Documento,
        Nombres_Paciente,
        Apellido_Paterno_Paciente,
        Apellido_Materno_Paciente,
        Genero,
        Fecha_Nacimiento
    );
END;
GO
