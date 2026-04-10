'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { FiMail, FiLock, FiHome } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import { updateProfile } from 'firebase/auth';
import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SignUp() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const [name, setName] = useState('');
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check if the user already exists
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Use the signup function from context
      await signup(email, password);
      // Update the user's display name
      await updateProfile(userCredential.user, { displayName: name });
      setIsModalOpen(true);
    } catch (error) {
      // Check if the error is due to email already in use
      if (error.code === 'auth/email-already-in-use') {
        // Log the user in instead
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Optionally, you can update the profile here if needed
        setIsModalOpen(true);
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-gradient-to-r from-emerald-100 to-teal-50">
      <motion.div 
        className="absolute inset-0 z-0"
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
        <div className="absolute top-4 right-4"> {/* Changed from left-4 to right-4 */}
          <Link href="/">
            <Button variant="outline" className="bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-600 transition-all duration-300">
              <FiHome className="mr-2 h-4 w-4" />
              {t('auth.home')}
            </Button>
          </Link>
        </div>
      <div className="flex flex-col items-center justify-center mb-8 relative z-10">
        <Leaf className="h-12 w-12 text-emerald-600 mb-2" />
        <span className="text-4xl font-bold text-center text-emerald-800">CropAI</span>
      </div>
      <div className="w-full max-w-md p-8 space-y-6 rounded-xl bg-white shadow-2xl relative z-10">
        <h2 className="text-2xl font-bold text-center text-emerald-800 mb-6">{t('auth.signupTitle')}</h2>
        {error && <p className="text-red-500 text-center bg-red-100 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-emerald-700 flex items-center">
              <FiMail className="mr-2" /> {t('auth.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-200"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-emerald-700 flex items-center">
              <User className="mr-2" /> {t('auth.nameLabel')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-200"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-emerald-700 flex items-center">
              <FiLock className="mr-2" /> {t('auth.password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-200"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg transition duration-200 transform hover:scale-105" disabled={isLoading}>
            {isLoading ? t('auth.creatingAccount') : t('auth.submitSignup')}
          </Button>
        </form>
        <div className="text-sm text-center">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-emerald-600 hover:underline font-medium">
            {t('auth.loginLink')}
          </Link>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleModalClose}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-emerald-800 mb-4">{t('auth.signupSuccess')}</h2>
          <p className="mb-6">{t('auth.signupWelcome')}</p>
          <Button onClick={handleModalClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {t('auth.goDashboard')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
