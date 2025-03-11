"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"

export default function Cart() {
  const [cartItems, setCartItems] = useState([]) // State to hold cart items

  useEffect(() => {
    // Load cart items from local storage when the component mounts
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const handleRemoveItem = (id) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    // Update local storage after removing an item
    localStorage.setItem("cartItems", JSON.stringify(updatedCart));
  }

  return (
    <div className="container mx-auto py-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-primary">Shopping Cart</h1>
      {cartItems.length === 0 ? (
        <p className="text-lg text-muted-foreground">Your cart is empty.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {cartItems.map(item => (
            <li key={item.id} className="flex justify-between items-center py-4">
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col flex-1">
                  <span className="text-lg font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">x {item.quantity || 1}</span>
                </div>
                <span className="text-lg font-semibold text-primary text-right">₹{(item.price * (item.quantity || 1)).toFixed(2)}</span>
              </div>
              <Button variant="outline" onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:bg-red-100 ml-4">
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-primary">Total: ₹{cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0).toFixed(2)}</h2>
      </div>
      <Button 
        variant="primary" 
        className="mt-6 w-full py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105 bg-gradient-to-r from-primary to-secondary text-white font-semibold"
        onClick={() => window.location.href = '/marketplace/checkout'}
      >
        Checkout
      </Button>
    </div>
  )
} 