from fastapi import FastAPI
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

""" 2. Preprocess the upcoming text data for prediction """



