"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { Calendar, ArrowUp, ArrowDown, Clock, AlertTriangle, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltipContent, ChartTooltip } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock data for charts
const yieldData = [
  { month: "Jan", current: 30, previous: 25 },
  { month: "Feb", current: 35, previous: 30 },
  { month: "Mar", current: 45, previous: 35 },
  { month: "Apr", current: 60, previous: 40 },
  { month: "May", current: 75, previous: 55 },
  { month: "Jun", current: 90, previous: 65 },
  { month: "Jul", current: 100, previous: 75 },
  { month: "Aug", current: 110, previous: 85 },
  { month: "Sep", current: 120, previous: 90 },
  { month: "Oct", current: 100, previous: 80 },
  { month: "Nov", current: 80, previous: 65 },
  { month: "Dec", current: 70, previous: 60 },
]

const soilHealthData = [
  { name: "pH Level", value: 6.5, target: [6.0, 7.0] },
  { name: "Nitrogen", value: 65, target: [50, 75] },
  { name: "Phosphorus", value: 45, target: [40, 60] },
  { name: "Potassium", value: 80, target: [70, 90] },
  { name: "Organic Matter", value: 3.8, target: [3.5, 5.0] },
]

const cropDistributionData = [
  { name: "Corn", value: 35 },
  { name: "Soybeans", value: 30 },
  { name: "Wheat", value: 15 },
  { name: "Alfalfa", value: 12 },
  { name: "Other", value: 8 },
]

const pieColors = ["#4ade80", "#fcd34d", "#60a5fa", "#f87171", "#a78bfa"]

// Mock data for scan history
const scanHistoryData = [
  {
    id: 1,
    date: "2023-11-24",
    time: "14:32",
    cropType: "Tomato",
    disease: "Late Blight",
    confidence: 98.7,
    status: "treated",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: 2,
    date: "2023-11-20",
    time: "09:15",
    cropType: "Corn",
    disease: "Northern Corn Leaf Blight",
    confidence: 96.3,
    status: "monitoring",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: 3,
    date: "2023-11-15",
    time: "16:47",
    cropType: "Apple Tree",
    disease: "Apple Scab",
    confidence: 94.9,
    status: "treated",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: 4,
    date: "2023-11-08",
    time: "11:20",
    cropType: "Cucumber",
    disease: "Powdery Mildew",
    confidence: 97.2,
    status: "treated",
    image: "/placeholder.svg?height=60&width=60",
  },
  {
    id: 5,
    date: "2023-10-29",
    time: "14:05",
    cropType: "Wheat",
    disease: "Stripe Rust",
    confidence: 95.6,
    status: "monitoring",
    image: "/placeholder.svg?height=60&width=60",
  },
]

export default function DashboardPage() {
  const [scanHistory, setScanHistory] = useState(scanHistoryData)
  const [filteredHistory, setFilteredHistory] = useState(scanHistory)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Memoize filter function
  const filterHistory = useCallback((filters) => {
    return scanHistory.filter(scan => {
      // Apply filters
      return true // Add your filter logic here
    })
  }, [scanHistory])

  // Update filtered results when filters change
  useEffect(() => {
    setFilteredHistory(filterHistory(/* your filters */))
  }, [filterHistory /* add your filter dependencies */])

  // Filter scan history
  const filteredScanHistory = filteredHistory.filter((scan) => {
    const matchesSearch =
      scan.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scan.disease.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || scan.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="container py-10 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold">Farm Dashboard</h1>
          <p className="text-muted-foreground">Analytics and insights for your farm</p>
        </div>

        <Button className="w-full md:w-auto gap-2">
          <Calendar className="h-4 w-4" />
          Last 12 Months
        </Button>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Crop Yield</CardDescription>
              <CardTitle className="text-3xl">+24%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <ArrowUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Improvement from last year</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Soil Health Index</CardDescription>
              <CardTitle className="text-3xl">82/100</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <ArrowUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">+5 points from last test</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Diseases Prevented</CardDescription>
              <CardTitle className="text-3xl">8</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last 12 months</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cost Reduction</CardDescription>
              <CardTitle className="text-3xl">$5,240</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <ArrowDown className="h-4 w-4 text-green-500" />
                <span className="text-green-500">18% less than projected</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid gap-8 md:grid-cols-2 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Crop Yield Comparison</CardTitle>
              <CardDescription>Current year vs. Previous year (bushels/acre)</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ChartContainer
                config={{
                  current: {
                    label: "Current Year",
                    color: "hsl(var(--chart-1))",
                  },
                  previous: {
                    label: "Previous Year",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yieldData}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-current)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-current)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-previous)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-previous)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke="var(--color-current)"
                      fillOpacity={1}
                      fill="url(#colorCurrent)"
                    />
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke="var(--color-previous)"
                      fillOpacity={1}
                      fill="url(#colorPrevious)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid gap-8 md:grid-rows-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Soil Health Indicators</CardTitle>
              <CardDescription>Current measurements vs. target ranges</CardDescription>
            </CardHeader>
            <CardContent className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soilHealthData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crop Distribution</CardTitle>
              <CardDescription>Percentage of land usage by crop type</CardDescription>
            </CardHeader>
            <CardContent className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cropDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {cropDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Scan History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Disease Detection History</CardTitle>
            <CardDescription>Record of previous crop scans and detected diseases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by crop or disease..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filteredScanHistory.length > 0 ? (
                  filteredScanHistory.map((scan) => (
                    <div key={scan.id} className="flex items-center gap-4 p-4 rounded-lg border">
                      <Avatar className="h-14 w-14 rounded-md">
                        <AvatarImage src={scan.image} alt={scan.cropType} />
                        <AvatarFallback>{scan.cropType.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 grid sm:grid-cols-2 md:grid-cols-3 gap-y-2">
                        <div>
                          <div className="font-medium">{scan.cropType}</div>
                          <div className="text-sm text-muted-foreground">
                            {scan.date} at {scan.time}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{scan.disease}</div>
                          <div className="text-sm text-muted-foreground">{scan.confidence}% confidence</div>
                        </div>
                        <div className="sm:text-right">
                          <div
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              scan.status === "treated" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {scan.status === "treated" ? (
                              <Check className="mr-1 h-3 w-3" />
                            ) : (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {scan.status === "treated" ? "Treated" : "Monitoring"}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">No results found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms or filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button variant="outline" className="w-full">
              View Complete History
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

