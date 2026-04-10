"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ShoppingCart, Filter, Search, Star, ArrowUpDown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { useCart } from "./CartContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCategoryLabel } from "@/lib/marketplaceCats"

// Sample product data
const sampleProducts = [
  {
    id: 1,
    name: "Organic Fungicide Spray",
    category: "Pesticides",
    image: "/images/fungicide.jpg",
    price: 24.99,
    rating: 4.7,
    reviewCount: 128,
    description: "An organic copper-based fungicide for controlling late blight and other fungal diseases.",
    tags: ["Organic", "OMRI Listed"],
    stock: 15,
    isRecommended: true,
  },
  {
    id: 2,
    name: "Bio-Advanced Soil Test Kit",
    category: "Soil Management",
    image: "/images/soiltest.jpg",
    price: 39.99,
    originalPrice: 49.99,
    rating: 4.9,
    reviewCount: 87,
    description: "Professional-grade soil testing kit with digital pH meter and nutrient analysis.",
    tags: ["Digital", "Easy-to-use"],
    stock: 8,
    isRecommended: true,
  },
  {
    id: 3,
    name: "Smart Irrigation Controller",
    category: "Irrigation",
    image: "/images/smartirrigation.jpg",
    price: 129.99,
    rating: 4.5,
    reviewCount: 214,
    description: "WiFi-enabled irrigation controller that adjusts watering based on local weather conditions.",
    tags: ["Smart Home", "Water-saving"],
    stock: 5,
    isRecommended: false,
  },
  {
    id: 4,
    name: "Balanced NPK Fertilizer 10-10-10",
    category: "Fertilizers",
    image: "/images/balancednpk.jpg",
    price: 19.99,
    rating: 4.3,
    reviewCount: 156,
    description: "All-purpose granular fertilizer for vegetables and flowers with balanced nutrient content.",
    tags: ["Balanced", "Slow-release"],
    stock: 25,
    isRecommended: false,
  },
  {
    id: 5,
    name: "Beneficial Nematodes - Pest Control",
    category: "Pesticides",
    image: "/images/namatodes.jpg",
    price: 29.99,
    rating: 4.6,
    reviewCount: 72,
    description: "Live beneficial nematodes that target soil-dwelling pests like grubs and fungus gnats.",
    tags: ["Organic", "Live Organisms"],
    stock: 7,
    isRecommended: true,
  },
  {
    id: 6,
    name: "Greenhouse Polyethylene Cover",
    category: "Structures",
    image: "/images/greenhouse.jpg",
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.2,
    reviewCount: 55,
    description: "UV-resistant, clear polyethylene greenhouse covering material, 6 mil thickness.",
    tags: ["UV-resistant", "Durable"],
    stock: 13,
    isRecommended: false,
  },
  {
    id: 7,
    name: "Plant Disease Identification Cards",
    category: "Education",
    image: "/images/plantcard.jpg",
    price: 15.99,
    rating: 4.8,
    reviewCount: 34,
    description: "Set of 50 waterproof cards with images and descriptions of common plant diseases.",
    tags: ["Educational", "Waterproof"],
    stock: 21,
    isRecommended: true,
  },
  {
    id: 8,
    name: "Battery-Powered Backpack Sprayer",
    category: "Equipment",
    image: "/images/sprayer.jpg",
    price: 149.99,
    rating: 4.4,
    reviewCount: 91,
    description: "4-gallon battery-powered backpack sprayer with adjustable pressure settings.",
    tags: ["Rechargeable", "Adjustable"],
    stock: 4,
    isRecommended: false,
  },
]

// Product categories
const categories = [
  "All Categories",
  "Pesticides",
  "Fertilizers",
  "Soil Management",
  "Irrigation",
  "Equipment",
  "Structures",
  "Education",
]

const SORT_KEYS = {
  featured: "sortFeatured",
  "price-asc": "sortPriceAsc",
  "price-desc": "sortPriceDesc",
  rating: "sortRating",
  newest: "sortNewest",
}

