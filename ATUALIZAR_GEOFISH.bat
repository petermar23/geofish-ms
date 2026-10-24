@echo off
chcp 65001 >nul
echo ============================================================
echo   GEOFISH MS - SINCRONIZADOR DE CADASTROS E BUILD
echo ============================================================
echo.

set PATH=C:\Users\peter\.local\nodejs;C:\Users\peter\.local\bin;%PATH%

echo [1/2] Sincronizando planilha cadastros_geofish.csv com os GeoJSONs...
if exist "C:\Program Files\QGIS 3.44.12\bin\python-qgis-ltr.bat" (
    call "C:\Program Files\QGIS 3.44.12\bin\python-qgis-ltr.bat" ferramentas\sincronizar_cadastros.py
) else (
    python ferramentas\sincronizar_cadastros.py
)

echo.
echo [2/2] Gerando build de producao (dist/)...
call npm run build

echo.
echo ============================================================
echo   CONCLUIDO! O GeoFish MS foi atualizado com sucesso.
echo ============================================================
pause
