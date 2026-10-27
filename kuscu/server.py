"""
Daron — Yerel Çiçekana ERP Finansal Asistan Mikro Servisi
Çiçekana Teknoloji & Medya Yönetim Paneli

Tamamen yerel çalışır. Harici ücretli API kullanmaz.
Model ilk çalıştırmada HuggingFace'ten indirilir (~7-14 GB)
ve ardından yerelde (~/.cache/huggingface) önbelleğe alınır.

Sistem Gereksinimleri:
  - GPU   modu (önerilen):  GPU + CUDA + 8 GB+ VRAM (4-bit quant ile)
  - CPU   modu (yavaş):     RAM 16 GB+ (CPU'da inference yavaştır)

Başlatmak için:
  pip install -r requirements.txt
  python server.py
"""

import os
import sys
import logging
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("daron")

# ─── Yapılandırma ──────────────────────────────────────────────────────────────
# Daron LoRA adaptor + baz model
DARON_BASE_MODEL  = os.getenv("DARON_BASE_MODEL",  "meta-llama/Llama-2-7b-chat-hf")
DARON_LORA_MODEL  = os.getenv("DARON_LORA_MODEL",  "FinGPT/fingpt-mt_llama2-7b_lora")

# Quantization: "4bit" (az VRAM), "8bit" (daha doğru), "none" (full precision)
QUANT_MODE         = os.getenv("QUANT_MODE",          "4bit")

# Sunucu ayarları
HOST               = os.getenv("KUSCU_HOST",          "0.0.0.0")
PORT               = int(os.getenv("KUSCU_PORT",      "8765"))
MAX_NEW_TOKENS     = int(os.getenv("MAX_NEW_TOKENS",  "512"))
TEMPERATURE        = float(os.getenv("TEMPERATURE",   "0.7"))

# HuggingFace — özel model erişimi için token (Llama-2 gated model gerektirir)
# Token gerekmiyorsa bu satırı boş bırakın.
HF_TOKEN           = os.getenv("HF_TOKEN",            "")
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "Sen Çiçekana Teknoloji & Medya şirketinin kıdemli finansal asistanı 'Daron'sundasın. "
    "Görevin yöneticilere finansal analiz, yorum ve tavsiye sunmaktır.\n"
    "Yanıtların:\n"
    "- Her zaman Türkçe olmalıdır\n"
    "- Net, yapılandırılmış ve profesyonel olmalıdır\n"
    "- Rakam ve yüzdeleri açıkça belirtmelidir\n"
    "- Spekülatif olmaktan kaçınmalı, veri odaklı olmalıdır\n"
)

