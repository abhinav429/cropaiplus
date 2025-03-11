"use client"

import { useState } from "react"

export default function PaymentGateway() {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("creditCard");

  const handlePayment = (e) => {
    e.preventDefault();
    // Simulate payment processing
    alert(`Payment processed successfully using ${paymentMethod}!`);
  };

  const handlePaymentMethodChange = (e) => {
    const selectedMethod = e.target.value;
    setPaymentMethod(selectedMethod);
  };

  return (
    <div className="container mx-auto py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-primary">Payment Gateway</h1>
      <form onSubmit={handlePayment} className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">Payment Method:</label>
          <select 
            value={paymentMethod} 
            onChange={handlePaymentMethodChange}
            className="border rounded w-full py-2 px-3" 
            required
          >
            <option value="creditCard">Credit Card</option>
            <option value="debitCard">Debit Card</option>
            <option value="upi">UPI</option>
            <option value="payOnDelivery">Pay on Delivery</option>
          </select>
        </div>
        {(paymentMethod === "creditCard" || paymentMethod === "debitCard") && (
          <>
            <div>
              <label className="block mb-2">Card Number:</label>
              <input 
                type="text" 
                value={cardNumber} 
                onChange={(e) => setCardNumber(e.target.value)} 
                className="border rounded w-full py-2 px-3" 
                required 
              />
            </div>
            <div>
              <label className="block mb-2">Expiry Date:</label>
              <input 
                type="text" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)} 
                className="border rounded w-full py-2 px-3" 
                placeholder="MM/YY" 
                required 
              />
            </div>
            <div>
              <label className="block mb-2">CVV:</label>
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
        <button type="submit" className="mt-6 w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition">
          Confirm Payment
        </button>
      </form>
      {paymentMethod === "upi" && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">Scan QR Code to Pay:</h2>
          <img src="\images\paymentupi.jpg" alt="QR Code" className="mt-4" style={{ width: '300px', height: 'auto' }} />
        </div>
      )}
      {paymentMethod === "payOnDelivery" && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">You have selected Pay on Delivery.</h2>
        </div>
      )}
    </div>
  )
}
