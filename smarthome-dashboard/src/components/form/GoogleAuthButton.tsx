'use client';

import { useSession, signOut } from 'next-auth/react';
import { StyledButton } from '@/components/form/styledButton';
import { GoogleIcon } from '@/lib/icons';
import { useState, useEffect } from 'react';

export default function GoogleAuthButton() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'nextauth:success') {
        window.location.reload();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleSignIn = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      '/signin',
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
    
    setIsPopupOpen(true);
    
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        setIsPopupOpen(false);
        window.location.reload();
      }
    }, 500);
  };

  if (isLoading) {
    return <StyledButton placeholder="Loading..." disabled />;
  }

  if (session?.user) {
    const userName = session.user.name || session.user.email?.split('@')[0] || 'Google';
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span>Signed in as {userName}</span>
        <StyledButton placeholder="Sign Out" onPress={() => signOut()} />
      </div>
    );
  }

  return (
    <StyledButton 
      placeholder={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GoogleIcon />
          {isPopupOpen ? 'Opening popup...' : 'Sign in with Google'}
        </div>
      }
      onPress={handleGoogleSignIn}
      disabled={isPopupOpen}
    />
  );
}