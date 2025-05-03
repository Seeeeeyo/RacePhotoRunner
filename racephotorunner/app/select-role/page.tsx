'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Routes } from '@/lib/routes';

export default function SelectRolePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'athlete' | 'photographer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    // Handle loading state however you like
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isSignedIn) {
    // Redirect if not signed in (though they should be after signup)
    router.push('/signin');
    return null; 
  }

  const handleRoleSelection = async () => {
    if (!selectedRole) {
        setError('Please select a role.');
        return;
    }
    if (!user) {
        setError('User not found.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await user.update({
        publicMetadata: {
          role: selectedRole,
        },
      });
      // Redirect to home after successful update
      router.push(Routes.HOME); 
    } catch (err) {
      console.error('Error updating user metadata:', err);
      setError('Failed to save role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-6">
          Select Your Role
        </h1>
        <p className="mb-8 text-lg text-gray-600">Choose whether you are primarily an athlete or a photographer.</p>
        
        <RadioGroup 
            defaultValue={selectedRole ?? undefined}
            onValueChange={(value: 'athlete' | 'photographer') => setSelectedRole(value)}
            className="mb-8 space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="athlete" id="athlete" />
            <Label htmlFor="athlete" className="text-lg cursor-pointer">Athlete</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="photographer" id="photographer" />
            <Label htmlFor="photographer" className="text-lg cursor-pointer">Photographer</Label>
          </div>
        </RadioGroup>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <Button onClick={handleRoleSelection} disabled={isLoading || !selectedRole}>
          {isLoading ? 'Saving...' : 'Confirm Role'}
        </Button>
      </main>
    </div>
  );
} 