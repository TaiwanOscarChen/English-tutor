<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h1>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>

---

## 關於 Google AI Studio (About Google AI Studio)

**Google AI Studio** 是由 Google 提供的原型設計環境，讓開發者能夠快速測試、實驗與建立基於 Gemini 模型（如 Gemini 1.5 Pro、Gemini 1.5 Flash）的 AI 應用程式。

## 使用步驟 (How to Use)

### 1. 取得 API 金鑰 (Get an API Key)
1. 前往 [Google AI Studio](https://aistudio.google.com/apps)。
2. 使用你的 Google 帳號登入。
3. 點擊 **"Get API key"** 並建立新的 API 金鑰（API Key）。

### 2. 在 AI Studio 中建立與測試 Prompt (Create & Test Prompts)
1. 選擇 Prompt 類型：
   - **Chat Prompt**：適合對話式應用或 Bot。
   - **Freeform Prompt**：適合結合文字、圖片、影片、音訊多模態輸入的靈活提示。
   - **Structured Prompt**：適合定義輸出格式（例如 JSON 格式）的應用。
2. 在 Model 選單中選擇使用的 Gemini 模型（例如 `gemini-1.5-flash` 或 `gemini-1.5-pro`）。
3. 輸入 System Instructions（系統指示）與用戶提示進行測試。

### 3. 匯出程式碼 (Export Code)
1. 測試完成後，點擊右上角的 **"Get code"** 按鈕。
2. 選擇你習慣使用的程式語言或 SDK（例如 Python, JavaScript, cURL, Go, Swift, Android 等）。
3. 將產生的程式碼複製並整合至你的專案中。

### 4. 在專案中使用 API (Use in Your Project)
以 Python 為例：
```bash
pip install google-generativeai
```

```python
import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Hello! How can you help me?")
print(response.text)
```
