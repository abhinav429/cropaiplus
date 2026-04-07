"use client"

import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function PaymentGateway() {
  const { t } = useLanguage()
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("creditCard")

  const methodLabel = () => {
    switch (paymentMethod) {
      case "creditCard":
        return t("payment.creditCard")
      case "debitCard":
        return t("payment.debitCard")
      case "upi":
        return t("payment.upi")
      case "payOnDelivery":
        return t("payment.payOnDelivery")
      default:
        return paymentMethod
    }
  }

  const handlePayment = (e) => {
    e.preventDefault()
    alert(t("payment.successDemo").replace("{method}", methodLabel()))
  }

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value)
  }

  return (
    <div className="container mx-auto py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-primary">{t("payment.title")}</h1>
      <form onSubmit={handlePayment} className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">{t("payment.method")}</label>
          <select
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            className="border rounded w-full py-2 px-3"
            required
          >
            <option value="creditCard">{t("payment.creditCard")}</option>
            <option value="debitCard">{t("payment.debitCard")}</option>
            <option value="upi">{t("payment.upi")}</option>
            <option value="payOnDelivery">{t("payment.payOnDelivery")}</option>
          </select>
        </div>
        {(paymentMethod === "creditCard" || paymentMethod === "debitCard") && (
          <>
            <div>
              <label className="block mb-2">{t("payment.cardNumber")}</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="border rounded w-full py-2 px-3"
                required
              />
            </div>
            <div>
              <label className="block mb-2">{t("payment.expiry")}</label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="border rounded w-full py-2 px-3"
                placeholder={t("payment.expiryPlaceholder")}
                required
              />
            </div>
            <div>
              <label className="block mb-2">{t("payment.cvv")}</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="border rounded w-full py-2 px-3"
                required
              />
            </div>
          </>
        )}
        <button
          type="submit"
          className="mt-6 w-full py-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          {t("payment.confirm")}
        </button>
      </form>
      {paymentMethod === "upi" && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">{t("payment.scanQr")}</h2>
          <img
            src="/images/paymentupi.jpg"
            alt="UPI QR"
            className="mt-4 max-w-[300px] h-auto"
          />
        </div>
      )}
      {paymentMethod === "payOnDelivery" && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">{t("payment.payOnDeliveryMsg")}</h2>
        </div>
      )}
    </div>
  )
}
