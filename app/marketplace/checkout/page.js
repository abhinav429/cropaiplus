"use client"

import { useEffect, useState } from "react"

export default function Checkout() {
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      const cartItems = JSON.parse(savedCart);
      const total = cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
      setTotalAmount(total);
    }
  }, []);

  return (
    <div className="container mx-auto py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-primary">Checkout</h1>
      <h2 className="text-xl font-bold text-primary">Total: ₹{totalAmount.toFixed(2)}</h2>
      <form className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">Address:</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">City:</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">State:</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div>
          <label className="block mb-2">Zip Code:</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <div className="mt-4">
          <label className="block mb-2">Contact Details:</label>
          <input type="text" className="border rounded w-full py-2 px-3" required />
        </div>
        <button 
          type="button" 
          onClick={() => window.location.href = '/marketplace/payment'} 
          className="mt-6 w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition"
        >
          Pay Now
        </button>
      </form>
    </div>
  )
} 