export default function MarketplacePage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState(sampleProducts)
  const [filteredProducts, setFilteredProducts] = useState(sampleProducts)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [priceRange, setPriceRange] = useState([0, 150])
  const [sortOption, setSortOption] = useState("featured")
  const [showRecommended, setShowRecommended] = useState(false)
  const { toast } = useToast()
  const { addToCart } = useCart()

  // Handle product filtering
  useEffect(() => {
    let result = [...products]

    // Filter by search
    if (searchQuery) {
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by category
    if (selectedCategory !== "All Categories") {
      result = result.filter((product) => product.category === selectedCategory)
    }

    // Filter by price
    result = result.filter((product) => product.price >= priceRange[0] && product.price <= priceRange[1])

    // Filter by recommendation
    if (showRecommended) {
      result = result.filter((product) => product.isRecommended)
    }

    // Apply sorting
    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        result.sort((a, b) => b.price - a.price)
        break
      case "rating":
        result.sort((a, b) => b.rating - a.rating)
        break
      case "newest":
        // In a real app, this would sort by date added
        result.sort((a, b) => b.id - a.id)
        break
      default:
        // 'featured' is default
        result.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0))
    }

    setFilteredProducts(result)
  }, [products, searchQuery, selectedCategory, priceRange, sortOption, showRecommended])

  return (
    <div className="container py-10 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 text-center mb-10"
      >
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">{t("marketplace.title")}</h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          {t("marketplace.subtitle")}
        </p>
      </motion.div>

      {/* Filter Section */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("marketplace.searchPlaceholder")}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {t("marketplace.categoryButton")}: {formatCategoryLabel(t, selectedCategory)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>{t("marketplace.categoryMenuTitle")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategory === category}
                  onCheckedChange={() => setSelectedCategory(category)}
                >
                  {formatCategoryLabel(t, category)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {t("marketplace.sortBy")}: {t(`marketplace.${SORT_KEYS[sortOption]}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("marketplace.sortMenuTitle")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortOption === "featured"}
                onCheckedChange={() => setSortOption("featured")}
              >
                {t("marketplace.sortFeatured")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === "price-asc"}
                onCheckedChange={() => setSortOption("price-asc")}
              >
                {t("marketplace.sortPriceAsc")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === "price-desc"}
                onCheckedChange={() => setSortOption("price-desc")}
              >
                {t("marketplace.sortPriceDesc")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === "rating"}
                onCheckedChange={() => setSortOption("rating")}
              >
                {t("marketplace.sortRating")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortOption === "newest"}
                onCheckedChange={() => setSortOption("newest")}
              >
                {t("marketplace.sortNewest")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showRecommended ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowRecommended(!showRecommended)}
          >
            <Zap className="h-4 w-4" />
            {showRecommended ? t("marketplace.allProducts") : t("marketplace.aiRecommendations")}
          </Button>
        </div>

        <div className="py-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm">
              {t("marketplace.priceRange")
                .replace("{min}", String(priceRange[0]))
                .replace("{max}", String(priceRange[1]))}
            </span>
          </div>
          <Slider value={priceRange} min={0} max={150} step={5} onValueChange={setPriceRange} className="w-full" />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full flex flex-col overflow-hidden group">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  {product.originalPrice && (
                    <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">{t("marketplace.sale")}</Badge>
                  )}
                  {product.isRecommended && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">{t("marketplace.aiRecommended")}</Badge>
                  )}
                </div>
                <CardHeader className="p-4 pb-0">
                  <div className="text-sm text-muted-foreground mb-1">{formatCategoryLabel(t, product.category)}</div>
                  <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                  <div className="flex items-center mt-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">({product.reviewCount})</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex-1">
                  <CardDescription className="line-clamp-2 mb-2">{product.description}</CardDescription>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">₹{product.price.toFixed(2)}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {product.stock <= 5 ? (
                        <span className="text-amber-500">
                          {t("marketplace.onlyLeft").replace("{count}", String(product.stock))}
                        </span>
                      ) : (
                        <span>{t("marketplace.inStock")}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => addToCart(product)}>
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{t("marketplace.noProductsTitle")}</h3>
            <p className="text-muted-foreground mt-1">{t("marketplace.noProductsSubtitle")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("All Categories")
                setPriceRange([0, 150])
                setSortOption("featured")
                setShowRecommended(false)
              }}
            >
              {t("marketplace.resetFilters")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

