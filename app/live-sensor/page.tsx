"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Thermometer, Droplets, Wind, Sun, Sprout, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface SensorData {
  temperature: number;
  humidity: number;
  gas: number;
  light: number;
  soil: number;
  timestamp: string;
}

export default function LiveSensorPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch("/sensor");
        if (!response.ok) {
          if (response.status === 404) {
             setError(t("liveSensor.waiting"));
          } else {
             throw new Error("Failed to fetch sensor data");
          }
          return;
        }
        
        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
        
        // Format timestamp
        if (jsonData.timestamp) {
          const date = new Date(jsonData.timestamp);
          setLastUpdated(date.toLocaleTimeString());
        }
      } catch (err: any) {
        console.error(err);
        setError(t("liveSensor.connectError"));
      }
    };

    // Initial fetch
    fetchSensorData();

    // Poll every 2 seconds
    const intervalId = setInterval(fetchSensorData, 2000);

    return () => clearInterval(intervalId);
  }, [t]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12 font-sans overflow-hidden relative">
      
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Sprout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-emerald-600 dark:text-emerald-400 font-medium text-sm uppercase tracking-wider">{t("liveSensor.badge")}</h2>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{t("liveSensor.title")}</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg mt-1">{t("liveSensor.subtitle")}</p>
            </motion.div>
          </div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {lastUpdated && !error && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("liveSensor.updated")}: {lastUpdated}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-xl border border-orange-200 dark:border-orange-800/30"
          >
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {!data && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-zinc-500 font-medium">{t("liveSensor.connecting")}</p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <SensorCard
            title={t("liveSensor.temperature")}
            value={data?.temperature ? `${data.temperature.toFixed(1)}°C` : '--'}
            icon={<Thermometer className="h-6 w-6 text-orange-500" />}
            color="border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10"
            delay={0.1}
          />

          <SensorCard
            title={t("liveSensor.humidity")}
            value={data?.humidity ? `${data.humidity.toFixed(1)}%` : '--'}
            icon={<Droplets className="h-6 w-6 text-blue-500" />}
            color="border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10"
            delay={0.2}
          />

          <SensorCard
            title={t("liveSensor.soil")}
            value={data?.soil !== undefined ? data.soil.toString() : '--'}
            icon={<Sprout className="h-6 w-6 text-emerald-500" />}
            color="border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10"
            subtitle={t("liveSensor.soilSubtitle")}
            delay={0.3}
          />

          <SensorCard
            title={t("liveSensor.light")}
            value={data?.light !== undefined ? (data.light === 1 ? t("liveSensor.lightLow") : t("liveSensor.lightHigh")) : '--'}
            icon={<Sun className="h-6 w-6 text-yellow-500" />}
            color="border-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 dark:from-yellow-950/20 dark:to-yellow-900/10"
            subtitle={t("liveSensor.lightSubtitle")}
            delay={0.4}
          />

          <SensorCard
            title={t("liveSensor.gas")}
            value={data?.gas !== undefined ? (data.gas === 1 ? t("liveSensor.gasClear") : t("liveSensor.gasDetected")) : '--'}
            icon={<Wind className="h-6 w-6 text-purple-500" />}
            color="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10"
            subtitle={t("liveSensor.gasSubtitle")}
            delay={0.5}
          />

        </div>
      </div>
    </div>
  );
}

function SensorCard({ title, value, icon, color, subtitle, delay }: { title: string; value: string; icon: React.ReactNode; color: string; subtitle?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className={`overflow-hidden border ${color} hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl h-full flex flex-col`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white/50 dark:bg-black/10 border-b border-black/5 dark:border-white/5">
          <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className="p-2.5 bg-white dark:bg-zinc-800 shadow-sm rounded-xl">
            {icon}
          </div>
        </CardHeader>
        <CardContent className="pt-6 flex-grow flex flex-col justify-center">
          <motion.div 
            key={value} // This causes the number to lightly animate when it changes
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl sm:text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 mb-2"
          >
            {value}
          </motion.div>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
