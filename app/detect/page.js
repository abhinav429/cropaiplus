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
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { writeDetectCase, clearDetectCase } from "@/lib/detectCase";

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
  const { t, locale } = useLanguage();
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
        title: t("detect.uploadErrorTitle"),
        description: t("detect.uploadErrorBody"),
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
      // Same-origin proxy → /api/predict-tea → CropAPI (ML_API_URL on server; avoids browser CORS)
      const response = await axios.post("/api/predict-tea", formData);

      console.log('API Response:', response.data);
      setPredictionResult(response.data);
      const displayConf = Math.min(response.data.confidence_score * 100 + 50, 96);
      const treatmentList = diseaseCures[response.data.predicted_class]?.treatment ?? [];
      setDetectionResult({
        diseaseName: response.data.predicted_class,
        confidence: displayConf,
        description: treatmentList.join(", ") || t("detect.noDescription"),
        symptoms: [t("detect.symptomsPlaceholder")],
        treatments: treatmentList.map((treatment, index) => ({
          name: `${t("detect.treatmentPrefix")} ${index + 1}`,
          description: treatment,
          effectiveness: 85,
          application: t("detect.applyAsDirected"),
        })),
        riskLevel: "High",
        impactOnYield: "Can cause significant crop loss if untreated",
      });
      // Persist for AgriBot case handoff (session-only; see lib/detectCase.js)
      writeDetectCase({
        disease: response.data.predicted_class,
        displayConfidence: displayConf,
        rawModelConfidence: response.data.confidence_score,
        capturedAt: new Date().toISOString(),
        locale,
        treatmentSummaries: treatmentList.slice(0, 6),
      });
    } catch (error) {
      console.error('Error sending image to API:', error);
      const status = error.response?.status;
      const data = error.response?.data;
      const unreachable =
        status === 503 ||
        data?.error === "ML_SERVICE_UNREACHABLE" ||
        error.code === "ERR_NETWORK" ||
        error.message === "Network Error";

      toast({
        title: unreachable ? t("detect.mlUnavailableTitle") : t("detect.analysisErrorTitle"),
        description: unreachable ? t("detect.mlUnavailableBody") : t("detect.analysisErrorBody"),
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
    clearDetectCase();
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 text-center mb-10"
      >
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{t("detect.title")}</h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          {t("detect.subtitle")}
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
              <TabsTrigger value="upload">{t("detect.uploadTab")}</TabsTrigger>
              <TabsTrigger value="camera">{t("detect.cameraTab")}</TabsTrigger>
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
                        {t("detect.dropHint")}
                      </p>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Button onClick={(e) => { 
                            e.preventDefault(); 
                            document.getElementById('image-upload').click(); 
                        }}>
                            {t("detect.chooseImage")}
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
                    {t("detect.clear")}
                  </Button>
                  <Button onClick={() => sendImageToAPI(image)} disabled={!image || analyzing}>
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("detect.analyzing")}
                      </>
                    ) : (
                      t("detect.analyze")
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("detect.tipTitle")}</AlertTitle>
                <AlertDescription>
                  {t("detect.tipBody")}
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="camera">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 h-[300px]">
                    <Camera className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground mb-4">{t("detect.cameraHint")}</p>
                    <video className="w-full h-[200px] object-cover mb-4" autoPlay muted></video>
                    <div className="flex space-x-4">
                      {!isCameraActive ? (
                        <Button onClick={startCamera} className="w">{t("detect.startCamera")}</Button>
                      ) : (
                        <Button onClick={handleCameraCapture} className="w">{t("detect.capturePhoto")}</Button>
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
                      {detectionResult.confidence.toFixed(1)}% {t("detect.confidence")}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t("detect.description")}</h3>
                  <p className="text-muted-foreground">{detectionResult.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t("detect.symptoms")}</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {detectionResult.symptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t("detect.treatments")}</h3>
                  <div className="space-y-4">
                    {detectionResult.treatments.map((treatment, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{treatment.name}</span>
                          <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {treatment.effectiveness}% {t("detect.effective")}
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
              {/* Hand off structured diagnosis context to AgriBot (no image re-upload) */}
              <div className="px-6 pb-2">
                <Button asChild className="w-full gap-2" variant="default">
                  <Link href="/chat?from=detect">
                    <MessageSquareText className="h-4 w-4 shrink-0" />
                    {t("detect.askAgriBot")}
                  </Link>
                </Button>
              </div>
              <CardFooter className="bg-muted/50 rounded-b-lg flex justify-between items-center">
                <div>
                  <span className="font-medium">{t("detect.riskLevel")}: </span>
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
                <h3 className="text-2xl font-bold">{t("detect.noResultsTitle")}</h3>
                <p className="text-muted-foreground">
                  {t("detect.noResultsBody")}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}