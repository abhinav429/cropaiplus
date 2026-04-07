"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function Checkout() {
  const { t } = useLanguage()
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    const savedCart = localStorage.getItem("cartItems")
    if (savedCart) {
      const cartItems = JSON.parse(savedCart)
      const total = cartItems.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0)
      setTotalAmount(total)
    }
  }, [])

  return (
    <div className="container mx-auto py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-primary">{t("checkout.title")}</h1>
      <h2 className="text-xl font-bold text-primary">
        {t("checkout.total")}: ₹{totalAmount.toFixed(2)}
      </h2>
      <form className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">{t("checkout.address")}</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">{t("checkout.city")}</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">{t("checkout.state")}</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">{t("checkout.zip")}</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div className="mt-4">
          <label className="block mb-2">{t("checkout.contact")}</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <button
          type="button"
          onClick={() => (window.location.href = "/marketplace/payment")}
          className="mt-6 w-full py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          {t("checkout.payNow")}
        </button>
      </form>
    </div>
  )
}
