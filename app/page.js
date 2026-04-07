"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Leaf, Database, Smartphone, Award, Target, BarChart, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import LeafCursor from "@/components/LeafCursor"
import { useLanguage } from "@/contexts/LanguageContext"

const HOME_FEATURE_ICONS = [Leaf, Sparkles, Database, Smartphone, Target, BarChart, Shield]

// Animated background component
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated leaf pattern */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
          backgroundSize: ['100% 100%', '200% 200%'],
        }}
        transition={{
          repeat: Infinity,
          repeatType: 'reverse',
          duration: 20,
        }}
        style={{
          backgroundImage: 'url("/images/leaf-pattern.jpg")',
          opacity: 0.1,
        }}
      />
      <LeafCursor />
    </div>
  )
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const features = useMemo(() => {
    const raw = t("home.features")
    if (!Array.isArray(raw)) return []
    return raw.map((item, index) => {
      const Icon = HOME_FEATURE_ICONS[index] || Leaf
      return {
        icon: <Icon className="h-10 w-10 text-primary" />,
        title: item.title,
        description: item.description,
      }
    })
  }, [t])

  const testimonials = useMemo(() => {
    const raw = t("home.testimonials")
    if (!Array.isArray(raw)) return []
    return raw.map((item) => ({
      ...item,
      image: "/placeholder.svg?height=80&width=80",
    }))
  }, [t])

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <AnimatedBackground />
        
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4 relative z-10"
            >
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                {t("home.badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                <span className="text-primary">{t("home.titleHighlight")}</span>{" "}
                {t("home.titleRest")}
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                {t("home.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/detect">
                  <Button size="lg" className="gap-2">
                    {t("home.tryNow")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline">
                    {t("home.learnMore")}
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative lg:ml-auto w-full"
            >
              <div className="relative h-[350px] w-full sm:h-[450px] md:h-[400x]">
                <Image
                  src="/images/crop-field.jpg"
                  alt={t("home.heroImageAlt")}
                  fill
                  className="object-cover rounded-xl"
                  priority
                />
              </div>
              
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center space-y-4 mb-12"
          >
            <motion.h2 variants={fadeIn} className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("home.featuresHeading")}
            </motion.h2>
            <motion.p variants={fadeIn} className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              {t("home.featuresSub")}
            </motion.p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card rounded-xl p-6 shadow-sm"
              >
                <div className="mb-4 rounded-full bg-primary/10 p-3 w-fit">{feature.icon}</div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center space-y-4 mb-12"
          >
            <motion.h2 variants={fadeIn} className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("home.testimonialsHeading")}
            </motion.h2>
            <motion.p variants={fadeIn} className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              {t("home.testimonialsSub")}
            </motion.p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-background rounded-xl p-6 shadow-sm border"
              >
                <div className="flex items-center gap-4 mb-4">
                  <Image
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="font-bold">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <p className="italic text-muted-foreground">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card rounded-xl p-8 md:p-12 shadow-lg relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                {t("home.ctaTitle")}
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl mb-8">
                {t("home.ctaSub")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/detect">
                  <Button size="lg" className="gap-2">
                    {t("home.tryNow")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline">
                    {t("home.learnMore")}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

