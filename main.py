from fastapi import FastAPI
import re
from pydantic import BaseModel, Field
app = FastAPI()
@app.get("/")
def greet():
    return {"hello eva"}

"we are going to make some constants like:"
"A. MODEL PATH"
"B. TOKENIZER PATH"
"C. MAX SEQUENCE LENGTH"
"D. EMOTION LABELS"
"E. EMOTION EMOJIS"

#A. MODEL PATH (BiGRU)
model_path = "Artifacts/BiGRU_Model.keras"

#B. TOKENIZER PATH
tokenizer_path = "Artifacts/tokenizer.pkl"

#c . MAX SEQUENCE LENGTH
max_sequence_length = 50

#D. Emotional labels
emotion_labels = ['anger', 'fear', 'joy', 'love', 'sadness', 'surprise']

#E. Emotional emojis
EMOTION_EMOJIS = {
    "sadness": "😢",
    "joy": "😄",
    "love": "❤️",
    "anger": "😠",
    "fear": "😨",
    "surprise": "😲",
}


""" 
2. Preprocess the upcoming text data for prediction
cleans raw text so it matches the format used while training
A. convert text to lowercase
B. remove apostrophes(can't->cant)
C. remove special characters and punctuation
D.remove extra spaces

"""
def preprocess_text(text:str)->str:
  text = text.lower() #A. convert text to lowercase
  text = re.sub(r"\'", "", text) #B. remove apostrophes(can't->cant)
  text = re.sub(r"[^a-zA-Z0-9\s]", " ", text) #C. remove special characters and punctuation
  text = re.sub(r"\s+", " ", text).strip() #D.remove extra spaces
  return text

"""
3. Request and Response Schema
A. text input
B. Prediction response
C. Healthy response(server health check)
"""
class TextInput(BaseModel):
    text : str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The sentence to analyze",
        json_schema_extra={"example": "I feel so happy and excited"}
        )

class PredictionResponse(BaseModel):
    text: str
    predicted_emotion: str
    confidence : float
    all_probabilites: dict[str, float]

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
