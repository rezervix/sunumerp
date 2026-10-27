import { GoogleGenerativeAI } from "@google/generative-ai"

const getApiKeys = (): string[] => {
  const keys: string[] = []
  
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY)
  }
  
  let index = 1
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${index}`]
    if (key) {
      if (!keys.includes(key)) {
        keys.push(key)
      }
      index++
    } else {
      break
    }
  }
  
  return keys
}

let activeKeyIndex = 0

export async function generateWithRotation(
  prompt: string,
  modelName: string = "gemini-2.5-flash",
  systemInstruction?: string,
  responseSchema?: any
): Promise<string> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found. Please set GEMINI_API_KEY or GEMINI_API_KEY_1... in .env")
  }

  const startIdx = activeKeyIndex
  let currentIdx = activeKeyIndex
  let lastError: any = null

  do {
    const apiKey = keys[currentIdx]
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const config: any = { model: modelName }
      if (systemInstruction) {
        config.systemInstruction = systemInstruction
      }
      if (responseSchema) {
        config.generationConfig = {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      }
      const model = genAI.getGenerativeModel(config)
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      if (text) {
        activeKeyIndex = currentIdx
        return text.trim()
      }
      throw new Error("Empty response from Gemini")
    } catch (err: any) {
      console.warn(`Gemini call failed with key index ${currentIdx}:`, err?.message || err)
      lastError = err
      currentIdx = (currentIdx + 1) % keys.length
    }
  } while (currentIdx !== startIdx)

  throw new Error(`All Gemini API keys exhausted. Last error: ${lastError?.message || lastError}`)
}
