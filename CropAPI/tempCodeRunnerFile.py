from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
import numpy as np
import pandas as pd
import logging

# Define the FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["POST", "GET"],  # Explicitly allow POST method
    allow_headers=["*"],
)

# Load the model
model = tf.keras.models.load_model(r'M:\assignments\ALGO CONNECT\CropAI_webapp-main\CropAPI\tea_VGG16_model.h5')

# Define class labels
class_labels = pd.read_csv(r'M:\assignments\ALGO CONNECT\CropAI_webapp-main\CropAPI\tea diseases.csv')["folder_name"].tolist()

def preprocess_image(image: UploadFile, target_size=(224, 224)):
    """Preprocesses an image for model input."""
    img = Image.open(image.file)
    img = img.convert("RGB")
    resized = img.resize(target_size)
    normalized = np.array(resized) / 255.0
    normalized = np.expand_dims(normalized, axis=0)
    return normalized

@app.post("/predict_tea_disease")
async def predict_disease(image: UploadFile = File(...)):
    """Predicts tea disease from an uploaded image."""
    preprocessed_image = preprocess_image(image)
    predictions = model.predict(preprocessed_image)
    max_index = np.argmax(predictions)
    predicted_class = class_labels[max_index]
    confidence_score = predictions[0][max_index]
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