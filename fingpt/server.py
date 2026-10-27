import os
# Modellerin D sürücüsüne inmesini saglayan ayar:
os.environ['HUGGINGFACE_HUB_CACHE'] = r'D:\Projeler\kaynakkod\fingpt\models'

from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()

# Model ayarları (Düşük VRAM için Falcon-7b-Instruct seçildi)
MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"

print("Daron modeli yükleniyor, bu işlem ilk seferde uzun sürebilir...")

# Model ve Tokenizer'ı yerel olarak yükle
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto",
    trust_remote_code=True
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    inputs = tokenizer(request.message, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_new_tokens=200)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"reply": response}

if __name__ == "__main__":
    import uvicorn
    print("Daron artık canlı! http://127.0.0.1:8000 üzerinden dinliyor.")
    uvicorn.run(app, host="127.0.0.1", port=8000)