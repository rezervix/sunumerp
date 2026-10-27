@echo off
TITLE Daron FinGPT Sunucusu
echo Daron FinGPT başlatılıyor...
echo Gerekli kutuphaneler kontrol ediliyor...

:: Python kütüphanelerini kur (Eksik varsa tamamlar)
python -m pip install -r requirements.txt

:: Sunucuyu baslat
echo.
echo Daron hazırlanıyor, model yüklenirken bekleyin...
echo (Ilk acilista model indirilecektir, bu islem uzun surebilir.)
python server.py

pause