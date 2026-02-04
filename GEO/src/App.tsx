import { useState } from "react";
import AuthPage from "./pages/AuthPage";
import BusinessFormPage from "./pages/BusinessFormPage";
import ConnectGooglePage from "./pages/ConnectGooglePage";
import GeoDashboardPage from "./pages/GeoDashboardPage";
import type { BusinessDetails } from "./types";
import { removeAuthToken } from "./utils/auth";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [hasCompletedGoogleStep, setHasCompletedGoogleStep] = useState(false);

  const handleLogout = () => {
    // Clear JWT token from localStorage
    removeAuthToken();
    
    // Reset application state
    setIsAuthed(false);
    setBusinessDetails(null);
    setIsEditingBusiness(false);
    setIsGoogleConnected(false);
    setHasCompletedGoogleStep(false);
  };

  const handleBusinessSubmit = (details: BusinessDetails) => {
    setBusinessDetails(details);
    setIsEditingBusiness(false);
  };

  const handleGoogleConnection = (connected: boolean, details?: BusinessDetails) => {
    setIsGoogleConnected(connected);
    if (connected) {
      setHasCompletedGoogleStep(true);
    }
    if (details) {
      const shouldForceBusinessReview = !businessDetails;
      setBusinessDetails(details);
      if (shouldForceBusinessReview) {
        setIsEditingBusiness(true);
      }
    }
  };

  const completeGoogleStep = () => {
    setHasCompletedGoogleStep(true);
  };

  if (!isAuthed) {
    return <AuthPage onAuthenticated={() => setIsAuthed(true)} />;
  }

  if (!hasCompletedGoogleStep) {
    return (
      <ConnectGooglePage
        onConnect={(details) => handleGoogleConnection(true, details)}
        onSkip={completeGoogleStep}
        onLogout={handleLogout}
      />
    );
  }

  if (!businessDetails || isEditingBusiness) {
    return (
      <BusinessFormPage
        initialValues={businessDetails}
        onSubmit={handleBusinessSubmit}
        onLogout={handleLogout}
      />
    );
  }

  return (
      <GeoDashboardPage
        onLogout={handleLogout}
        onBackToSetup={() => setIsEditingBusiness(true)}
      />
  );
}