app = FastAPI(title="Daron — Yerel Çiçekana ERP API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Yükleme ─────────────────────────────────────────────────────────────
tokenizer    = None
model        = None
lora_model   = None
device_info  = {}


def load_model():
    global tokenizer, model, lora_model, device_info

    log.info("=" * 60)
    log.info("  Daron — Yerel Çiçekana ERP Yükleniyor")
    log.info(f"  Baz model   : {DARON_BASE_MODEL}")
    log.info(f"  LoRA adaptor: {DARON_LORA_MODEL}")
    log.info(f"  Quantization: {QUANT_MODE}")
    log.info("=" * 60)

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        from peft import PeftModel

        # GPU kontrolü
        has_cuda  = torch.cuda.is_available()
        has_mps   = hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
        device    = "cuda" if has_cuda else ("mps" if has_mps else "cpu")
        device_info["device"] = device
        device_info["cuda"]   = has_cuda

        log.info(f"Hesaplama cihazı: {device.upper()}")
        if has_cuda:
            log.info(f"  GPU: {torch.cuda.get_device_name(0)}")
            log.info(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

        # Tokenizer
        log.info("Tokenizer yükleniyor...")
        hf_kwargs = {"token": HF_TOKEN} if HF_TOKEN else {}
        tokenizer = AutoTokenizer.from_pretrained(
            DARON_BASE_MODEL,
            trust_remote_code=True,
            **hf_kwargs,
        )
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Quantization ayarı
        bnb_config = None
        load_dtype = None

        if QUANT_MODE == "4bit" and (has_cuda or has_mps):
            log.info("4-bit QLoRA quantization aktif (bitsandbytes)")
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
        elif QUANT_MODE == "8bit" and (has_cuda or has_mps):
            log.info("8-bit quantization aktif (bitsandbytes)")
            bnb_config = BitsAndBytesConfig(load_in_8bit=True)
        else:
            log.info("Full precision (CPU veya QUANT_MODE=none)")
            load_dtype = torch.float32 if device == "cpu" else torch.float16

        # Baz model yükleme
        log.info(f"Baz model yükleniyor: {DARON_BASE_MODEL}")
        log.info("(İlk çalıştırmada model indirilecek, bu biraz sürebilir...)")

        model_kwargs: dict = {
            "trust_remote_code": True,
            "device_map": "auto" if (has_cuda or has_mps) else None,
            **hf_kwargs,
        }
        if bnb_config:
            model_kwargs["quantization_config"] = bnb_config
        elif load_dtype:
            model_kwargs["torch_dtype"] = load_dtype

        from transformers import AutoModelForCausalLM
        base_model = AutoModelForCausalLM.from_pretrained(DARON_BASE_MODEL, **model_kwargs)
        if device == "cpu":
            base_model = base_model.to("cpu")

        # LoRA adaptörü yükleme
        log.info(f"LoRA adaptörü yükleniyor: {DARON_LORA_MODEL}")
        model = PeftModel.from_pretrained(base_model, DARON_LORA_MODEL, **hf_kwargs)
        model.eval()

        device_info["quant"]     = QUANT_MODE
        device_info["base"]      = DARON_BASE_MODEL
        device_info["lora"]      = DARON_LORA_MODEL
        log.info("✅ Model başarıyla yüklendi. Daron hazır!")

    except ImportError as e:
        log.error(f"❌ Eksik kütüphane: {e}")
        log.error("   Lütfen çalıştırın: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        log.error(f"❌ Model yüklenemedi: {e}")
        log.error("   Lütfen sistem gereksinimlerini kontrol edin.")
        sys.exit(1)


# ─── API Şemaları ──────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str       # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    model: str
    device: str


# ─── Endpointler ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": "local_daron",
        "device": device_info.get("device", "unknown"),
        "quant": device_info.get("quant", "none"),
        "base_model": device_info.get("base", DARON_BASE_MODEL),
        "lora_adapter": device_info.get("lora", DARON_LORA_MODEL),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model henüz yüklenmedi.")

    try:
        import torch

        # Prompt şablonu — model tipine göre otomatik seçilir
        is_llama = "llama" in DARON_BASE_MODEL.lower()

        system_content = SYSTEM_PROMPT
        if req.context:
            system_content += f"\n\nMevcut Bağlam:\n{req.context}"

        if is_llama:
            # Llama-2 Chat formatı
            prompt = f"<s>[INST] <<SYS>>\n{system_content}\n<</SYS>>\n\n"
            for i, msg in enumerate(req.messages):
                if msg.role == "user":
                    if i == 0:
                        prompt += f"{msg.content} [/INST]"
                    else:
                        prompt += f"<s>[INST] {msg.content} [/INST]"
                elif msg.role == "assistant":
                    prompt += f" {msg.content} </s>"
        else:
            # Falcon / MPT / Bloom formatı
            prompt = f"System: {system_content}\n\n"
            for msg in req.messages:
                if msg.role == "user":
                    prompt += f"User: {msg.content}\n"
                elif msg.role == "assistant":
                    prompt += f"Assistant: {msg.content}\n"
            prompt += "Assistant:"


        device = device_info.get("device", "cpu")
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
        if device == "cuda":
            inputs = {k: v.cuda() for k, v in inputs.items()}

        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                temperature=TEMPERATURE,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=tokenizer.eos_token_id,
            )

        # Sadece yeni token'ları decode et
        input_len = inputs["input_ids"].shape[1]
        new_tokens = output_ids[0][input_len:]
        reply = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

        return ChatResponse(
            reply=reply,
            model=DARON_LORA_MODEL,
            device=device,
        )

    except Exception as e:
        log.error(f"Inference hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Daron yanıt üretemedi: {str(e)}")


# ─── Başlatma ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    load_model()
    log.info(f"🚀 Daron servisi başlatılıyor → http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
