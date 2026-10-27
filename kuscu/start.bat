@echo off
chcp 65001 >nul
echo.
echo  ================================================
echo    Daron — Yerel Çiçekana ERP Finansal Asistan
echo    Cicekana Teknoloji ^& Medya
echo  ================================================
echo.

:: .env yoksa kopyala
if not exist ".env" (
    echo  [KURULUM] .env bulunamadı, .env.example kopyalanıyor...
    copy .env.example .env >nul
    echo  [OK] .env oluşturuldu.
    echo.
    echo  *** İPUCU: Llama-2 yerine Falcon-7b varsayılan olarak seçildi.
    echo  *** Falcon-7b için HuggingFace token gerekmez.
    echo  *** Model ilk açılışta ~14 GB indirilecek (bir kez).
    echo.
)

:: Python kontrolü
python --version >nul 2>&1
if %errorlevel% NEQ 0 (
    echo  [HATA] Python bulunamadı! Lütfen Python 3.10+ kurun:
    echo         https://www.python.org/downloads/
    pause & exit /b 1
)

:: Sanal ortam
if not exist "venv" (
    echo  [KURULUM] Sanal ortam oluşturuluyor...
    python -m venv venv
)
call venv\Scripts\activate.bat

:: PyTorch GPU/CPU kontrolü ve kurulum
python -c "import torch; print(torch.__version__)" >nul 2>&1
if %errorlevel% NEQ 0 (
    echo  [KURULUM] PyTorch kuruluyor...
    echo  CUDA (GPU) destekli PyTorch deneniyor...

    :: CUDA 12.1 sürümünü dene
    pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    
    :: GPU yoksa CPU sürüme geri dön
    python -c "import torch; assert torch.cuda.is_available()" >nul 2>&1
    if %errorlevel% NEQ 0 (
        echo  [UYARI] CUDA GPU bulunamadı. CPU moduna geçiliyor (inference yavaş olacak).
        pip install -q torch torchvision torchaudio
        
        :: CPU modunda quantization'ı devre dışı bırak
        powershell -Command "(Get-Content .env) -replace 'QUANT_MODE=4bit', 'QUANT_MODE=none' | Set-Content .env"
        powershell -Command "(Get-Content .env) -replace 'QUANT_MODE=8bit', 'QUANT_MODE=none' | Set-Content .env"
        echo  [OK] .env dosyasında QUANT_MODE=none olarak güncellendi.
    ) else (
        echo  [OK] CUDA GPU tespit edildi. GPU modu aktif.
    )
)

:: Diğer bağımlılıklar
echo  [KURULUM] Bağımlılıklar kontrol ediliyor...
pip install -q -r requirements.txt

echo.
echo  ─────────────────────────────────────────────────
echo  Sistem Bilgisi:
python -c "import torch; gpu='%s (%.1f GB VRAM)'%(torch.cuda.get_device_name(0), torch.cuda.get_device_properties(0).total_memory/1e9) if torch.cuda.is_available() else 'YOK (CPU modu)'; print('  GPU    :', gpu)"
python -c "import torch; print('  PyTorch:', torch.__version__)"
python -c "from transformers import __version__; print('  HF     :', __version__)"
echo  ─────────────────────────────────────────────────
echo.
echo  Model: Falcon-7b + Daron LoRA (varsayılan)
echo  (İlk çalıştırmada model indiriliyor — internet gerekli)
echo  (Sonraki çalıştırmalarda yerel önbellekten yüklenir)
echo.
echo  Daron servisi baslatılıyor → http://localhost:8765
echo  Durdurmak için Ctrl+C
echo.

python server.py
pause
