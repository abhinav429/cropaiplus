from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
import numpy as np
import pandas as pd
import logging

# Project-local paths (works on macOS/Linux/Windows; keep model + CSV next to app.py)
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET"],  
    allow_headers=["*"],
)

# Load the model (try compile=False). Place tea_VGG16_model.h5 in CropAPI/.
model = tf.keras.models.load_model(
    str(BASE_DIR / "tea_VGG16_model.h5"),
    compile=False,
)

# Load class labels and clean them
class_labels = pd.read_csv(BASE_DIR / "tea diseases.csv")["folder_name"].str.strip().tolist()

# Debugging: Print class labels to verify correctness
print(f"Class Labels: {class_labels}")

def preprocess_image(image: UploadFile, target_size=(224, 224)):
    """Preprocesses an image for model input."""
    img = Image.open(image.file)
    img = img.convert("RGB")
    resized = img.resize(target_size)

    # Try different normalizations
    normalized = (np.array(resized) / 127.5) - 1  # Scale to [0, 6]

    
    normalized = np.expand_dims(normalized, axis=0)
    return normalized

@app.post("/predict_tea_disease")
async def predict_disease(image: UploadFile = File(...)):
    """Predicts tea disease from an uploaded image."""
    preprocessed_image = preprocess_image(image)

    predictions = model.predict(preprocessed_image)
    
    # Debugging: Print predictions to verify
    print(f"Raw Predictions: {predictions}")

    max_index = np.argmax(predictions[0])  
    predicted_class = class_labels[max_index]
    confidence_score = predictions[0][max_index]

    print(f"Predicted Index: {max_index}, Class: {predicted_class}, Confidence: {confidence_score}")

    return {
        "predicted_class": predicted_class,
        "confidence_score": confidence_score.item()
    }

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/test")
async def test():
    return {"message": "API is working"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
