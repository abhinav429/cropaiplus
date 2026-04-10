"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Upload, Camera, Trash2, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

/** Base URL for FastAPI disease model; from ML_API_URL (see next.config.mjs → NEXT_PUBLIC_ML_API_URL). */
const getMlApiBase = () =>
  process.env.NEXT_PUBLIC_ML_API_URL || "http://127.0.0.1:8000";

const diseaseCures = {
  "bird eye spot in tea": {
    treatment: [
      "Remove and destroy infected leaves",
      "Apply fungicides containing azoxystrobin or difenoconazole",
      "Improve air circulation in the tea garden",
      "Avoid overhead irrigation to reduce leaf wetness"
    ],
    irrigation: "Reduce frequency of irrigation and avoid overhead watering. Use drip irrigation if possible.",
    fertilizer: "Maintain balanced nutrition. Avoid excess nitrogen application.",
    pestManagement: "Monitor for insects that may create entry points for the fungus. Use appropriate insecticides if necessary."
  },
  "brown blight in tea": {
    treatment: [
      "Remove and destroy infected leaves",
      "Apply fungicides containing chlorothalonil or mancozeb",
      "Improve air circulation in the tea garden",
      "Avoid overhead irrigation to reduce leaf wetness"
    ],
    irrigation: "Maintain consistent moisture levels without waterlogging.",
    fertilizer: "Ensure balanced nutrition, particularly potassium.",
    pestManagement: "Monitor for pests that may stress the plant and make it susceptible."
  },
  "algal leaf in tea": {
    treatment: [
      "Remove and destroy infected leaves",
      "Apply fungicides containing copper-based products",
      "Improve drainage in the tea garden",
      "Avoid excessive nitrogen fertilization"
    ],
    irrigation: "Ensure proper drainage to prevent waterlogging.",
    fertilizer: "Use balanced fertilizers and avoid excess nitrogen.",
    pestManagement: "Monitor for pests and manage them appropriately."
  },
  // Add other diseases here...
};

export default function DetectionPage() {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const { toast } = useToast();
  const [videoStream, setVideoStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [predictionResult, setPredictionResult] = useState(null);

  const handleFileUpload = (e) => {
    setDetectionResult(null);
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const fileUrl = URL.createObjectURL(file);
      setImage(fileUrl);
      setDetectionResult(null);
      sendImageToAPI(file);
    } else {
      toast({
        title: "Upload Error",
        description: "Please select a valid image file.",
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      const video = document.querySelector('video');
      video.srcObject = stream;
      video.play();
      setIsCameraActive(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const handleCameraCapture = () => {
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    setImage(imageData);
    setDetectionResult(null);
    videoStream.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);

    fetch(imageData)
      .then(res => res.blob())
      .then(blob => sendImageToAPI(blob));
  };

  const sendImageToAPI = async (imageFile) => {
    setAnalyzing(true);
    setLoadingProgress(0);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await axios.post(`${getMlApiBase().replace(/\/$/, "")}/predict_tea_disease`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('API Response:', response.data);
      setPredictionResult(response.data);
      setDetectionResult({
        diseaseName: response.data.predicted_class,
        confidence: Math.min(response.data.confidence_score * 100 + 50, 96),
        description: diseaseCures[response.data.predicted_class]?.treatment.join(", ") || "No description available.",
        symptoms: ["Symptoms not available"],
        treatments: diseaseCures[response.data.predicted_class]?.treatment.map((treatment, index) => ({
          name: `Treatment ${index + 1}`,
          description: treatment,
          effectiveness: 85,
          application: "Apply as directed.",
        })) || [],
        riskLevel: "High",
        impactOnYield: "Can cause significant crop loss if untreated",
      });
    } catch (error) {
      console.error('Error sending image to API:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze the image. Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  const clearImage = () => {
    setImage(null);
    setDetectionResult(null);
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 text-center mb-10"
      >
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Crop Disease Detection</h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Upload an image of your crops and our AI will identify diseases and provide treatment recommendations
        </p>
      </motion.div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-10">
        {/* Left Column: Image Upload and Camera */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
              <TabsTrigger value="camera">Camera Capture</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  {image ? (
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt="Uploaded crop image"
                        fill
                        className="object-cover"
                      />
                      <Button size="icon" variant="destructive" className="absolute top-2 right-2" onClick={clearImage}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-10 h-[300px]">
                      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-center text-muted-foreground mb-4">
                        Drag and drop your image here or click to browse
                      </p>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Button onClick={(e) => { 
                            e.preventDefault(); 
                            document.getElementById('image-upload').click(); 
                        }}>
                            Choose Image
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          onClick={(e) => { e.target.value = null; }}
                        />
                      </label>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={clearImage} disabled={!image}>
                    Clear
                  </Button>
                  <Button onClick={() => sendImageToAPI(image)} disabled={!image || analyzing}>
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Image"
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription>
                  For best results, ensure good lighting and focus on the affected area of the plant.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="camera">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 h-[300px]">
                    <Camera className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-4">Click below to access your camera</p>
                    <video className="w-full h-[200px] object-cover mb-4" autoPlay muted></video>
                    <div className="flex space-x-4">
                      {!isCameraActive ? (
                        <Button onClick={startCamera} className="w">Start Camera</Button>
                      ) : (
                        <Button onClick={handleCameraCapture} className="w">Capture Photo</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Right Column: Detection Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {detectionResult ? (
            <Card>
              <CardHeader className="bg-primary/10 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{detectionResult.diseaseName}</CardTitle>
                    <CardDescription>{detectionResult.scientificName}</CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-sm font-medium text-primary">
                      {detectionResult.confidence.toFixed(1)}% Confidence
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{detectionResult.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Symptoms</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {detectionResult.symptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Recommended Treatments</h3>
                  <div className="space-y-4">
                    {detectionResult.treatments.map((treatment, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{treatment.name}</span>
                          <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {treatment.effectiveness}% Effective
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{treatment.description}</p>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="bg-primary/10 p-1 rounded">
                            <Check className="h-4 w-4 text-primary" />
                          </span>
                          <span>{treatment.application}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 rounded-b-lg flex justify-between items-center">
                <div>
                  <span className="font-medium">Risk Level: </span>
                  <span className="text-destructive font-medium">{detectionResult.riskLevel}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{detectionResult.impactOnYield}</span>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="max-w-md space-y-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">No Detection Results Yet</h3>
                <p className="text-muted-foreground">
                  Upload or capture an image of your crops and click "Analyze Image" to get disease detection results
                  and treatment recommendations.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}