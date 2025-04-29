"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CameraIcon, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <CameraIcon className="h-6 w-6" />
          <span className="font-bold text-xl">RacePhotoRunner</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/events" className="text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white">
            Events
          </Link>
          <Link href="/search" className="text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white">
            Search
          </Link>
          <Link href="/about" className="text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white">
            About
          </Link>
          <Button asChild variant="outline">
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container py-4 px-4 flex flex-col space-y-4">
            <Link 
              href="/events" 
              className="py-2 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Events
            </Link>
            <Link 
              href="/search" 
              className="py-2 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Search
            </Link>
            <Link 
              href="/about" 
              className="py-2 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <hr className="my-2" />
            <Button asChild variant="outline" className="w-full">
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
} 